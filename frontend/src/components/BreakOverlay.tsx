import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBreakStore } from '../core/store/breakStore';
import { useTomatoStore } from '../core/store/tomatoStore';
import { nextPlannedTask, startTaskNow, type PlanTask } from '../core/dailyPlan';

// 休息结束后超过这么久才打开应用（例如关机过夜），就不再提示“休息结束”。
const STALE_AFTER_MS = 60 * 60 * 1000;

function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function notify(title: string, body: string) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, tag: 'break' });
  }
}

/**
 * 任务完成后的休息界面：倒计时 10 分钟，结束后提醒并推荐今天规划里的下一个任务。
 * 只订阅 endsAt，倒计时用组件内部状态，避免每秒重绘整个应用。
 */
const BreakOverlay: React.FC = () => {
  const navigate = useNavigate();
  const endsAt = useBreakStore((s) => s.endsAt);
  const finishedTaskTitle = useBreakStore((s) => s.finishedTaskTitle);
  const end = useBreakStore((s) => s.end);
  const [now, setNow] = useState(() => Date.now());
  const [nextTask, setNextTask] = useState<PlanTask | null>(null);

  const finished = endsAt !== null && now >= endsAt;

  // 倒计时
  useEffect(() => {
    if (endsAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  // 休息结束：通知并把主窗口叫出来；很久以前就结束的休息直接清掉。
  useEffect(() => {
    if (endsAt === null || !finished) return;
    if (Date.now() - endsAt > STALE_AFTER_MS) {
      end();
      return;
    }
    const next = nextPlannedTask();
    setNextTask(next);
    notify('☕ 休息结束', next ? `下一个任务：${next.title}` : '可以开始下一个任务了');
    window.appAPI?.showMain();
  }, [endsAt, finished, end]);

  // 休息途中自己开始了番茄钟，就结束休息。
  useEffect(() => {
    return useTomatoStore.subscribe((state, prev) => {
      if (state.isRunning && !prev.isRunning) useBreakStore.getState().end();
    });
  }, []);

  if (endsAt === null) return null;

  const startNext = () => {
    if (nextTask && startTaskNow(nextTask.id, navigate)) return;
    end();
  };

  const button: React.CSSProperties = {
    padding: '10px 18px',
    borderRadius: 8,
    fontSize: 15,
    cursor: 'pointer',
    border: '1px solid #e5e7eb',
    background: 'white',
    color: '#374151',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(6, 78, 59, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1900,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '28px 32px',
          width: '100%',
          maxWidth: 420,
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        }}
      >
        {!finished ? (
          <>
            <div style={{ fontSize: 40 }}>☕</div>
            <h2 style={{ margin: '8px 0 4px', color: '#065f46' }}>休息一下</h2>
            {finishedTaskTitle && (
              <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
                完成了「{finishedTaskTitle}」，干得好！
              </p>
            )}
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: '#047857',
                margin: '16px 0',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatClock(endsAt - now)}
            </div>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 14 }}>
              离开屏幕，起来走走、喝口水、看看远处吧
            </p>
            <button style={button} onClick={end}>
              跳过休息
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40 }}>🔔</div>
            <h2 style={{ margin: '8px 0 4px', color: '#111827' }}>休息结束</h2>
            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: 15 }}>
              {nextTask ? (
                <>
                  下一个任务：<strong style={{ color: '#111827' }}>{nextTask.title}</strong>
                </>
              ) : (
                '今天的安排都完成了，或者还没有安排下一个任务。'
              )}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button style={button} onClick={end}>
                稍后
              </button>
              {nextTask && (
                <button
                  style={{ ...button, background: '#ef4444', color: 'white', border: 'none' }}
                  onClick={startNext}
                >
                  ▶ 开始下一个任务
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BreakOverlay;
