// 订阅日历（Outlook / Google / iCloud 的 ICS 链接）的下载与定时刷新。只读：不会写回账号。
// 桌面版由主进程下载（window.calendarAPI，没有跨域限制）；网页版直接 fetch，多数日历服务会被浏览器跨域拦截。

import { loadCalendars, saveEvents, updateCalendar, type CalendarDef } from './calendars';
import { parseIcs } from './calendarImport';

/** 自动刷新间隔。 */
export const SUBSCRIPTION_REFRESH_MS = 30 * 60 * 1000;

/** webcal:// → https://，并检查是不是 http(s) 链接。 */
export function normalizeCalendarUrl(input: string): string {
  const raw = input.trim();
  const url = raw.replace(/^webcals?:\/\//i, 'https://');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('链接格式不对，请粘贴以 https:// 或 webcal:// 开头的日历地址。');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('只支持 https:// 或 webcal:// 开头的日历地址。');
  }
  return parsed.toString();
}

async function fetchIcsText(url: string): Promise<string> {
  if (window.calendarAPI) {
    const res = await window.calendarAPI.fetchIcs(url);
    if (!res.ok) throw new Error(res.error);
    return res.text;
  }
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('网页版被浏览器的跨域限制拦截了。请使用桌面版订阅，或把日历下载成 .ics 文件后导入。');
  }
  if (!response.ok) throw new Error(`下载失败（HTTP ${response.status}）`);
  const text = await response.text();
  if (!/BEGIN:VCALENDAR/i.test(text)) {
    throw new Error('这个链接返回的不是日历（.ics）数据，请确认复制的是 iCal 格式的地址。');
  }
  return text;
}

const inFlight = new Map<string, Promise<number>>();

/** 刷新一个订阅日历，返回事件数。失败时把原因记到日历上并抛出。 */
export function syncSubscription(cal: CalendarDef): Promise<number> {
  const running = inFlight.get(cal.id);
  if (running) return running;
  const task = (async () => {
    try {
      if (!cal.url) throw new Error('这个日历没有订阅链接。');
      const text = await fetchIcsText(cal.url);
      const parsed = parseIcs(text);
      // 同步期间日历可能被删掉了
      if (!loadCalendars().some((c) => c.id === cal.id)) return 0;
      saveEvents(cal.id, parsed.events);
      updateCalendar(cal.id, {
        lastSyncedAt: new Date().toISOString(),
        lastError: undefined,
        eventCount: parsed.events.length,
      });
      return parsed.events.length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (loadCalendars().some((c) => c.id === cal.id)) updateCalendar(cal.id, { lastError: message });
      throw new Error(message);
    } finally {
      inFlight.delete(cal.id);
    }
  })();
  inFlight.set(cal.id, task);
  return task;
}

/** 刷新所有超过 maxAgeMs 没同步的订阅；单个失败不影响其他的。 */
export async function syncDueSubscriptions(maxAgeMs = SUBSCRIPTION_REFRESH_MS): Promise<void> {
  const now = Date.now();
  const due = loadCalendars().filter(
    (c) =>
      c.kind === 'subscription' &&
      (!c.lastSyncedAt || now - new Date(c.lastSyncedAt).getTime() >= maxAgeMs),
  );
  await Promise.allSettled(due.map((c) => syncSubscription(c)));
}
