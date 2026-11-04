import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPEN_PLANNER_EVENT,
  createTask,
  loadTodayPlan,
  needsPlanningToday,
  readTasks,
  savePlan,
  startTaskNow,
  writeTasks,
  type PlanTask,
} from '../core/dailyPlan';
import { useTomatoStore } from '../core/store/tomatoStore';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function formatToday(now: Date): string {
  const week = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
  return `${now.getMonth() + 1} 月 ${now.getDate()} 日 · 星期${week}`;
}

/**
 * 每日规划窗口：每天第一次开机/唤醒时自动弹出，和用户一起定下今天要做的任务和顺序，
 * 然后可以直接选一个任务开始番茄钟。
 */
const DailyPlanner: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const openPlanner = () => {
    const allTasks = readTasks();
    const existing = loadTodayPlan();
    const unfinished = (id: string) =>
      allTasks.some((t) => t.id === id && t.status !== 'completed');
    // 今天已经规划过：继续编辑那份；否则把进行中的任务先放进来，通常是昨天没做完的。
    const initial = existing
      ? existing.taskIds.filter(unfinished)
      : allTasks.filter((t) => t.status === 'in_progress').map((t) => t.id);
    // 弹出即记为“今天已提醒过”，点“稍后再说”后不会在每次解锁时反复打扰。
    savePlan(existing ? existing.taskIds : initial);
    setTasks(allTasks);
    setPlanIds(initial);
    setNewTitle('');
    setOpen(true);
    window.appAPI?.showMain();
  };

  // 用 ref 保存最新的 openPlanner，订阅只需要建立一次。
  const openRef = useRef(openPlanner);
  openRef.current = openPlanner;

  useEffect(() => {
    const check = () => {
      if (!needsPlanningToday()) return;
      // 正在专注时不打断，等番茄钟结束后的下一次检查（每分钟一次）再弹。
      const { isRunning, isPaused } = useTomatoStore.getState();
      if (isRunning || isPaused) return;
      openRef.current();
    };
    const forceOpen = () => openRef.current();

    check(); // 应用启动（含开机自启）
    const offCheck = window.appAPI?.onPlanCheck(check); // 唤醒、解锁、跨天
    const offOpen = window.appAPI?.onPlanOpen(forceOpen); // 小猫菜单「规划今天」
    window.addEventListener(OPEN_PLANNER_EVENT, forceOpen);
    return () => {
      offCheck?.();
      offOpen?.();
      window.removeEventListener(OPEN_PLANNER_EVENT, forceOpen);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const planned = planIds
    .map((id) => taskById.get(id))
    .filter((t): t is PlanTask => !!t);
  const backlog = tasks.filter((t) => t.status !== 'completed' && !planIds.includes(t.id));

  const addNewTask = () => {
    const title = newTitle.trim();
    if (!title) return;
    const task = createTask(title);
    const nextTasks = [...readTasks(), task];
    writeTasks(nextTasks);
    setTasks(nextTasks);
    setPlanIds((ids) => [...ids, task.id]);
    setNewTitle('');
    inputRef.current?.focus();
  };

  const move = (index: number, delta: number) => {
    setPlanIds((ids) => {
      const target = index + delta;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const close = () => setOpen(false);

  const saveAndClose = () => {
    savePlan(planIds);
    close();
  };

  const start = (taskId: string) => {
    // 选中的任务排到第一位，其余顺序不变。
    const ordered = [taskId, ...planIds.filter((id) => id !== taskId)];
    savePlan(ordered);
    if (startTaskNow(taskId, navigate)) close();
  };

  const smallBtn: React.CSSProperties = {
    border: '1px solid #e5e7eb',
    background: 'white',
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: 13,
    color: '#374151',
  };

  const now = new Date();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 24, 39, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-planner-title"
        style={{
          background: 'white',
          borderRadius: 16,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ padding: '20px 24px 12px' }}>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{formatToday(now)}</div>
          <h2 id="daily-planner-title" style={{ margin: '4px 0 0', fontSize: 22, color: '#111827' }}>
            {greeting(now)}！今天打算做些什么？
          </h2>
          <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 14 }}>
            把今天要做的事列出来、排好顺序，然后选一个先开始。每完成一个任务会自动休息 10 分钟。
          </p>
        </div>

        <div style={{ padding: '0 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px' }}>
            <input
              ref={inputRef}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                // 中文输入法组字时按回车是确认候选词，不能当成提交。
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) addNewTask();
              }}
              placeholder="添加一个今天要做的任务，按回车"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 8,
                fontSize: 15,
              }}
            />
            <button
              onClick={addNewTask}
              style={{
                padding: '10px 16px',
                background: '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              添加
            </button>
          </div>

          <h3 style={{ fontSize: 15, color: '#111827', margin: '0 0 8px' }}>
            今天的安排（{planned.length}）
          </h3>
          {planned.length === 0 ? (
            <div
              style={{
                padding: 16,
                border: '1px dashed #d1d5db',
                borderRadius: 8,
                color: '#9ca3af',
                textAlign: 'center',
                fontSize: 14,
              }}
            >
              还没有安排，在上面添加，或从下面的待办里挑选
            </div>
          ) : (
            <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {planned.map((task, index) => (
                <li
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 10px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 6,
                    background: index === 0 ? '#f0f9ff' : 'white',
                  }}
                >
                  <span style={{ width: 20, color: '#6b7280', fontSize: 13 }}>{index + 1}.</span>
                  <span style={{ flex: 1, color: '#111827', fontSize: 15, wordBreak: 'break-all' }}>
                    {task.title}
                    {task.status === 'in_progress' && (
                      <span style={{ marginLeft: 6, fontSize: 12, color: '#f59e0b' }}>进行中</span>
                    )}
                  </span>
                  <button style={smallBtn} onClick={() => move(index, -1)} disabled={index === 0} title="上移">
                    ↑
                  </button>
                  <button
                    style={smallBtn}
                    onClick={() => move(index, 1)}
                    disabled={index === planned.length - 1}
                    title="下移"
                  >
                    ↓
                  </button>
                  <button
                    style={smallBtn}
                    onClick={() => setPlanIds((ids) => ids.filter((id) => id !== task.id))}
                    title="移出今天的安排"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => start(task.id)}
                    style={{ ...smallBtn, background: '#ef4444', color: 'white', border: 'none' }}
                  >
                    ▶ 先做这个
                  </button>
                </li>
              ))}
            </ol>
          )}

          {backlog.length > 0 && (
            <>
              <h3 style={{ fontSize: 15, color: '#111827', margin: '16px 0 8px' }}>待办里的任务</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                {backlog.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setPlanIds((ids) => [...ids, task.id])}
                    style={{ ...smallBtn, borderRadius: 999, padding: '6px 12px' }}
                    title="加入今天的安排"
                  >
                    ＋ {task.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            padding: '16px 24px',
            borderTop: '1px solid #f3f4f6',
          }}
        >
          <button onClick={close} style={{ ...smallBtn, padding: '10px 16px', fontSize: 14 }}>
            稍后再说
          </button>
          <button onClick={saveAndClose} style={{ ...smallBtn, padding: '10px 16px', fontSize: 14 }}>
            保存安排
          </button>
          <button
            onClick={() => planned[0] && start(planned[0].id)}
            disabled={planned.length === 0}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              borderRadius: 6,
              border: 'none',
              cursor: planned.length === 0 ? 'not-allowed' : 'pointer',
              background: planned.length === 0 ? '#fca5a5' : '#ef4444',
              color: 'white',
            }}
          >
            开始第一个任务
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyPlanner;
