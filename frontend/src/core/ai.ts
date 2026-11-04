// AI 规划助手（页面侧）：服务商预设、提示词和结果解析。
// 真正的请求由主进程发出（electron/ai.cjs），API key 不会进入页面。

import type { AiFormat } from '../pet/petAPI';
import type { PlanTask } from './dailyPlan';

export interface AiPreset {
  id: string;
  label: string;
  format: AiFormat;
  baseURL: string;
  model: string;
  modelPlaceholder: string;
  keyHint: string;
}

export const AI_PRESETS: AiPreset[] = [
  {
    id: 'deepseek',
    label: 'DeepSeek',
    format: 'openai',
    baseURL: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    modelPlaceholder: 'deepseek-chat',
    keyHint: '在 platform.deepseek.com 创建 API key',
  },
  {
    id: 'claude',
    label: 'Claude',
    format: 'anthropic',
    baseURL: '',
    model: 'claude-opus-5-5',
    modelPlaceholder: 'claude-opus-5-5',
    keyHint: '在 console.anthropic.com 创建 API key（和 Claude 订阅分开计费）',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    format: 'openai',
    baseURL: 'https://api.openai.com/v1',
    model: '',
    modelPlaceholder: '填写要用的模型名称',
    keyHint: '在 platform.openai.com 创建 API key（和 ChatGPT 订阅分开计费）',
  },
  {
    id: 'custom',
    label: '其他（自定义）',
    format: 'openai',
    baseURL: '',
    model: '',
    modelPlaceholder: '模型名称',
    keyHint: '填写服务商提供的 Base URL、模型名称和 API key',
  },
];

/** 根据已保存的配置猜是哪个预设，用于设置界面回显。 */
export function detectPreset(format: AiFormat, baseURL: string): AiPreset {
  const normalized = baseURL.replace(/\/+$/, '');
  if (format === 'anthropic') return AI_PRESETS.find((p) => p.id === 'claude')!;
  return (
    AI_PRESETS.find((p) => p.format === 'openai' && p.baseURL && p.baseURL === normalized) ??
    AI_PRESETS.find((p) => p.id === 'custom')!
  );
}

export async function isAiConfigured(): Promise<boolean> {
  if (!window.aiAPI) return false;
  try {
    return (await window.aiAPI.getConfig()).configured;
  } catch {
    return false;
  }
}

export interface AiPlanItem {
  /** 已有任务的 id；新任务为空字符串。 */
  existing_task_id: string;
  title: string;
  minutes: number;
}

export interface AiPlanResult {
  items: AiPlanItem[];
  advice: string;
}

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: '今天按执行顺序排列的任务',
      items: {
        type: 'object',
        properties: {
          existing_task_id: {
            type: 'string',
            description: '对应已有任务时填它的 id，新任务填空字符串',
          },
          title: { type: 'string', description: '简短的任务标题' },
          minutes: { type: 'integer', description: '预计需要的分钟数' },
        },
        required: ['existing_task_id', 'title', 'minutes'],
        additionalProperties: false,
      },
    },
    advice: { type: 'string', description: '给用户的一两句安排说明' },
  },
  required: ['items', 'advice'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `你是桌面应用“时间管理小精灵”里的规划助手，帮用户安排今天要做的事。
用户每做一个任务会用番茄钟专注（默认 25 分钟一个番茄），每完成一个任务自动休息 10 分钟。

你会收到：当前时间、今天已排好的任务、待办里的其他任务，以及用户这次说的话。
根据用户的话给出今天完整的新安排（按执行顺序），规则：
- 用户提到的已有任务，填写它的 existing_task_id，标题保持原样；新任务 existing_task_id 填空字符串。
- 用户没有要求移除的已排任务保留在安排里。
- 太大的任务拆成几个能在 1～3 个番茄内完成的小任务。
- 需要专注的重要任务尽量排在前面；有固定时间的事（会议等）按时间放在合适的位置。
- 估计时长要现实，总时长不要超过今天剩余的可用时间；排不下时在 advice 里说明哪些可以挪到明天。
- advice 用中文，一两句话，语气友好简洁。
只输出符合下面结构的 JSON，不要输出其他文字：
{"items":[{"existing_task_id":"","title":"","minutes":25}],"advice":""}`;

function describeTasks(tasks: PlanTask[]): string {
  if (tasks.length === 0) return '（无）';
  return tasks
    .map((t) => {
      const status = t.status === 'in_progress' ? '进行中' : '待办';
      const est = t.estimateMinutes ? `，预计 ${t.estimateMinutes} 分钟` : '';
      return `- id=${t.id}：${t.title}（${status}${est}）`;
    })
    .join('\n');
}

/** 从模型回复里取出 JSON：兼容 \`\`\`json 代码块或前后多出的文字。 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('AI 返回的内容不是有效的 JSON');
  }
}

function normalizePlan(raw: unknown): AiPlanResult {
  const obj = (raw ?? {}) as { items?: unknown; advice?: unknown };
  const items = Array.isArray(obj.items) ? obj.items : [];
  return {
    advice: typeof obj.advice === 'string' ? obj.advice : '',
    items: items
      .map((item) => {
        const it = (item ?? {}) as Record<string, unknown>;
        const minutes = Number(it.minutes);
        return {
          existing_task_id: typeof it.existing_task_id === 'string' ? it.existing_task_id : '',
          title: typeof it.title === 'string' ? it.title.trim() : '',
          minutes: Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : 25,
        };
      })
      .filter((it) => it.title.length > 0),
  };
}

export async function planWithAi(
  message: string,
  planned: PlanTask[],
  backlog: PlanTask[],
): Promise<AiPlanResult> {
  if (!window.aiAPI) throw new Error('AI 助手只在桌面版里可用。');
  const now = new Date();
  const user = [
    // 只传 weekday 的话 toLocaleString 只会输出“星期三”，必须把日期和钟点都列出来。
    `当前时间：${now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })}`,
    `今天已排好的任务（按顺序）：\n${describeTasks(planned)}`,
    `待办里的其他任务：\n${describeTasks(backlog)}`,
    `用户说：${message}`,
  ].join('\n\n');

  const result = await window.aiAPI.complete({
    system: SYSTEM_PROMPT,
    user,
    jsonSchema: PLAN_SCHEMA as unknown as Record<string, unknown>,
  });
  if (!result.ok) throw new Error(result.error);
  const plan = normalizePlan(extractJson(result.text));
  if (plan.items.length === 0) throw new Error('AI 没有给出任何任务，请换个说法再试。');
  return plan;
}

// ---------- 任务用时与工作笔记总结 ----------

/** 番茄钟结束时写下的一条工作笔记（SimpleTomatoPage 保存在 task.summaries 里）。 */
export interface WorkNote {
  timestamp: string;
  duration: number;
  completed: boolean;
  summary: string;
}

export interface TaskTimeStats {
  totalMinutes: number;
  sessions: number;
  interruptedSessions: number;
  firstAt: string | null;
  lastAt: string | null;
  /** 按日期汇总，最早的在前。 */
  days: { date: string; minutes: number; sessions: number }[];
}

function localDate(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 用时统计在本地算，不交给 AI，保证数字准确。 */
export function computeTaskTimeStats(notes: WorkNote[]): TaskTimeStats {
  const valid = notes
    .filter((n) => n && typeof n.timestamp === 'string' && !Number.isNaN(new Date(n.timestamp).getTime()))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const byDay = new Map<string, { minutes: number; sessions: number }>();
  let total = 0;
  let interrupted = 0;
  for (const n of valid) {
    const minutes = Number(n.duration) > 0 ? Number(n.duration) : 0;
    total += minutes;
    if (!n.completed) interrupted += 1;
    const key = localDate(n.timestamp);
    const day = byDay.get(key) ?? { minutes: 0, sessions: 0 };
    day.minutes += minutes;
    day.sessions += 1;
    byDay.set(key, day);
  }
  return {
    totalMinutes: total,
    sessions: valid.length,
    interruptedSessions: interrupted,
    firstAt: valid[0]?.timestamp ?? null,
    lastAt: valid.at(-1)?.timestamp ?? null,
    days: [...byDay.entries()].map(([date, v]) => ({ date, ...v })),
  };
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} 小时 ${m} 分钟` : `${h} 小时`;
}

export interface TaskAiSummary {
  /** 整体进展，两三句话。 */
  overview: string;
  /** 做成了什么。 */
  achievements: string[];
  /** 遇到的问题或卡点。 */
  problems: string[];
  /** 建议的下一步。 */
  nextSteps: string[];
  generatedAt: string;
  /** 生成时依据的笔记条数，用来提示“有新记录，可以重新生成”。 */
  notesCount: number;
}

const TASK_SUMMARY_SCHEMA = {
  type: 'object',
  properties: {
    overview: { type: 'string', description: '整体进展，两三句话' },
    achievements: { type: 'array', items: { type: 'string' }, description: '已经完成或取得的成果' },
    problems: { type: 'array', items: { type: 'string' }, description: '遇到的问题、卡点或反复出现的干扰' },
    next_steps: { type: 'array', items: { type: 'string' }, description: '建议的下一步，具体可执行' },
  },
  required: ['overview', 'achievements', 'problems', 'next_steps'],
  additionalProperties: false,
} as const;

const TASK_SUMMARY_PROMPT = `你是桌面应用“时间管理小精灵”里的助手，帮用户回顾同一个任务的工作情况。
你会收到任务信息、已经算好的用时统计，以及用户每个番茄钟结束时写下的工作笔记（按时间排序）。
请根据这些笔记写一份简洁的中文总结：
- overview：两三句话说明这个任务目前的整体进展，可以引用给出的用时数字，但不要自己重新计算或编造数字。
- achievements：做成了什么，每条一句话；没有就返回空数组。
- problems：遇到的问题、卡点，或者笔记里反复出现的中断原因；没有就返回空数组。
- next_steps：具体可执行的下一步；任务已完成时可以写收尾或复盘建议，没有就返回空数组。
只根据笔记内容总结，不要编造笔记里没有的事情。每个列表最多 5 条。
只输出符合下面结构的 JSON，不要输出其他文字：
{"overview":"","achievements":[],"problems":[],"next_steps":[]}`;

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim()).slice(0, 5)
    : [];
}

export async function summarizeTaskWithAi(task: {
  title: string;
  type: string;
  status: string;
  notes: WorkNote[];
}): Promise<TaskAiSummary> {
  if (!window.aiAPI) throw new Error('AI 助手只在桌面版里可用。');
  const stats = computeTaskTimeStats(task.notes);
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  const notesText = [...task.notes]
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map(
      (n, i) =>
        `${i + 1}. ${fmt(n.timestamp)}，${n.duration} 分钟，${n.completed ? '完成' : '中断'}：${
          n.summary?.trim() || '（没写笔记）'
        }`,
    )
    .join('\n');
  const statusText = task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办';

  const user = [
    `任务：${task.title}（类型：${task.type || '未分类'}，状态：${statusText}）`,
    `用时统计（已算好）：共 ${formatMinutes(stats.totalMinutes)}，${stats.sessions} 个番茄钟（其中中断 ${
      stats.interruptedSessions
    } 个），跨 ${stats.days.length} 天：${stats.days
      .map((d) => `${d.date} ${formatMinutes(d.minutes)}`)
      .join('；')}`,
    `工作笔记：\n${notesText}`,
  ].join('\n\n');

  const result = await window.aiAPI.complete({
    system: TASK_SUMMARY_PROMPT,
    user,
    jsonSchema: TASK_SUMMARY_SCHEMA as unknown as Record<string, unknown>,
  });
  if (!result.ok) throw new Error(result.error);
  const raw = (extractJson(result.text) ?? {}) as Record<string, unknown>;
  const overview = typeof raw.overview === 'string' ? raw.overview.trim() : '';
  if (!overview) throw new Error('AI 没有给出总结，请稍后再试。');
  return {
    overview,
    achievements: asStringList(raw.achievements),
    problems: asStringList(raw.problems),
    nextSteps: asStringList(raw.next_steps),
    generatedAt: new Date().toISOString(),
    notesCount: task.notes.length,
  };
}

/** 测试连接：发一个很短的请求。 */
export async function testAiConnection(): Promise<string> {
  if (!window.aiAPI) throw new Error('AI 助手只在桌面版里可用。');
  const result = await window.aiAPI.complete({
    system: '你是一个连接测试。',
    user: '请只回复“连接成功”四个字。',
  });
  if (!result.ok) throw new Error(result.error);
  return result.text.trim();
}
