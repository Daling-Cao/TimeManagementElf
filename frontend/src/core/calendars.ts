// 多日历：本地日历（任务可以放进去，可导出 .ics）、导入的日历文件、订阅的日历链接（只读）。
// 日历列表存 localStorage['calendars']，每个外部日历的事件存 localStorage['calendarEvents:<id>']。
// 任务仍在 localStorage['tasks']，用 task.calendarId 指向某个本地日历（没有就是默认日历）。

import { readTasks, writeTasks } from './dailyPlan';

export type CalendarKind = 'local' | 'import' | 'subscription';

export interface CalendarDef {
  id: string;
  name: string;
  color: string;
  kind: CalendarKind;
  /** 在日历页上是否显示。 */
  visible: boolean;
  /** 订阅链接（kind = subscription）。 */
  url?: string;
  /** 上次成功导入 / 同步的时间（ISO）。 */
  lastSyncedAt?: string;
  /** 上次同步失败的原因，成功后清空。 */
  lastError?: string;
  eventCount?: number;
}

/** 外部日历里的一条日程（一次重复事件的每一次各算一条）。 */
export interface CalEvent {
  id: string;
  calendarId: string;
  title: string;
  /** 全天：'YYYY-MM-DD'；否则 ISO 时间。 */
  start: string;
  /** 全天：结束日期（不含当天，同 iCalendar）；否则 ISO 时间。 */
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
}

export const DEFAULT_CALENDAR_ID = 'local-default';
export const CALENDARS_CHANGED_EVENT = 'calendars:changed';

export const CALENDAR_COLORS = [
  '#0284c7',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0d9488',
  '#ca8a04',
  '#64748b',
];

const CALENDARS_KEY = 'calendars';
const EVENTS_PREFIX = 'calendarEvents:';

function defaultCalendar(): CalendarDef {
  return { id: DEFAULT_CALENDAR_ID, name: '我的日历', color: CALENDAR_COLORS[0], kind: 'local', visible: true };
}

function isCalendar(value: unknown): value is CalendarDef {
  const c = value as CalendarDef;
  return (
    !!c &&
    typeof c === 'object' &&
    typeof c.id === 'string' &&
    typeof c.name === 'string' &&
    (c.kind === 'local' || c.kind === 'import' || c.kind === 'subscription')
  );
}

export function loadCalendars(): CalendarDef[] {
  let list: CalendarDef[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CALENDARS_KEY) || '[]');
    if (Array.isArray(parsed)) {
      list = parsed.filter(isCalendar).map((c) => ({
        ...c,
        color: typeof c.color === 'string' ? c.color : CALENDAR_COLORS[0],
        visible: c.visible !== false,
      }));
    }
  } catch {
    list = [];
  }
  // 默认本地日历永远存在，且排在第一个
  if (!list.some((c) => c.id === DEFAULT_CALENDAR_ID)) list.unshift(defaultCalendar());
  return list;
}

function notify() {
  window.dispatchEvent(new Event(CALENDARS_CHANGED_EVENT));
}

export function saveCalendars(list: CalendarDef[]): void {
  localStorage.setItem(CALENDARS_KEY, JSON.stringify(list));
  notify();
}

export function updateCalendar(id: string, patch: Partial<CalendarDef>): void {
  saveCalendars(loadCalendars().map((c) => (c.id === id ? { ...c, ...patch, id: c.id, kind: c.kind } : c)));
}

export function localCalendars(list = loadCalendars()): CalendarDef[] {
  return list.filter((c) => c.kind === 'local');
}

/** 下一个还没被用过的颜色。 */
export function nextColor(list = loadCalendars()): string {
  const used = new Set(list.map((c) => c.color));
  return CALENDAR_COLORS.find((c) => !used.has(c)) ?? CALENDAR_COLORS[list.length % CALENDAR_COLORS.length];
}

function newCalendarId(kind: CalendarKind): string {
  const rand =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${kind}-${Date.now().toString(36)}-${rand}`;
}

export function createCalendar(input: Omit<CalendarDef, 'id' | 'visible'> & { visible?: boolean }): CalendarDef {
  const list = loadCalendars();
  const cal: CalendarDef = { visible: true, ...input, id: newCalendarId(input.kind) };
  saveCalendars([...list, cal]);
  return cal;
}

/** 删除日历：外部日历连同事件一起删；本地日历里的任务回到默认日历（任务本身不删）。 */
export function deleteCalendar(id: string): void {
  if (id === DEFAULT_CALENDAR_ID) return;
  const list = loadCalendars();
  const cal = list.find((c) => c.id === id);
  if (!cal) return;
  if (cal.kind === 'local') {
    const tasks = readTasks();
    if (tasks.some((t) => t.calendarId === id)) {
      writeTasks(tasks.map((t) => (t.calendarId === id ? { ...t, calendarId: undefined } : t)));
    }
  } else {
    localStorage.removeItem(EVENTS_PREFIX + id);
  }
  saveCalendars(list.filter((c) => c.id !== id));
}

/** 任务所在的本地日历 id；没设置或日历已被删时是默认日历。 */
export function taskCalendarId(task: { calendarId?: string }, list = loadCalendars()): string {
  const id = task.calendarId;
  return id && list.some((c) => c.id === id && c.kind === 'local') ? id : DEFAULT_CALENDAR_ID;
}

export function loadEvents(calendarId: string): CalEvent[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(EVENTS_PREFIX + calendarId) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is CalEvent =>
        !!e && typeof e === 'object' && typeof e.id === 'string' && typeof e.start === 'string' && typeof e.end === 'string',
    );
  } catch {
    return [];
  }
}

/** 替换某个外部日历的全部事件。存不下（超出 localStorage 配额）时抛出可读的错误。 */
export function saveEvents(calendarId: string, events: Omit<CalEvent, 'calendarId'>[]): void {
  const withCal = events.map((e) => ({ ...e, calendarId }));
  try {
    localStorage.setItem(EVENTS_PREFIX + calendarId, JSON.stringify(withCal));
  } catch {
    throw new Error(`日历事件太多（${events.length} 条），本地存不下。可以只导出最近一段时间的日历再导入。`);
  }
  notify();
}

/** 所有显示中的外部日历的事件。 */
export function loadVisibleEvents(list = loadCalendars()): CalEvent[] {
  return list.filter((c) => c.kind !== 'local' && c.visible).flatMap((c) => loadEvents(c.id));
}
