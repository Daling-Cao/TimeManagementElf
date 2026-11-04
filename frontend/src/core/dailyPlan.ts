// 每日规划：今天要做哪些任务、按什么顺序做，以及“开始某个任务”的公共逻辑。
// 任务本身仍存放在 localStorage['tasks']（会被 desktopDataService 同步到桌面数据文件），
// 这里只额外记录今天的顺序 localStorage['dailyPlan']。

import { readStoredList } from './services/storedList';
import { alertDialog } from './services/dialogs';
import { useTomatoStore } from './store/tomatoStore';
import { useBreakStore } from './store/breakStore';
import type { TaskAiSummary } from './ai';

export interface PlanTask {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: string;
  summaries?: unknown[];
  totalDuration?: number;
  completedSessions?: number;
  startedAt?: string;
  completedAt?: string;
  /** 预计时长（分钟），由 AI 规划时给出。 */
  estimateMinutes?: number;
  /** AI 生成的工作笔记总结（任务详情里生成）。 */
  aiSummary?: TaskAiSummary;
  /** 计划在哪天做（'YYYY-MM-DD'，本地日期），见 core/schedule.ts。 */
  dueDate?: string;
  /** 放在哪个本地日历里（见 core/calendars.ts），没有就是默认日历。 */
  calendarId?: string;
  /** 由外部日历事件“转为任务”时记下事件 id，避免重复转换。 */
  sourceEventId?: string;
}

export interface DailyPlan {
  /** 规划所属的日期（见 planDayKey）。 */
  date: string;
  /** 今天按顺序要做的任务 id。 */
  taskIds: string[];
}

/** 其他页面（例如首页按钮）打开规划窗口用的事件名，由 DailyPlanner 监听。 */
export const OPEN_PLANNER_EVENT = 'daily-planner:open';

export function openDailyPlanner() {
  window.dispatchEvent(new Event(OPEN_PLANNER_EVENT));
}

const PLAN_KEY = 'dailyPlan';
const TASKS_KEY = 'tasks';

// 凌晨 4 点前仍算“前一天”：熬夜到 1 点再打开电脑，不应该被当成新的一天来规划。
const DAY_START_HOUR = 4;

export function planDayKey(now: Date = new Date()): string {
  const d = new Date(now.getTime() - DAY_START_HOUR * 60 * 60 * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function loadPlan(): DailyPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.date !== 'string' || !Array.isArray(parsed.taskIds)) return null;
    return {
      date: parsed.date,
      taskIds: parsed.taskIds.filter((id: unknown): id is string => typeof id === 'string'),
    };
  } catch {
    return null;
  }
}

/** 今天的规划；没有或是旧日期的规划时返回 null。 */
export function loadTodayPlan(): DailyPlan | null {
  const plan = loadPlan();
  return plan && plan.date === planDayKey() ? plan : null;
}

export function savePlan(taskIds: string[]): DailyPlan {
  const plan: DailyPlan = { date: planDayKey(), taskIds };
  localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  return plan;
}

/** 今天是否还没提醒过规划。弹出过（哪怕点了“稍后再说”）就算提醒过。 */
export function needsPlanningToday(): boolean {
  return loadTodayPlan() === null;
}

export function readTasks(): PlanTask[] {
  return readStoredList<PlanTask>(TASKS_KEY);
}

export function writeTasks(tasks: PlanTask[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  // 任务页只在 focus 时重新读取 localStorage；不通知的话它会用旧列表把这里的改动覆盖掉。
  window.dispatchEvent(new Event('focus'));
}

// 同一毫秒里连续创建多个任务（例如 AI 一次返回一批）时，Date.now() + 小随机数会撞号。
// 优先用 crypto.randomUUID；不可用时退回时间戳 + 自增计数 + 随机数。
let idCounter = 0;
export function newTaskId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter = (idCounter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTask(title: string, estimateMinutes?: number, dueDate?: string): PlanTask {
  return {
    ...(estimateMinutes ? { estimateMinutes } : {}),
    ...(dueDate ? { dueDate } : {}),
    id: newTaskId(),
    title,
    status: 'pending',
    priority: 'medium',
    type: '工作',
    summaries: [],
    totalDuration: 0,
    completedSessions: 0,
  };
}

/** 今天规划里下一个还没完成的任务。 */
export function nextPlannedTask(): PlanTask | null {
  const plan = loadTodayPlan();
  if (!plan) return null;
  const tasks = readTasks();
  for (const id of plan.taskIds) {
    const task = tasks.find((t) => t.id === id);
    if (task && task.status !== 'completed') return task;
  }
  return null;
}

/**
 * 立即开始某个任务的番茄钟：标记为进行中、结束正在进行的休息，并跳到番茄钟页。
 * 返回 false 表示已有番茄钟在运行，没有开始。
 */
export function startTaskNow(
  taskId: string,
  navigate: (to: { pathname: string; search?: string }) => void,
): boolean {
  const tomato = useTomatoStore.getState();
  if (tomato.isRunning || tomato.isPaused) {
    alertDialog('已有番茄钟正在进行，请先完成或停止当前番茄钟。');
    navigate({ pathname: '/tomato' });
    return false;
  }

  const tasks = readTasks();
  const index = tasks.findIndex((t) => t.id === taskId);
  if (index === -1) return false;

  if (tasks[index].status !== 'in_progress') {
    tasks[index] = {
      ...tasks[index],
      status: 'in_progress',
      startedAt: tasks[index].startedAt || new Date().toISOString(),
      completedAt: undefined,
    };
    writeTasks(tasks);
  }

  useBreakStore.getState().end();
  tomato.reset();
  tomato.start(tomato.selectedDuration, tasks[index]);
  navigate({ pathname: '/tomato', search: `?taskId=${encodeURIComponent(taskId)}` });
  return true;
}
