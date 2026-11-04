// 计划日期：任务可以排到明天、下个月或更远的某一天（task.dueDate = 'YYYY-MM-DD'，本地日期）。
// “今天”沿用每日规划的 planDayKey（凌晨 4 点前仍算前一天），两边对“今天”的理解保持一致。

import { planDayKey } from './dailyPlan';

export interface Schedulable {
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_RE.test(value);
}

export function todayKey(): string {
  return planDayKey();
}

export function toDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 'YYYY-MM-DD' → 当天本地零点（用中午避开夏令时切换的边界）。 */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** 加 n 个月；目标月没有这一天（如 1 月 31 日 + 1 月）时落到该月最后一天。 */
export function addMonths(key: string, months: number): string {
  const d = fromDateKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toDateKey(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / 86_400_000);
}

/** 排在今天之后、还没完成的任务：今天的列表和规划里先不出现，到那天再出现。 */
export function isUpcoming(task: Schedulable, today = todayKey()): boolean {
  return task.status !== 'completed' && isDateKey(task.dueDate) && task.dueDate > today;
}

/** 计划日期已过、还没完成。 */
export function isOverdue(task: Schedulable, today = todayKey()): boolean {
  return task.status !== 'completed' && isDateKey(task.dueDate) && task.dueDate < today;
}

/** 计划在今天（或已过期）、还没完成：每日规划默认把它们放进今天的安排。 */
export function isDueByToday(task: Schedulable, today = todayKey()): boolean {
  return task.status !== 'completed' && isDateKey(task.dueDate) && task.dueDate <= today;
}

const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

export function weekdayLabel(key: string): string {
  return `周${WEEK[fromDateKey(key).getDay()]}`;
}

/** 给人看的日期：今天 / 明天 / 后天 / 周三（一周内）/ 11月20日 / 2027年1月5日。 */
export function formatDueLabel(key: string, today = todayKey()): string {
  const diff = diffDays(today, key);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  const d = fromDateKey(key);
  const md = `${d.getMonth() + 1}月${d.getDate()}日`;
  if (diff > 2 && diff < 7) return `${weekdayLabel(key)}（${md}）`;
  const t = fromDateKey(today);
  return d.getFullYear() === t.getFullYear() ? md : `${d.getFullYear()}年${md}`;
}

/** 快捷选项：新建 / 编辑任务时一键排期。 */
export function quickDueOptions(today = todayKey()): { label: string; value: string }[] {
  return [
    { label: '今天', value: today },
    { label: '明天', value: addDays(today, 1) },
    { label: '下周', value: addDays(today, 7) },
    { label: '下个月', value: addMonths(today, 1) },
  ];
}
