// 任务搜索：范围是全部任务（包括任务列表里已经不显示的往日已完成任务）。
// 配置了 AI 时交给大模型按意思搜索（标题、类型、工作笔记、AI 总结都参与）；
// 没配置时退回本地关键词匹配。

import { readStoredList } from './services/storedList';
import { extractJson, isAiConfigured } from './ai';
import type { PlanTask } from './dailyPlan';

export const OPEN_SEARCH_EVENT = 'task-search:open';

/** 网页版（没有小猫菜单）打开搜索窗口用。 */
export function openTaskSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

interface NoteLike {
  summary?: unknown;
  timestamp?: unknown;
  duration?: unknown;
}

export interface SearchableTask extends PlanTask {
  summaries?: NoteLike[];
}

export interface TaskSearchHit {
  task: SearchableTask;
  /** 为什么匹配：AI 给的说明，或关键词命中的位置。 */
  reason: string;
}

export interface TaskSearchResult {
  hits: TaskSearchHit[];
  /** AI 对问题的简短回答（例如“上周一共做了 3 次”）；关键词搜索时为空。 */
  answer: string;
  mode: 'ai' | 'keyword';
}

export function readAllTasks(): SearchableTask[] {
  return readStoredList<SearchableTask>('tasks').filter((t) => typeof t.id === 'string');
}

export const STATUS_TEXT: Record<string, string> = {
  pending: '待办',
  in_progress: '进行中',
  completed: '已完成',
};

function notesOf(task: SearchableTask): { text: string; timestamp: string }[] {
  return (Array.isArray(task.summaries) ? task.summaries : [])
    .filter((n): n is NoteLike => !!n && typeof n === 'object')
    .map((n) => ({
      text: typeof n.summary === 'string' ? n.summary.trim() : '',
      timestamp: typeof n.timestamp === 'string' ? n.timestamp : '',
    }))
    .filter((n) => n.text.length > 0);
}

function day(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('zh-CN');
}

// ---------- 关键词搜索（没配置 AI 时） ----------

export function keywordSearch(query: string, tasks: SearchableTask[]): TaskSearchHit[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const hits: (TaskSearchHit & { score: number })[] = [];
  for (const task of tasks) {
    const title = (task.title || '').toLowerCase();
    const type = (task.type || '').toLowerCase();
    const notes = notesOf(task);
    const overview = (task.aiSummary?.overview || '').toLowerCase();
    let score = 0;
    let reason = '';
    let allMatched = true;
    for (const w of words) {
      if (title.includes(w)) {
        score += 3;
        reason ||= '标题匹配';
      } else if (type.includes(w)) {
        score += 2;
        reason ||= `类型：${task.type}`;
      } else {
        const note = notes.find((n) => n.text.toLowerCase().includes(w));
        if (note) {
          score += 1;
          reason ||= `笔记：${note.text.slice(0, 60)}`;
        } else if (overview.includes(w)) {
          score += 1;
          reason ||= 'AI 总结里提到';
        } else {
          allMatched = false;
        }
      }
    }
    if (allMatched && score > 0) hits.push({ task, reason, score });
  }
  return hits.sort((a, b) => b.score - a.score).map(({ task, reason }) => ({ task, reason }));
}

// ---------- AI 搜索 ----------

const SEARCH_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      description: '和用户问题相关的任务，最相关的在前',
      items: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: '任务 id，必须是列表里出现过的' },
          reason: { type: 'string', description: '一句话说明为什么相关' },
        },
        required: ['task_id', 'reason'],
        additionalProperties: false,
      },
    },
    answer: { type: 'string', description: '如果用户问的是问题，用一两句话直接回答；否则为空字符串' },
  },
  required: ['results', 'answer'],
  additionalProperties: false,
} as const;

const SEARCH_PROMPT = `你是桌面应用“时间管理小精灵”里的任务搜索助手。
你会收到用户的全部任务（包括已完成的），每个任务有 id、标题、类型、状态、日期、用时，以及番茄钟结束时写下的工作笔记。
根据用户输入的搜索内容找出相关的任务：
- 按意思匹配，不要求字面相同（例如搜“写代码”可以匹配“修复登录 bug”）；也可以按时间、状态、类型筛选（例如“上周完成的”“学习类”）。
- 只返回确实相关的任务，最相关的在前，最多 20 个；没有相关的就返回空数组。
- reason 用中文一句话说明相关的原因，尽量引用笔记里的具体内容。
- 如果用户问的是一个问题（例如“我上次做 XX 卡在哪了”），在 answer 里根据笔记直接回答，一两句话；否则 answer 填空字符串。
- 不要编造列表里没有的任务或笔记内容。
只输出符合下面结构的 JSON，不要输出其他文字：
{"results":[{"task_id":"","reason":""}],"answer":""}`;

// 控制发给模型的内容大小：每个任务只带最近几条笔记，每条截断。
const MAX_NOTES_PER_TASK = 8;
const MAX_NOTE_CHARS = 160;
const MAX_PROMPT_CHARS = 60_000;

function describeTask(task: SearchableTask, notesPerTask: number): string {
  const parts = [
    `类型：${task.type || '未分类'}`,
    `状态：${STATUS_TEXT[task.status] || task.status}`,
  ];
  if (task.startedAt) parts.push(`开始：${day(task.startedAt)}`);
  if (task.completedAt) parts.push(`完成：${day(task.completedAt)}`);
  if (task.totalDuration) parts.push(`用时：${task.totalDuration} 分钟`);
  const lines = [`- id=${task.id}：${task.title}（${parts.join('，')}）`];
  if (task.aiSummary?.overview) lines.push(`  AI 总结：${task.aiSummary.overview.slice(0, 200)}`);
  const notes = notesOf(task).slice(-notesPerTask);
  for (const n of notes) {
    lines.push(`  · ${day(n.timestamp)} ${n.text.slice(0, MAX_NOTE_CHARS)}`);
  }
  return lines.join('\n');
}

function describeAll(tasks: SearchableTask[]): string {
  // 任务很多时逐步减少每个任务带的笔记条数，直到不超过上限。
  for (let n = MAX_NOTES_PER_TASK; n >= 0; n -= 2) {
    const text = tasks.map((t) => describeTask(t, n)).join('\n');
    if (text.length <= MAX_PROMPT_CHARS || n === 0) return text.slice(0, MAX_PROMPT_CHARS);
  }
  return '';
}

async function aiSearch(query: string, tasks: SearchableTask[]): Promise<TaskSearchResult> {
  const now = new Date().toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const user = [`当前时间：${now}`, `全部任务（共 ${tasks.length} 个）：\n${describeAll(tasks)}`, `搜索：${query}`].join(
    '\n\n',
  );
  const result = await window.aiAPI!.complete({
    system: SEARCH_PROMPT,
    user,
    jsonSchema: SEARCH_SCHEMA as unknown as Record<string, unknown>,
  });
  if (!result.ok) throw new Error(result.error);

  const raw = (extractJson(result.text) ?? {}) as { results?: unknown; answer?: unknown };
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const hits: TaskSearchHit[] = [];
  for (const item of Array.isArray(raw.results) ? raw.results : []) {
    const it = (item ?? {}) as Record<string, unknown>;
    const id = typeof it.task_id === 'string' ? it.task_id : '';
    const task = byId.get(id);
    // 丢掉模型编出来的 id 和重复项
    if (!task || seen.has(id)) continue;
    seen.add(id);
    hits.push({ task, reason: typeof it.reason === 'string' ? it.reason.trim() : '' });
  }
  return { hits, answer: typeof raw.answer === 'string' ? raw.answer.trim() : '', mode: 'ai' };
}

export async function searchTasks(query: string): Promise<TaskSearchResult> {
  const tasks = readAllTasks();
  const q = query.trim();
  if (!q || tasks.length === 0) return { hits: [], answer: '', mode: 'keyword' };
  if (await isAiConfigured()) return aiSearch(q, tasks);
  return { hits: keywordSearch(q, tasks), answer: '', mode: 'keyword' };
}
