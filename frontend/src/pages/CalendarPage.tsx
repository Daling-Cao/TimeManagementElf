import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createTask, readTasks, writeTasks, type PlanTask } from '../core/dailyPlan';
import { openDailyPlanner } from '../core/dailyPlan';
import { openTaskSearch } from '../core/taskSearch';
import {
  addDays,
  formatDueLabel,
  fromDateKey,
  isDateKey,
  toDateKey,
  todayKey,
  weekdayLabel,
} from '../core/schedule';
import DueDatePicker from '../components/DueDatePicker';
import CalendarListPanel from '../components/CalendarListPanel';
import CalendarSelect from '../components/CalendarSelect';
import { DEFAULT_CALENDAR_ID, loadVisibleEvents, taskCalendarId, type CalEvent } from '../core/calendars';
import { useCalendars } from '../core/useCalendars';

const WEEK_HEADERS = ['一', '二', '三', '四', '五', '六', '日'];
const MAX_CHIPS = 4;
const MAX_EVENT_DAYS = 62;

/** 事件覆盖的日期（本地日期）。全天事件的结束日不含当天；跨天的定时事件在结束于零点时不算最后一天。 */
function eventDayKeys(e: CalEvent): string[] {
  let first: string;
  let last: string;
  if (e.allDay) {
    first = e.start;
    last = e.end > e.start ? addDays(e.end, -1) : e.start;
  } else {
    const s = new Date(e.start);
    const en = new Date(e.end);
    first = toDateKey(s);
    last = toDateKey(en);
    if (last > first && en.getHours() === 0 && en.getMinutes() === 0) last = addDays(last, -1);
    if (last < first) last = first;
  }
  const keys: string[] = [];
  for (let k = first; k <= last && keys.length < MAX_EVENT_DAYS; k = addDays(k, 1)) keys.push(k);
  return keys;
}

function hm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 事件在某一天显示的时间：全天 / 09:30–10:00 / 跨天时显示起止。 */
function eventTimeLabel(e: CalEvent, day: string): string {
  if (e.allDay) return '全天';
  const startDay = toDateKey(new Date(e.start));
  const endDay = toDateKey(new Date(e.end));
  if (startDay === endDay) return `${hm(e.start)}–${hm(e.end)}`;
  if (day === startDay) return `${hm(e.start)} 起`;
  if (day === endDay) return `至 ${hm(e.end)}`;
  return '全天';
}

type DayItem = { kind: 'event'; event: CalEvent } | { kind: 'task'; task: PlanTask };

const PRIORITY_COLOR: Record<PlanTask['priority'], string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
};

/** 某月的 6×7 格（周一开头），返回每格的日期 key。 */
function monthGrid(year: number, month: number): string[] {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7; // 周一 = 0
  const start = addDays(toDateKey(first), -offset);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

const btn: React.CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: 'white',
  color: '#374151',
  fontSize: 13,
  cursor: 'pointer',
};

/**
 * 日历：按计划日期（task.dueDate）展示任务，可以切换月份、点某天查看 / 添加任务、
 * 把任务拖到另一天改期，或把没排日期的任务排到选中的那天。
 */
const CalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const today = todayKey();
  const [tasks, setTasks] = useState<PlanTask[]>(() => readTasks());
  const calendars = useCalendars();
  // calendars 变化（同步 / 导入 / 显示隐藏）时重新读事件
  const events = useMemo(() => loadVisibleEvents(calendars), [calendars]);
  const calById = useMemo(() => new Map(calendars.map((c) => [c.id, c])), [calendars]);
  const [addCalendarId, setAddCalendarId] = useState(DEFAULT_CALENDAR_ID);
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => {
    const d = fromDateKey(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [newTitle, setNewTitle] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 任务页 / 规划窗口改了任务会触发 focus；跨窗口改动走 storage 事件
  useEffect(() => {
    const reload = () => setTasks(readTasks());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'tasks') reload();
    };
    window.addEventListener('focus', reload);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', reload);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const taskCal = (t: PlanTask) => calById.get(taskCalendarId(t, calendars));

  // 每天的任务（只含显示中的本地日历）
  const byDay = useMemo(() => {
    const map = new Map<string, PlanTask[]>();
    for (const t of tasks) {
      if (!isDateKey(t.dueDate)) continue;
      if (calById.get(taskCalendarId(t, calendars))?.visible === false) continue;
      const list = map.get(t.dueDate) ?? [];
      list.push(t);
      map.set(t.dueDate, list);
    }
    const rank = { in_progress: 0, pending: 1, completed: 2 } as const;
    const prio = { high: 0, medium: 1, low: 2 } as const;
    for (const list of map.values()) {
      list.sort((a, b) => rank[a.status] - rank[b.status] || prio[a.priority] - prio[b.priority]);
    }
    return map;
  }, [tasks, calendars, calById]);

  // 每天的外部日程
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    for (const e of events) {
      for (const key of eventDayKeys(e)) {
        const list = map.get(key) ?? [];
        list.push(e);
        map.set(key, list);
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    }
    return map;
  }, [events]);

  /** 日历格里的顺序：全天日程 → 任务 → 定时日程（按开始时间）。 */
  const dayItems = (key: string): DayItem[] => {
    const evs = eventsByDay.get(key) ?? [];
    return [
      ...evs.filter((e) => e.allDay).map((event) => ({ kind: 'event' as const, event })),
      ...(byDay.get(key) ?? []).map((task) => ({ kind: 'task' as const, task })),
      ...evs.filter((e) => !e.allDay).map((event) => ({ kind: 'event' as const, event })),
    ];
  };

  const convertedEventIds = new Set(tasks.map((t) => t.sourceEventId).filter(Boolean));

  const unscheduled = tasks.filter((t) => t.status !== 'completed' && !isDateKey(t.dueDate));
  const grid = monthGrid(cursor.year, cursor.month);
  const selectedTasks = byDay.get(selected) ?? [];
  const selectedEvents = eventsByDay.get(selected) ?? [];

  // 本月统计
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthTasks = tasks.filter((t) => t.dueDate?.startsWith(monthPrefix));
  const monthDone = monthTasks.filter((t) => t.status === 'completed').length;

  const update = (id: string, patch: Partial<PlanTask>) => {
    const next = readTasks().map((t) => (t.id === id ? { ...t, ...patch } : t));
    writeTasks(next);
    setTasks(next);
  };

  const reschedule = (id: string, dueDate: string) => update(id, { dueDate: dueDate || undefined });

  const toggleDone = (task: PlanTask) => {
    if (task.status === 'completed') {
      update(task.id, { status: 'pending', completedAt: undefined });
    } else {
      update(task.id, { status: 'completed', completedAt: new Date().toISOString() });
    }
  };

  const addTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    const task = createTask(title, undefined, selected);
    if (addCalendarId !== DEFAULT_CALENDAR_ID) task.calendarId = addCalendarId;
    const next = [...readTasks(), task];
    writeTasks(next);
    setTasks(next);
    setNewTitle('');
    inputRef.current?.focus();
  };

  /** 把外部日程变成任务：计划日期是选中的这天，放进上面选的本地日历。 */
  const convertEvent = (e: CalEvent) => {
    const minutes = e.allDay ? undefined : Math.round((new Date(e.end).getTime() - new Date(e.start).getTime()) / 60000);
    const task = createTask(e.title, minutes && minutes > 0 && minutes <= 8 * 60 ? minutes : undefined, selected);
    task.sourceEventId = e.id;
    if (addCalendarId !== DEFAULT_CALENDAR_ID) task.calendarId = addCalendarId;
    const next = [...readTasks(), task];
    writeTasks(next);
    setTasks(next);
  };

  const shiftMonth = (delta: number) => {
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    const d = fromDateKey(today);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  const selectDay = (key: string) => {
    setSelected(key);
    setEditingId(null);
    const d = fromDateKey(key);
    if (d.getMonth() !== cursor.month) setCursor({ year: d.getFullYear(), month: d.getMonth() });
  };

  const onDrop = (key: string) => {
    if (dragId) reschedule(dragId, key);
    setDragId(null);
    setDropKey(null);
  };

  const chipStyle = (t: PlanTask): React.CSSProperties => {
    const done = t.status === 'completed';
    const overdue = !done && t.dueDate! < today;
    return {
      display: 'block',
      width: '100%',
      boxSizing: 'border-box',
      marginTop: 3,
      padding: '1px 6px',
      borderRadius: 4,
      borderLeft: `3px solid ${done ? '#9ca3af' : (taskCal(t)?.color ?? PRIORITY_COLOR[t.priority])}`,
      background: done ? '#f3f4f6' : overdue ? '#fee2e2' : t.status === 'in_progress' ? '#dbeafe' : '#eef2ff',
      color: done ? '#9ca3af' : '#1f2937',
      textDecoration: done ? 'line-through' : 'none',
      fontSize: 12,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      textAlign: 'left',
      cursor: 'grab',
    };
  };

  const eventChipStyle = (e: CalEvent): React.CSSProperties => {
    const color = calById.get(e.calendarId)?.color ?? '#64748b';
    return {
      display: 'block',
      width: '100%',
      boxSizing: 'border-box',
      marginTop: 3,
      padding: '1px 6px',
      borderRadius: 4,
      background: e.allDay ? color : `${color}1f`,
      color: e.allDay ? 'white' : '#1f2937',
      fontSize: 12,
      lineHeight: '18px',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    };
  };

  const selectedDate = fromDateKey(selected);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', padding: '20px' }}>
      <header
        style={{
          backgroundColor: 'white',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 0',
          marginBottom: '32px',
        }}
      >
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>时间管理小精灵</h1>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="#/tasks" style={{ color: '#6b7280', textDecoration: 'none' }}>任务列表</a>
              <a href="#/tomato" style={{ color: '#6b7280', textDecoration: 'none' }}>番茄钟</a>
              <a href="#/calendar" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>日历</a>
              <a href="#/statistics" style={{ color: '#6b7280', textDecoration: 'none' }}>统计</a>
              {!window.petAPI && (
                <>
                  <a href="#" onClick={(e) => { e.preventDefault(); openDailyPlanner(); }} style={{ color: '#6b7280', textDecoration: 'none' }}>📅 规划今天</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); openTaskSearch(); }} style={{ color: '#6b7280', textDecoration: 'none' }}>🔍 搜索</a>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: '80rem',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 24,
          alignItems: 'flex-start',
        }}
      >
        {/* 月视图 */}
        <section
          style={{
            flex: '3 1 560px',
            minWidth: 0,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0, minWidth: 140 }}>
              {cursor.year} 年 {cursor.month + 1} 月
            </h2>
            <button style={btn} onClick={() => shiftMonth(-1)} title="上个月">‹</button>
            <button style={btn} onClick={goToday}>今天</button>
            <button style={btn} onClick={() => shiftMonth(1)} title="下个月">›</button>
            <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>
              本月计划 {monthTasks.length} 个任务{monthTasks.length > 0 ? `，已完成 ${monthDone}` : ''}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 4 }}>
            {WEEK_HEADERS.map((w, i) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: i >= 5 ? '#ef4444' : '#6b7280',
                  padding: '4px 0',
                }}
              >
                周{w}
              </div>
            ))}
            {grid.map((key) => {
              const d = fromDateKey(key);
              const inMonth = d.getMonth() === cursor.month;
              const isToday = key === today;
              const isSelected = key === selected;
              const list = dayItems(key);
              const isDrop = dropKey === key;
              return (
                <div
                  key={key}
                  onClick={() => selectDay(key)}
                  onDragOver={(e) => {
                    if (!dragId) return;
                    e.preventDefault();
                    if (dropKey !== key) setDropKey(key);
                  }}
                  onDragLeave={() => setDropKey((k) => (k === key ? null : k))}
                  onDrop={(e) => {
                    e.preventDefault();
                    onDrop(key);
                  }}
                  style={{
                    minHeight: 92,
                    padding: 6,
                    borderRadius: 6,
                    border: `1px solid ${isSelected ? '#0284c7' : isDrop ? '#818cf8' : '#e5e7eb'}`,
                    boxShadow: isSelected ? '0 0 0 1px #0284c7' : undefined,
                    background: isDrop ? '#eef2ff' : inMonth ? 'white' : '#f9fafb',
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: isToday ? 700 : 500,
                        background: isToday ? '#0284c7' : 'transparent',
                        color: isToday ? 'white' : inMonth ? '#111827' : '#9ca3af',
                      }}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  {list.slice(0, MAX_CHIPS).map((item) => {
                    if (item.kind === 'event') {
                      const e = item.event;
                      return (
                        <span
                          key={`e-${e.id}`}
                          title={`${e.title}\n${eventTimeLabel(e, key)}${e.location ? ` · ${e.location}` : ''}\n${calById.get(e.calendarId)?.name ?? ''}`}
                          style={eventChipStyle(e)}
                        >
                          {!e.allDay && toDateKey(new Date(e.start)) === key && (
                            <span style={{ color: '#6b7280', marginRight: 3 }}>{hm(e.start)}</span>
                          )}
                          {e.title}
                        </span>
                      );
                    }
                    const t = item.task;
                    return (
                    <span
                      key={t.id}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', t.id);
                        setDragId(t.id);
                      }}
                      onDragEnd={() => {
                        setDragId(null);
                        setDropKey(null);
                      }}
                      title={`${t.title}（拖到其他日期可改期）`}
                      style={chipStyle(t)}
                    >
                      {t.title}
                    </span>
                    );
                  })}
                  {list.length > MAX_CHIPS && (
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3 }}>
                      还有 {list.length - MAX_CHIPS} 个…
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
            提示：点某天查看和添加任务；把任务拖到其他日期即可改期。导入 / 订阅的日程是只读的，可以在右侧“转为任务”。
          </div>
        </section>

        <aside style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 选中日期 */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: 20,
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: 0 }}>
            {selectedDate.getMonth() + 1} 月 {selectedDate.getDate()} 日 · {weekdayLabel(selected)}
          </h2>
          <div style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 16px' }}>
            {formatDueLabel(selected, today)}
            {selected < today ? '（已过去）' : ''}
          </div>

          <CalendarSelect value={addCalendarId} onChange={setAddCalendarId} style={{ marginBottom: 8 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing || e.key === 'Process') return;
                if (e.key === 'Enter') addTask();
              }}
              placeholder="在这天添加任务…"
              style={{
                flex: 1,
                minWidth: 0,
                padding: '8px 10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
              }}
            />
            <button
              onClick={addTask}
              disabled={!newTitle.trim()}
              style={{
                ...btn,
                background: newTitle.trim() ? '#0284c7' : '#d1d5db',
                color: 'white',
                border: 'none',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              添加
            </button>
          </div>

          {selectedEvents.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: '#374151', margin: '0 0 8px' }}>日程（{selectedEvents.length}）</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
                {selectedEvents.map((e) => {
                  const cal = calById.get(e.calendarId);
                  const color = cal?.color ?? '#64748b';
                  const converted = convertedEventIds.has(e.id);
                  return (
                    <li
                      key={e.id}
                      style={{
                        borderLeft: `3px solid ${color}`,
                        background: `${color}12`,
                        borderRadius: 6,
                        padding: '6px 10px',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#6b7280', flex: 'none' }}>{eventTimeLabel(e, selected)}</span>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: '#111827', wordBreak: 'break-all' }}>{e.title}</span>
                        <button
                          onClick={() => convertEvent(e)}
                          disabled={converted}
                          title={converted ? '已经转成任务了' : '在这天创建一个同名任务'}
                          style={{
                            ...btn,
                            padding: '1px 8px',
                            fontSize: 12,
                            flex: 'none',
                            color: converted ? '#9ca3af' : '#374151',
                            cursor: converted ? 'default' : 'pointer',
                          }}
                        >
                          {converted ? '已转任务' : '转为任务'}
                        </button>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                        {cal?.name}
                        {e.location ? ` · 📍 ${e.location}` : ''}
                      </div>
                      {e.description && (
                        <div
                          style={{ fontSize: 12, color: '#6b7280', marginTop: 2, whiteSpace: 'pre-wrap', maxHeight: 54, overflow: 'hidden' }}
                          title={e.description}
                        >
                          {e.description}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <h3 style={{ fontSize: 14, color: '#374151', margin: '0 0 8px' }}>任务（{selectedTasks.length}）</h3>
            </>
          )}
          {selectedTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af', fontSize: 14 }}>
              这天还没有计划的任务
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {selectedTasks.map((t) => {
                const done = t.status === 'completed';
                return (
                  <li
                    key={t.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: `3px solid ${done ? '#9ca3af' : (taskCal(t)?.color ?? PRIORITY_COLOR[t.priority])}`,
                      borderRadius: 6,
                      padding: '8px 10px',
                      marginBottom: 8,
                      background: done ? '#f9fafb' : 'white',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={() => toggleDone(t)}
                        title={done ? '标记为未完成' : '标记为已完成'}
                      />
                      <span
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 14,
                          color: done ? '#9ca3af' : '#111827',
                          textDecoration: done ? 'line-through' : 'none',
                          wordBreak: 'break-all',
                        }}
                      >
                        {t.title}
                        {t.status === 'in_progress' && (
                          <span style={{ marginLeft: 6, fontSize: 12, color: '#3b82f6' }}>进行中</span>
                        )}
                        <span style={{ marginLeft: 6, fontSize: 12, color: '#9ca3af' }}>
                          {t.type} · {taskCal(t)?.name}
                        </span>
                        <span
                          title={`${t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}优先级`}
                          style={{ marginLeft: 6, display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: PRIORITY_COLOR[t.priority], verticalAlign: 'middle' }}
                        />
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, paddingLeft: 24, flexWrap: 'wrap' }}>
                      <button
                        style={{ ...btn, padding: '2px 8px', fontSize: 12 }}
                        onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                      >
                        改期
                      </button>
                      <button
                        style={{ ...btn, padding: '2px 8px', fontSize: 12 }}
                        onClick={() => navigate({ pathname: '/tasks', search: `?open=${encodeURIComponent(t.id)}` })}
                      >
                        详情
                      </button>
                    </div>
                    {editingId === t.id && (
                      <div style={{ marginTop: 8, paddingLeft: 24 }}>
                        <DueDatePicker
                          value={t.dueDate || ''}
                          onChange={(v) => {
                            reschedule(t.id, v);
                            setEditingId(null);
                            if (v) selectDay(v);
                          }}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {unscheduled.length > 0 && (
            <>
              <h3 style={{ fontSize: 14, color: '#374151', margin: '20px 0 8px' }}>
                未安排日期的任务（{unscheduled.length}）
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unscheduled.map((t) => (
                  <button
                    key={t.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', t.id);
                      setDragId(t.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropKey(null);
                    }}
                    onClick={() => reschedule(t.id, selected)}
                    title={`排到 ${formatDueLabel(selected, today)}（也可以拖到日历上的某天）`}
                    style={{ ...btn, borderRadius: 999, padding: '4px 10px', fontSize: 12 }}
                  >
                    ＋ {t.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: 20,
          }}
        >
          <CalendarListPanel />
        </div>
        </aside>
      </main>
    </div>
  );
};

export default CalendarPage;
