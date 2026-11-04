// 日历文件解析与导出。
// - .ics（iCalendar）：Outlook「另存为日历」、Apple 日历「导出」、Google 日历「导出」以及三家的订阅链接都是这个格式。
//   用 ical.js 解析，支持时区（VTIMEZONE）、重复规则（RRULE/EXDATE）和单次修改（RECURRENCE-ID）。
// - .csv：经典版 Outlook「导入/导出 → 导出到文件 → 逗号分隔值」，支持英文和中文表头。
// - 导出：把某个本地日历里有计划日期的任务写成 .ics（全天事件），可导入 Outlook / Apple / Google。

import ICAL from 'ical.js';
import type { CalEvent } from './calendars';
import { addDays } from './schedule';

export type ParsedEvent = Omit<CalEvent, 'calendarId'>;

export interface ParsedCalendar {
  /** 文件里写的日历名（X-WR-CALNAME），没有就是 undefined。 */
  name?: string;
  events: ParsedEvent[];
}

/** 重复事件只展开这个时间窗口里的（今天前 1 年到后 2 年），避免无限重复把存储撑爆。 */
const PAST_DAYS = 366;
const FUTURE_DAYS = 731;
const MAX_OCCURRENCES_PER_SERIES = 800;
const MAX_EVENTS = 15_000;
const MAX_DESCRIPTION = 500;

function clip(text: unknown, max: number): string | undefined {
  if (typeof text !== 'string') return undefined;
  const t = text.trim();
  if (!t) return undefined;
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

function dateKeyOf(t: ICAL.Time): string {
  return `${t.year}-${String(t.month).padStart(2, '0')}-${String(t.day).padStart(2, '0')}`;
}

function toStored(t: ICAL.Time, allDay: boolean): string {
  return allDay ? dateKeyOf(t) : t.toJSDate().toISOString();
}

export function parseIcs(text: string, now = new Date()): ParsedCalendar {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(text));
  } catch (error) {
    throw new Error(`不是有效的 iCalendar（.ics）文件：${error instanceof Error ? error.message : String(error)}`);
  }
  // 有些文件外面还包了一层，取第一个 VCALENDAR
  const cal = root.name === 'vcalendar' ? root : root.getFirstSubcomponent('vcalendar');
  if (!cal) throw new Error('文件里没有找到日历（VCALENDAR）。');

  // 先登记文件自带的时区（Outlook 用 “China Standard Time” 这类 Windows 时区名，靠它才能换算）
  for (const vtz of cal.getAllSubcomponents('vtimezone')) {
    try {
      ICAL.TimezoneService.register(vtz);
    } catch {
      // 时区定义坏了就按浮动时间处理
    }
  }

  const name = clip(cal.getFirstPropertyValue('x-wr-calname'), 60);
  const windowStart = ICAL.Time.fromJSDate(new Date(now.getTime() - PAST_DAYS * 86_400_000), false);
  const windowEnd = ICAL.Time.fromJSDate(new Date(now.getTime() + FUTURE_DAYS * 86_400_000), false);

  // 同一个 UID 的单次修改（带 RECURRENCE-ID）要挂到主事件上
  const vevents = cal.getAllSubcomponents('vevent');
  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Component[] = [];
  const singles: ICAL.Event[] = [];
  for (const comp of vevents) {
    if (comp.hasProperty('recurrence-id')) {
      exceptions.push(comp);
      continue;
    }
    const ev = new ICAL.Event(comp);
    if (ev.uid && ev.isRecurring()) masters.set(ev.uid, ev);
    else singles.push(ev);
  }
  for (const comp of exceptions) {
    const uid = comp.getFirstPropertyValue('uid');
    const master = typeof uid === 'string' ? masters.get(uid) : undefined;
    if (master) {
      try {
        master.relateException(comp);
        continue;
      } catch {
        // 关联失败就当成独立事件
      }
    }
    singles.push(new ICAL.Event(comp));
  }

  const events: ParsedEvent[] = [];
  const cancelled = (comp: ICAL.Component) =>
    String(comp.getFirstPropertyValue('status') || '').toUpperCase() === 'CANCELLED';

  const push = (id: string, ev: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null) => {
    if (!start) return;
    const allDay = start.isDate;
    let endTime = end;
    if (!endTime || endTime.compare(start) < 0) {
      endTime = start.clone();
      if (allDay) endTime.day += 1;
    }
    events.push({
      id,
      title: clip(ev.summary, 200) || '（无标题）',
      start: toStored(start, allDay),
      end: allDay && endTime.isDate ? dateKeyOf(endTime) : toStored(endTime, allDay),
      allDay,
      location: clip(ev.location, 200),
      description: clip(ev.description, MAX_DESCRIPTION),
    });
  };

  for (const ev of singles) {
    if (cancelled(ev.component) || !ev.startDate) continue;
    const id = `${ev.uid || `noid-${events.length}`}${ev.recurrenceId ? `@${ev.recurrenceId.toString()}` : ''}`;
    push(id, ev, ev.startDate, ev.endDate);
  }

  for (const ev of masters.values()) {
    if (cancelled(ev.component) || !ev.startDate) continue;
    let iterator: ICAL.RecurExpansion;
    try {
      iterator = ev.iterator();
    } catch {
      push(ev.uid, ev, ev.startDate, ev.endDate);
      continue;
    }
    let count = 0;
    for (let next = iterator.next(); next; next = iterator.next()) {
      if (next.compare(windowEnd) > 0) break;
      if (++count > MAX_OCCURRENCES_PER_SERIES * 4) break; // 保护：窗口前的次数也算
      const details = ev.getOccurrenceDetails(next);
      if (details.endDate.compare(windowStart) < 0) continue;
      if (cancelled(details.item.component)) continue;
      push(`${ev.uid}@${next.toString()}`, details.item, details.startDate, details.endDate);
      if (events.length >= MAX_EVENTS) break;
    }
  }

  // 太多时保留离今天最近的
  if (events.length > MAX_EVENTS) {
    const nowMs = now.getTime();
    const dist = (e: ParsedEvent) => Math.abs(new Date(e.start.length === 10 ? `${e.start}T12:00` : e.start).getTime() - nowMs);
    events.sort((a, b) => dist(a) - dist(b));
    events.length = MAX_EVENTS;
  }
  // id 去重（坏文件里 UID 可能重复）
  const seen = new Set<string>();
  const unique = events.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  unique.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return { name, events: unique };
}

// ---------- Outlook CSV ----------

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const CSV_HEADERS: Record<string, string[]> = {
  subject: ['subject', '主题', 'betreff'],
  startDate: ['start date', '开始日期', 'beginnt am'],
  startTime: ['start time', '开始时间', 'beginnt um'],
  endDate: ['end date', '结束日期', 'endet am'],
  endTime: ['end time', '结束时间', 'endet um'],
  allDay: ['all day event', 'all-day event', '全天事件', '全天', 'ganztägiges ereignis'],
  location: ['location', '位置', '地点', 'ort'],
  description: ['description', '说明', '描述', '备注', 'beschreibung'],
};

/** 解析 Outlook 导出的日期：2026/11/4、2026-11-04、11/4/2026（美式）、4.11.2026（德式）。 */
function parseCsvDate(value: string): string | null {
  const v = value.trim();
  let m = v.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return null;
}

/** 解析时间：9:30、09:30:00、9:30 PM、下午 9:30、上午9:30。 */
function parseCsvTime(value: string): [number, number] | null {
  const v = value.trim();
  const m = v.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const pm = /pm|下午|晚上/i.test(v);
  const am = /am|上午|凌晨|早上/i.test(v);
  if (pm && h < 12) h += 12;
  if (am && h === 12) h = 0;
  return [h, min];
}

const truthy = (v: string) => /^(true|yes|是|wahr|ja|1)$/i.test(v.trim());

export function parseOutlookCsv(text: string): ParsedCalendar {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV 文件里没有日历数据。');
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (key: string) => header.findIndex((h) => CSV_HEADERS[key].includes(h));
  const idx = Object.fromEntries(Object.keys(CSV_HEADERS).map((k) => [k, col(k)]));
  if (idx.subject < 0 || idx.startDate < 0) {
    throw new Error('无法识别的 CSV：需要 Outlook 导出的“主题 / Subject”和“开始日期 / Start Date”列。');
  }
  const events: ParsedEvent[] = [];
  rows.slice(1).forEach((r, i) => {
    const get = (k: string) => (idx[k] >= 0 ? (r[idx[k]] ?? '') : '');
    const startKey = parseCsvDate(get('startDate'));
    if (!startKey) return;
    const endKey = parseCsvDate(get('endDate')) ?? startKey;
    const st = parseCsvTime(get('startTime'));
    const allDay = truthy(get('allDay')) || !st;
    let start: string;
    let end: string;
    if (allDay) {
      start = startKey;
      end = endKey > startKey ? endKey : addDays(startKey, 1);
    } else {
      const [sy, sm, sd] = startKey.split('-').map(Number);
      const s = new Date(sy, sm - 1, sd, st![0], st![1]);
      const et = parseCsvTime(get('endTime'));
      const [ey, em, ed] = endKey.split('-').map(Number);
      let e = et ? new Date(ey, em - 1, ed, et[0], et[1]) : new Date(s.getTime() + 3_600_000);
      if (e < s) e = new Date(s.getTime() + 3_600_000);
      start = s.toISOString();
      end = e.toISOString();
    }
    events.push({
      id: `csv-${i}-${startKey}`,
      title: clip(get('subject'), 200) || '（无标题）',
      start,
      end,
      allDay,
      location: clip(get('location'), 200),
      description: clip(get('description'), MAX_DESCRIPTION),
    });
  });
  if (events.length === 0) throw new Error('CSV 里没有能识别日期的日程。');
  return { events };
}

/** 按文件名 / 内容自动选择解析器。 */
export function parseCalendarFile(fileName: string, text: string): ParsedCalendar {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.csv')) return parseOutlookCsv(text);
  if (/BEGIN:VCALENDAR/i.test(text)) return parseIcs(text);
  if (lower.endsWith('.vcs')) throw new Error('暂不支持旧的 vCalendar（.vcs）格式，请在 Outlook 里另存为 .ics。');
  throw new Error('无法识别的文件：请选择 .ics 日历文件或 Outlook 导出的 .csv。');
}

// ---------- 导出 ----------

function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 按 RFC 5545 折行（每行不超过 75 个字节）。 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const len = encoder.encode(ch).length;
    if (bytes + len > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += len;
  }
  out.push(current);
  return out.join('\r\n ');
}

export interface ExportTask {
  id: string;
  title: string;
  dueDate?: string;
  status: string;
  priority: string;
  type: string;
}

export function buildIcs(calendarName: string, tasks: ExportTask[], now = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const priority: Record<string, string> = { high: '高', medium: '中', low: '低' };
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeManagementElf//Calendar//ZH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const day = t.dueDate.replace(/-/g, '');
    const next = addDays(t.dueDate, 1).replace(/-/g, '');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${t.id}@time-management-elf`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day}`,
      `DTEND;VALUE=DATE:${next}`,
      `SUMMARY:${escapeText(t.status === 'completed' ? `✓ ${t.title}` : t.title)}`,
      `DESCRIPTION:${escapeText(`${t.type} · ${priority[t.priority] ?? '中'}优先级 · 来自时间管理小精灵`)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** 让浏览器 / Electron 保存一个文本文件。 */
export function downloadText(fileName: string, text: string, mime = 'text/calendar;charset=utf-8'): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

