import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAiConfigured } from '../core/ai';
import {
  OPEN_SEARCH_EVENT,
  STATUS_TEXT,
  searchTasks,
  type TaskSearchResult,
} from '../core/taskSearch';
import AiSettingsDialog from './AiSettingsDialog';

const STATUS_COLOR: Record<string, { bg: string; fg: string }> = {
  pending: { bg: '#f3f4f6', fg: '#4b5563' },
  in_progress: { bg: '#dbeafe', fg: '#1d4ed8' },
  completed: { bg: '#dcfce7', fg: '#15803d' },
};

function shortDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getMonth() + 1}/${d.getDate()}`;
}

/**
 * 任务搜索窗口：从小猫右键菜单「🔍 搜索任务」打开，范围是全部任务。
 * 配置了 AI 时由大模型按意思搜索并可直接回答问题，否则用关键词匹配。
 */
const TaskSearchDialog: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  // 主窗口原本隐藏、专门为搜索弹出来：背景不透出页面，关掉后窗口也一起收起。
  const [standalone, setStandalone] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TaskSearchResult | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // 每次搜索/关闭递增，丢弃过期的回复
  const requestRef = useRef(0);

  const openSearch = () => {
    const api = window.appAPI;
    setStandalone(!!api && !api.isMainVisible());
    setOpen(true);
    setError('');
    api?.showMain();
    isAiConfigured().then(setAiConfigured);
    setTimeout(() => inputRef.current?.select(), 50);
  };
  const openRef = useRef(openSearch);
  openRef.current = openSearch;

  useEffect(() => {
    const handler = () => openRef.current();
    const off = window.appAPI?.onSearchOpen(handler);
    window.addEventListener(OPEN_SEARCH_EVENT, handler);
    return () => {
      off?.();
      window.removeEventListener(OPEN_SEARCH_EVENT, handler);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => {
    requestRef.current += 1;
    setBusy(false);
    setOpen(false);
    if (standalone) window.appAPI?.hideMain();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAiSettings) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const runSearch = async () => {
    const q = query.trim();
    if (!q || busy) return;
    const id = ++requestRef.current;
    setBusy(true);
    setError('');
    try {
      const r = await searchTasks(q);
      if (id === requestRef.current) setResult(r);
    } catch (e) {
      if (id === requestRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === requestRef.current) setBusy(false);
    }
  };

  const openTask = (taskId: string) => {
    requestRef.current += 1;
    setBusy(false);
    setOpen(false); // 要看详情，不收起窗口
    navigate({ pathname: '/tasks', search: `?open=${encodeURIComponent(taskId)}` });
  };

  if (!open) return null;

  const btn: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    background: 'white',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#374151',
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !standalone) close();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: standalone ? '#eef2f7' : 'rgba(17, 24, 39, 0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 2100,
        padding: '8vh 16px 16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="搜索任务"
        style={{
          background: 'white',
          borderRadius: 16,
          width: '100%',
          maxWidth: 620,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ padding: '18px 20px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 18, color: '#111827', flex: 1 }}>🔍 搜索任务</strong>
            <span style={{ fontSize: 12, color: aiConfigured ? '#6d28d9' : '#9ca3af', marginRight: 8 }}>
              {aiConfigured ? '🤖 AI 搜索 · 全部任务' : '关键词搜索 · 全部任务'}
            </span>
            {window.aiAPI && (
              <button onClick={() => setShowAiSettings(true)} style={{ ...btn, padding: '2px 8px', fontSize: 12 }}>
                ⚙️ AI 设置
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) runSearch();
              }}
              placeholder={
                aiConfigured ? '例如：上周做过的前端任务 / 登录 bug 最后卡在哪了' : '输入标题、类型或笔记里的关键词'
              }
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: 15,
                border: '2px solid #c4b5fd',
                borderRadius: 10,
                outline: 'none',
              }}
            />
            <button
              onClick={runSearch}
              disabled={busy || !query.trim()}
              style={{
                ...btn,
                background: busy || !query.trim() ? '#c4b5fd' : '#7c3aed',
                color: 'white',
                border: 'none',
                fontWeight: 600,
                cursor: busy || !query.trim() ? 'default' : 'pointer',
              }}
            >
              {busy ? '搜索中…' : '搜索'}
            </button>
          </div>
          {!aiConfigured && window.aiAPI && (
            <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
              配置 AI 后可以按意思搜索、直接提问（例如“我上次做 XX 卡在哪了”）。
            </div>
          )}
        </div>

        <div style={{ padding: '0 20px 16px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: 13 }}>
              搜索失败：{error}
            </div>
          )}
          {busy && !result && <div style={{ color: '#6b7280', fontSize: 14, padding: '12px 0' }}>小精灵正在翻任务…</div>}
          {result && (
            <>
              {result.answer && (
                <div
                  style={{
                    margin: '4px 0 10px',
                    padding: 12,
                    borderRadius: 10,
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    color: '#4c1d95',
                    fontSize: 14,
                    lineHeight: 1.6,
                  }}
                >
                  🤖 {result.answer}
                </div>
              )}
              <div style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 8px' }}>
                找到 {result.hits.length} 个任务{busy ? '（正在重新搜索…）' : ''}
              </div>
              {result.hits.length === 0 && (
                <div style={{ color: '#9ca3af', fontSize: 14, padding: '16px 0', textAlign: 'center' }}>
                  没有找到相关的任务，换个说法试试
                </div>
              )}
              {result.hits.map(({ task, reason }) => {
                const color = STATUS_COLOR[task.status] ?? STATUS_COLOR.pending;
                const date = shortDate(task.completedAt || task.startedAt);
                return (
                  <button
                    key={task.id}
                    onClick={() => openTask(task.id)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      border: '1px solid #e5e7eb',
                      background: 'white',
                      borderRadius: 10,
                      padding: '10px 12px',
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15, color: '#111827', fontWeight: 500, flex: 1 }}>{task.title}</span>
                      {task.type && <span style={{ fontSize: 12, color: '#6b7280' }}>{task.type}</span>}
                      {date && <span style={{ fontSize: 12, color: '#9ca3af' }}>{date}</span>}
                      <span
                        style={{
                          fontSize: 12,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: color.bg,
                          color: color.fg,
                        }}
                      >
                        {STATUS_TEXT[task.status] || task.status}
                      </span>
                    </div>
                    {reason && <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{reason}</div>}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div style={{ padding: '10px 20px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={close} style={btn}>
            关闭
          </button>
        </div>
      </div>

      {showAiSettings && (
        <AiSettingsDialog
          onClose={() => {
            setShowAiSettings(false);
            isAiConfigured().then(setAiConfigured);
          }}
        />
      )}
    </div>
  );
};

export default TaskSearchDialog;
