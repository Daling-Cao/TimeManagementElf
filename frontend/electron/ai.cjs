// AI 助手（主进程）：保存接口配置、加密保存 API key，并用官方 SDK 调用模型。
// API key 只在主进程里使用，页面拿不到明文。
//
// 支持两种接口格式：
// - 'openai'：OpenAI Chat Completions 格式（OpenAI、DeepSeek 以及其他兼容服务，填 baseURL 即可）
// - 'anthropic'：Claude Messages API
const fs = require('node:fs');
const path = require('node:path');
const { safeStorage } = require('electron');
const AnthropicModule = require('@anthropic-ai/sdk');
const OpenAIModule = require('openai');
const log = require('./logger.cjs');

const Anthropic = AnthropicModule.default || AnthropicModule;
const OpenAI = OpenAIModule.default || OpenAIModule;

const ANTHROPIC_DEFAULT_BASE_URL = 'https://api.anthropic.com';
// 这些 Claude 模型支持服务端 fallbacks：被安全分类器拒绝时由服务端换模型重试。
const FALLBACK_MODELS = new Set([
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
]);
const REQUEST_TIMEOUT_MS = 90_000;

let configFile = '';

function init(app) {
  configFile = path.join(app.getPath('userData'), 'ai-config.json');
}

function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeConfig(config) {
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
}

function decryptKey(config) {
  if (!config.encryptedKey) return '';
  try {
    return safeStorage.decryptString(Buffer.from(config.encryptedKey, 'base64'));
  } catch (error) {
    log.error('ai', 'Could not decrypt API key', error);
    return '';
  }
}

/** 给页面看的配置：不含 key，只告诉它有没有 key。 */
function getPublicConfig() {
  const config = readConfig();
  const hasKey = !!config.encryptedKey;
  return {
    format: config.format === 'anthropic' ? 'anthropic' : 'openai',
    baseURL: config.baseURL || '',
    model: config.model || '',
    hasKey,
    configured: hasKey && !!config.model,
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  };
}

/**
 * 保存配置。apiKey: undefined = 保持原来的 key；'' = 删除 key；其他字符串 = 新 key。
 */
function setConfig(input) {
  const current = readConfig();
  const next = {
    format: input && input.format === 'anthropic' ? 'anthropic' : 'openai',
    baseURL: String((input && input.baseURL) || '').trim(),
    model: String((input && input.model) || '').trim(),
    encryptedKey: current.encryptedKey || '',
  };

  if (input && typeof input.apiKey === 'string') {
    const key = input.apiKey.trim();
    if (!key) {
      next.encryptedKey = '';
    } else {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('系统不支持加密存储，无法安全保存 API key');
      }
      next.encryptedKey = safeStorage.encryptString(key).toString('base64');
    }
  }

  writeConfig(next);
  log.info('ai', 'AI config saved', {
    format: next.format,
    baseURL: next.baseURL,
    model: next.model,
    hasKey: !!next.encryptedKey,
  });
  return getPublicConfig();
}

function friendlyError(error) {
  const known = [
    [Anthropic.AuthenticationError, OpenAI.AuthenticationError, 'API key 无效或已过期，请在 AI 设置里检查。'],
    [Anthropic.PermissionDeniedError, OpenAI.PermissionDeniedError, '这个 API key 没有使用该模型的权限。'],
    [Anthropic.NotFoundError, OpenAI.NotFoundError, '找不到这个模型或接口地址，请检查模型名称和 Base URL。'],
    [Anthropic.RateLimitError, OpenAI.RateLimitError, '请求太频繁或额度不足，请稍后再试。'],
    [Anthropic.APIConnectionTimeoutError, OpenAI.APIConnectionTimeoutError, '请求超时，请检查网络后重试。'],
    [Anthropic.APIConnectionError, OpenAI.APIConnectionError, '连接不上 AI 服务，请检查网络和 Base URL。'],
    [Anthropic.BadRequestError, OpenAI.BadRequestError, null],
  ];
  for (const [a, o, message] of known) {
    if ((a && error instanceof a) || (o && error instanceof o)) {
      return message || `请求参数有误：${error.message}`;
    }
  }
  if (error instanceof Anthropic.APIError || error instanceof OpenAI.APIError) {
    return `AI 服务出错（${error.status ?? '未知状态'}）：${error.message}`;
  }
  return error && error.message ? error.message : String(error);
}

async function completeWithAnthropic(config, apiKey, request) {
  const baseURL = config.baseURL || ANTHROPIC_DEFAULT_BASE_URL;
  const client = new Anthropic({ apiKey, baseURL, timeout: REQUEST_TIMEOUT_MS, maxRetries: 1 });
  const isOfficial = baseURL.replace(/\/+$/, '') === ANTHROPIC_DEFAULT_BASE_URL;
  // 服务端 fallbacks 只有官方接口支持；走代理/中转时不加，免得被拒。
  const useFallbacks = isOfficial && FALLBACK_MODELS.has(config.model);

  const params = {
    model: config.model,
    max_tokens: 16000,
    system: request.system,
    messages: [{ role: 'user', content: request.user }],
    output_config: {
      effort: 'medium',
      ...(request.jsonSchema ? { format: { type: 'json_schema', schema: request.jsonSchema } } : {}),
    },
  };

  const response = useFallbacks
    ? await client.beta.messages.create({
        ...params,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      })
    : await client.messages.create(params);

  if (response.stop_reason === 'refusal') {
    throw new Error('模型拒绝了这个请求，请换个说法再试。');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('回复太长被截断了，请把需求说得简短一些。');
  }
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function completeWithOpenAI(config, apiKey, request) {
  const client = new OpenAI({
    apiKey,
    baseURL: config.baseURL || undefined,
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
  const messages = [
    { role: 'system', content: request.system },
    { role: 'user', content: request.user },
  ];
  // json_object 兼容面最广（OpenAI、DeepSeek 都支持），具体结构靠提示词约束、页面再校验。
  const create = (withJsonMode) =>
    client.chat.completions.create({
      model: config.model,
      messages,
      ...(withJsonMode ? { response_format: { type: 'json_object' } } : {}),
    });

  let completion;
  try {
    completion = await create(!!request.jsonSchema);
  } catch (error) {
    // 有些兼容服务不支持 response_format，去掉后重试一次。
    if (request.jsonSchema && error instanceof OpenAI.BadRequestError) {
      log.warn('ai', 'Retrying without response_format', { message: error.message });
      completion = await create(false);
    } else {
      throw error;
    }
  }

  const choice = completion.choices && completion.choices[0];
  if (!choice) throw new Error('AI 没有返回内容。');
  if (choice.finish_reason === 'length') {
    throw new Error('回复太长被截断了，请把需求说得简短一些。');
  }
  if (choice.finish_reason === 'content_filter') {
    throw new Error('模型拒绝了这个请求，请换个说法再试。');
  }
  return choice.message?.content || '';
}

/**
 * 发一次请求。request: { system, user, jsonSchema? }
 * 返回 { ok: true, text } 或 { ok: false, error }（错误信息给用户看，不在 IPC 里抛异常）。
 */
async function complete(request) {
  const config = readConfig();
  const apiKey = decryptKey(config);
  if (!apiKey || !config.model) {
    return { ok: false, error: '还没有配置 AI，请先在 AI 设置里填写 API key 和模型。' };
  }
  const startedAt = Date.now();
  try {
    const text =
      config.format === 'anthropic'
        ? await completeWithAnthropic(config, apiKey, request)
        : await completeWithOpenAI(config, apiKey, request);
    log.info('ai', 'Completion finished', {
      format: config.format,
      model: config.model,
      ms: Date.now() - startedAt,
      chars: text.length,
    });
    return { ok: true, text };
  } catch (error) {
    log.error('ai', 'Completion failed', {
      format: config.format,
      model: config.model,
      name: error && error.name,
      status: error && error.status,
      message: error && error.message,
    });
    return { ok: false, error: friendlyError(error) };
  }
}

module.exports = { init, getPublicConfig, setConfig, complete };
