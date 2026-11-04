import React, { useRef, useState } from 'react';
import {
  CALENDAR_COLORS,
  DEFAULT_CALENDAR_ID,
  createCalendar,
  deleteCalendar,
  loadCalendars,
  nextColor,
  saveEvents,
  taskCalendarId,
  updateCalendar,
  type CalendarDef,
} from '../core/calendars';
import { buildIcs, downloadText, parseCalendarFile } from '../core/calendarImport';
import { normalizeCalendarUrl, syncSubscription } from '../core/calendarSync';
import { readTasks } from '../core/dailyPlan';
import { confirmDialog } from '../core/services/dialogs';
import { useCalendars } from '../core/useCalendars';

const KIND_LABEL: Record<CalendarDef['kind'], string> = {
  local: '本地',
  import: '导入',
  subscription: '订阅',
};

const iconBtn: React.CSSProperties = {
  padding: '2px 6px',
  border: '1px solid #e5e7eb',
  borderRadius: 4,
  background: 'white',
  color: '#4b5563',
  fontSize: 12,
  cursor: 'pointer',
  lineHeight: '18px',
};

const actionBtn: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  background: 'white',
  color: '#374151',
  fontSize: 13,
  cursor: 'pointer',
};

function timeAgo(iso?: string): string {
  if (!iso) return '尚未同步';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return '刚刚同步';
  if (min < 60) return `${min} 分钟前同步`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} 小时前同步`;
  return `${Math.round(h / 24)} 天前同步`;
}

/** 文件可能是 UTF-8，也可能是中文版 Outlook 导出的 GBK。 */
async function readFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('gb18030').decode(buffer);
  }
}

type DialogState =
  | { mode: 'local' }
  | { mode: 'subscribe' }
  | { mode: 'edit'; calendar: CalendarDef };

/** 日历页侧栏：日历列表（显示/隐藏、刷新、导出、编辑、删除）+ 新建 / 导入文件 / 订阅链接。 */
const CalendarListPanel: React.FC = () => {
  const calendars = useCalendars();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const importFile = async (file: File) => {
    try {
      const parsed = parseCalendarFile(file.name, await readFileText(file));
      const name = parsed.name || file.name.replace(/\.[^.]+$/, '') || '导入的日历';
      const existing = loadCalendars().find((c) => c.kind === 'import' && c.name === name);
      let target: CalendarDef;
      if (existing && confirmDialog(`已经有一个叫「${name}」的导入日历，要用这个文件替换它的内容吗？\n\n选“取消”会另建一个新日历。`)) {
        target = existing;
      } else {
        target = createCalendar({ name, kind: 'import', color: nextColor() });
      }
      try {
        saveEvents(target.id, parsed.events);
      } catch (error) {
        if (target !== existing) deleteCalendar(target.id);
        throw error;
      }
      updateCalendar(target.id, {
        lastSyncedAt: new Date().toISOString(),
        eventCount: parsed.events.length,
        lastError: undefined,
      });
      setNotice({ text: `已导入 ${parsed.events.length} 个日程到「${target.name}」。` });
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : String(error), error: true });
    }
  };

  const refresh = async (cal: CalendarDef) => {
    setSyncing(cal.id);
    try {
      const n = await syncSubscription(cal);
      setNotice({ text: `「${cal.name}」已同步，共 ${n} 个日程。` });
    } catch (error) {
      setNotice({ text: `「${cal.name}」同步失败：${error instanceof Error ? error.message : String(error)}`, error: true });
    } finally {
      setSyncing(null);
    }
  };

  const exportCalendar = (cal: CalendarDef) => {
    const list = loadCalendars();
    const tasks = readTasks().filter((t) => t.dueDate && taskCalendarId(t, list) === cal.id);
    if (tasks.length === 0) {
      setNotice({ text: `「${cal.name}」里还没有带计划日期的任务，没有可导出的内容。`, error: true });
      return;
    }
    downloadText(`${cal.name}.ics`, buildIcs(cal.name, tasks));
    setNotice({ text: `已导出 ${tasks.length} 个任务。可以在 Outlook、Apple 日历或 Google 日历里导入这个 .ics 文件。` });
  };

  const remove = (cal: CalendarDef) => {
    const msg =
      cal.kind === 'local'
        ? `删除日历「${cal.name}」？\n\n里面的任务不会被删除，会移回「我的日历」。`
        : `删除日历「${cal.name}」和它的 ${cal.eventCount ?? 0} 个日程？\n\n已经转成任务的不受影响。`;
    if (confirmDialog(msg)) deleteCalendar(cal.id);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: 0, flex: 1 }}>日历</h2>
        <button style={iconBtn} onClick={() => setDialog({ mode: 'local' })} title="新建本地日历">
          ＋ 新建
        </button>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {calendars.map((cal) => (
          <li
            key={cal.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 0', borderBottom: '1px solid #f3f4f6' }}
          >
            <input
              type="checkbox"
              checked={cal.visible}
              onChange={(e) => updateCalendar(cal.id, { visible: e.target.checked })}
              title={cal.visible ? '在日历上隐藏' : '在日历上显示'}
              style={{ accentColor: cal.color }}
            />
            <span style={{ width: 10, height: 10, borderRadius: 999, background: cal.color, flex: 'none' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {cal.name}
                <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>{KIND_LABEL[cal.kind]}</span>
              </div>
              {cal.kind !== 'local' && (
                <div
                  style={{ fontSize: 11, color: cal.lastError ? '#ef4444' : '#9ca3af' }}
                  title={cal.lastError || cal.url}
                >
                  {cal.lastError
                    ? `同步失败：${cal.lastError.slice(0, 40)}`
                    : `${cal.eventCount ?? 0} 个日程 · ${cal.kind === 'subscription' ? timeAgo(cal.lastSyncedAt) : '导入的文件'}`}
                </div>
              )}
            </div>
            {cal.kind === 'subscription' && (
              <button style={iconBtn} onClick={() => refresh(cal)} disabled={syncing === cal.id} title="立即同步">
                {syncing === cal.id ? '…' : '↻'}
              </button>
            )}
            {cal.kind === 'local' && (
              <button style={iconBtn} onClick={() => exportCalendar(cal)} title="导出为 .ics（可导入 Outlook / Apple / Google 日历）">
                ⤓
              </button>
            )}
            <button style={iconBtn} onClick={() => setDialog({ mode: 'edit', calendar: cal })} title="编辑">
              ✎
            </button>
            {cal.id !== DEFAULT_CALENDAR_ID && (
              <button style={iconBtn} onClick={() => remove(cal)} title="删除">
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>

      <div style={{ display: 'flex', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
        <button style={actionBtn} onClick={() => fileRef.current?.click()} title="Outlook / Apple / Google 导出的 .ics，或 Outlook 导出的 .csv">
          📥 导入日历文件
        </button>
        <button style={actionBtn} onClick={() => setDialog({ mode: 'subscribe' })}>
          🔗 订阅账号日历
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".ics,.ical,.ifb,.icalendar,.csv,text/calendar,text/csv"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void importFile(file);
          }}
        />
      </div>

      {notice && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 10px',
            borderRadius: 6,
            fontSize: 12,
            background: notice.error ? '#fef2f2' : '#f0fdf4',
            color: notice.error ? '#b91c1c' : '#166534',
            display: 'flex',
            gap: 8,
          }}
        >
          <span style={{ flex: 1 }}>{notice.text}</span>
          <button onClick={() => setNotice(null)} style={{ ...iconBtn, border: 'none', background: 'transparent' }}>
            ✕
          </button>
        </div>
      )}

      {dialog && (
        <CalendarDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onDone={(text) => {
            setDialog(null);
            if (text) setNotice({ text });
          }}
        />
      )}
    </div>
  );
};

const HELP: { name: string; steps: string }[] = [
  { name: 'Google 日历', steps: '网页版 设置 → 左侧选中要同步的日历 → 「集成日历」→ 复制「iCal 格式的私密地址」' },
  { name: 'Outlook', steps: 'Outlook 网页版 设置 → 日历 → 共享日历 → 「发布日历」→ 选日历和权限后发布 → 复制 ICS 链接' },
  { name: 'Apple iCloud', steps: 'Mac / iPhone 日历 App → 日历的共享设置 → 勾选「公开日历」→ 复制 webcal:// 链接' },
];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #d1d5db',
  borderRadius: 6,
  fontSize: 14,
  boxSizing: 'border-box',
};

const CalendarDialog: React.FC<{
  state: DialogState;
  onClose: () => void;
  onDone: (notice?: string) => void;
}> = ({ state, onClose, onDone }) => {
  const editing = state.mode === 'edit' ? state.calendar : null;
  const isSubscription = state.mode === 'subscribe' || editing?.kind === 'subscription';
  const [name, setName] = useState(editing?.name ?? '');
  const [color, setColor] = useState(editing?.color ?? nextColor());
  const [url, setUrl] = useState(editing?.url ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const title =
    state.mode === 'local' ? '新建本地日历' : state.mode === 'subscribe' ? '订阅账号日历' : `编辑日历「${editing!.name}」`;

  const submit = async () => {
    if (busy) return;
    setError('');
    const finalName = name.trim();
    try {
      if (state.mode === 'local') {
        if (!finalName) throw new Error('请输入日历名称');
        createCalendar({ name: finalName.slice(0, 40), color, kind: 'local' });
        onDone(`已新建日历「${finalName}」，创建或编辑任务时可以选择放进去。`);
        return;
      }
      if (state.mode === 'subscribe') {
        const normalized = normalizeCalendarUrl(url);
        if (loadCalendars().some((c) => c.kind === 'subscription' && c.url === normalized)) {
          throw new Error('这个链接已经订阅过了。');
        }
        setBusy(true);
        const cal = createCalendar({
          name: (finalName || '订阅的日历').slice(0, 40),
          color,
          kind: 'subscription',
          url: normalized,
        });
        try {
          const n = await syncSubscription(cal);
          onDone(`已订阅「${cal.name}」，同步了 ${n} 个日程，之后每 30 分钟自动刷新。`);
        } catch (e) {
          deleteCalendar(cal.id);
          throw e;
        }
        return;
      }
      // edit
      const cal = editing!;
      const patch: Partial<CalendarDef> = { name: (finalName || cal.name).slice(0, 40), color };
      const urlChanged = cal.kind === 'subscription' && url.trim() && url.trim() !== cal.url;
      if (urlChanged) patch.url = normalizeCalendarUrl(url);
      updateCalendar(cal.id, patch);
      if (urlChanged) {
        setBusy(true);
        await syncSubscription({ ...cal, ...patch });
      }
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 16px' }}>{title}</h3>

        {isSubscription && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
              日历链接（ICS / webcal）<span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://… 或 webcal://…"
              autoFocus
              style={inputStyle}
            />
            {state.mode === 'subscribe' && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', lineHeight: 1.6 }}>
                {HELP.map((h) => (
                  <div key={h.name}>
                    <b style={{ color: '#374151' }}>{h.name}：</b>
                    {h.steps}
                  </div>
                ))}
                <div style={{ marginTop: 4 }}>订阅是只读的：账号里的变化会自动同步过来，这里的修改不会写回账号。私密地址相当于密码，不要分享给别人。</div>
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>
            名称{state.mode === 'local' && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={state.mode === 'subscribe' ? '例如：工作 Outlook' : '例如：工作、个人、学习'}
            autoFocus={!isSubscription}
            maxLength={40}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing || e.key === 'Process') return;
              if (e.key === 'Enter') void submit();
            }}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: '#374151', marginBottom: 6 }}>颜色</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {CALENDAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: c,
                  border: color === c ? '3px solid #111827' : '3px solid transparent',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={actionBtn}>
            取消
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            style={{ ...actionBtn, background: busy ? '#93c5fd' : '#0284c7', color: 'white', border: 'none' }}
          >
            {busy ? '正在同步…' : state.mode === 'subscribe' ? '订阅' : state.mode === 'local' ? '创建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarListPanel;
