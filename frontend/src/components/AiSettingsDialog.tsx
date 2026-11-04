import React, { useEffect, useState } from 'react';
import { AI_PRESETS, detectPreset, testAiConnection, type AiPreset } from '../core/ai';
import type { AiFormat, AiPublicConfig } from '../pet/petAPI';

interface Props {
  onClose: (config: AiPublicConfig | null) => void;
}

/** AI 设置：选择服务商（接口格式）、Base URL、模型和 API key。 */
const AiSettingsDialog: React.FC<Props> = ({ onClose }) => {
  const [loaded, setLoaded] = useState<AiPublicConfig | null>(null);
  const [presetId, setPresetId] = useState('deepseek');
  const [format, setFormat] = useState<AiFormat>('openai');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const preset: AiPreset = AI_PRESETS.find((p) => p.id === presetId) ?? AI_PRESETS[0];

  useEffect(() => {
    window.aiAPI?.getConfig().then((config) => {
      setLoaded(config);
      if (config.model || config.hasKey) {
        setPresetId(detectPreset(config.format, config.baseURL).id);
        setFormat(config.format);
        setBaseURL(config.baseURL);
        setModel(config.model);
      } else {
        applyPreset(AI_PRESETS[0]);
      }
    });
  }, []);

  function applyPreset(p: AiPreset) {
    setPresetId(p.id);
    setFormat(p.format);
    setBaseURL(p.baseURL);
    setModel(p.model);
    setStatus(null);
  }

  const save = async (): Promise<AiPublicConfig | null> => {
    if (!window.aiAPI) return null;
    if (!model.trim()) {
      setStatus({ kind: 'error', text: '请填写模型名称' });
      return null;
    }
    if (!apiKey.trim() && !loaded?.hasKey) {
      setStatus({ kind: 'error', text: '请填写 API key' });
      return null;
    }
    const result = await window.aiAPI.setConfig({
      format,
      baseURL,
      model,
      // 留空表示沿用已保存的 key
      apiKey: apiKey.trim() ? apiKey.trim() : undefined,
    });
    if (!result.ok) {
      setStatus({ kind: 'error', text: result.error });
      return null;
    }
    setLoaded(result.config);
    setApiKey('');
    return result.config;
  };

  const saveAndTest = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const config = await save();
      if (!config) return;
      const reply = await testAiConnection();
      setStatus({ kind: 'ok', text: `已保存，连接正常（模型回复：${reply.slice(0, 40)}）` });
    } catch (error) {
      setStatus({ kind: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  };

  const saveAndClose = async () => {
    setBusy(true);
    try {
      const config = await save();
      if (config) onClose(config);
    } finally {
      setBusy(false);
    }
  };

  const removeKey = async () => {
    if (!window.aiAPI) return;
    const result = await window.aiAPI.setConfig({ format, baseURL, model, apiKey: '' });
    if (result.ok) {
      setLoaded(result.config);
      setStatus({ kind: 'ok', text: '已删除保存的 API key' });
    }
  };

  const label: React.CSSProperties = { display: 'block', fontSize: 13, color: '#374151', margin: '12px 0 4px' };
  const input: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: 6,
    fontSize: 14,
  };
  const btn: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 6,
    border: '1px solid #e5e7eb',
    background: 'white',
    cursor: busy ? 'wait' : 'pointer',
    fontSize: 14,
  };

  if (!window.aiAPI) {
    return (
      <div style={overlay}>
        <div style={card}>
          <h3 style={{ marginTop: 0 }}>AI 设置</h3>
          <p style={{ color: '#6b7280' }}>AI 助手只在桌面版里可用（API key 保存在本机并加密）。</p>
          <button style={btn} onClick={() => onClose(null)}>关闭</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlay}>
      <div role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" style={card}>
        <h3 id="ai-settings-title" style={{ margin: 0, fontSize: 18 }}>🤖 AI 设置</h3>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
          支持 OpenAI 兼容格式（OpenAI、DeepSeek 等）和 Claude 格式。API key 加密保存在本机，只用于向你选择的服务发请求。
        </p>

        <span style={label}>服务商</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {AI_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p)}
              style={{
                ...btn,
                padding: '6px 12px',
                background: p.id === presetId ? '#0284c7' : 'white',
                color: p.id === presetId ? 'white' : '#374151',
                borderColor: p.id === presetId ? '#0284c7' : '#e5e7eb',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label style={label}>
          接口格式
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as AiFormat)}
            style={{ ...input, marginTop: 4 }}
          >
            <option value="openai">OpenAI 兼容（Chat Completions）</option>
            <option value="anthropic">Claude（Messages API）</option>
          </select>
        </label>

        <label style={label}>
          Base URL
          <input
            value={baseURL}
            onChange={(e) => setBaseURL(e.target.value)}
            placeholder={format === 'anthropic' ? '留空使用官方地址 https://api.anthropic.com' : 'https://…'}
            style={{ ...input, marginTop: 4 }}
          />
        </label>

        <label style={label}>
          模型
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={preset.modelPlaceholder}
            style={{ ...input, marginTop: 4 }}
          />
        </label>

        <label style={label}>
          API key
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={loaded?.hasKey ? '已保存（留空则不修改）' : '粘贴 API key'}
            autoComplete="off"
            style={{ ...input, marginTop: 4 }}
          />
        </label>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{preset.keyHint}</div>
        {loaded && !loaded.encryptionAvailable && (
          <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
            当前系统不支持加密存储，无法保存 API key。
          </div>
        )}

        {status && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 10px',
              borderRadius: 6,
              fontSize: 13,
              background: status.kind === 'ok' ? '#ecfdf5' : '#fef2f2',
              color: status.kind === 'ok' ? '#065f46' : '#b91c1c',
              wordBreak: 'break-all',
            }}
          >
            {status.text}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, flexWrap: 'wrap' }}>
          {loaded?.hasKey && (
            <button style={{ ...btn, color: '#b91c1c', marginRight: 'auto' }} onClick={removeKey} disabled={busy}>
              删除 key
            </button>
          )}
          <button style={btn} onClick={() => onClose(loaded)} disabled={busy}>
            取消
          </button>
          <button style={btn} onClick={saveAndTest} disabled={busy}>
            {busy ? '请稍候…' : '保存并测试'}
          </button>
          <button
            style={{ ...btn, background: '#0284c7', color: 'white', border: 'none' }}
            onClick={saveAndClose}
            disabled={busy}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(17, 24, 39, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2100,
  padding: 16,
};

const card: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: '20px 24px',
  width: '100%',
  maxWidth: 460,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
};

export default AiSettingsDialog;
