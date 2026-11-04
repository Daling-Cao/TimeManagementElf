import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  OPEN_PLANNER_EVENT,
  createTask,
  newTaskId,
  loadTodayPlan,
  needsPlanningToday,
  readTasks,
  savePlan,
  startTaskNow,
  writeTasks,
  type PlanTask,
} from '../core/dailyPlan';
import { useTomatoStore } from '../core/store/tomatoStore';
import { isAiConfigured, planWithAi, type AiPlanResult } from '../core/ai';
import AiSettingsDialog from './AiSettingsDialog';

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
  // 主窗口原本是隐藏的、专门为规划才弹出来：背景不透出页面，关掉规划后窗口也一起收起。
  const [standalone, setStandalone] = useState(false);
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [planIds, setPlanIds] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // AI 助手
  const hasAiBridge = !!window.aiAPI;
  const [aiConfigured, setAiConfigured] = useState(false);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiAdvice, setAiAdvice] = useState('');
  // 每次发请求、关闭或重新打开窗口都会加一；回复回来时编号对不上就丢弃，
  // 避免过期的回复在窗口关掉后覆盖用户刚保存的安排。
  const aiRequestRef = useRef(0);

  const openPlanner = () => {
    aiRequestRef.current += 1;
    setAiBusy(false);
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
    setAiMessage('');
    setAiError('');
    setAiAdvice('');
    const api = window.appAPI;
    setStandalone(!!api && !api.isMainVisible());
    setOpen(true);
    api?.showMain();
    isAiConfigured().then(setAiConfigured);
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

  // 规划弹窗打开时锁住后面页面的滚动，不露出它的滚动条
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const taskById = new Map(tasks.map((t) => [t.id, t]));
  const planned = planIds
    .map((id) => taskById.get(id))
    .filter((t): t is PlanTask => !!t);
  const backlog = tasks.filter((t) => t.status !== 'completed' && !planIds.includes(t.id));

  const addNewTask = () => {
    const title = newTitle.trim();
    if (!title || aiBusy) return;
    const task = createTask(title);
    const nextTasks = [...readTasks(), task];
    writeTasks(nextTasks);
    setTasks(nextTasks);
    setPlanIds((ids) => [...ids, task.id]);
    setNewTitle('');
    inputRef.current?.focus();
  };

  // 把 AI 给出的安排落到任务列表：已有任务沿用，新任务创建，顺序以 AI 为准。
  const applyAiPlan = (result: AiPlanResult) => {
    const current = readTasks();
    const usedIds = new Set(current.map((t) => t.id));
    const order: string[] = [];
    for (const item of result.items) {
      const existing = current.find(
        (t) => t.id === item.existing_task_id && t.status !== 'completed',
      );
      if (existing) {
        if (!order.includes(existing.id)) order.push(existing.id);
        existing.estimateMinutes = item.minutes;
      } else {
        const task = createTask(item.title, item.minutes);
        // 再保险一次：和已有任务（包括这一批刚建的）撞号就重新生成。
        while (usedIds.has(task.id)) task.id = newTaskId();
        usedIds.add(task.id);
        current.push(task);
        order.push(task.id);
      }
    }
    writeTasks(current);
    setTasks(current);
    setPlanIds(order);
    savePlan(order);
  };

  const askAi = async () => {
    const message = aiMessage.trim();
    if (!message || aiBusy) return;
    const requestId = ++aiRequestRef.current;
    setAiBusy(true);
    setAiError('');
    try {
      const result = await planWithAi(message, planned, backlog);
      if (requestId !== aiRequestRef.current) return; // 窗口已关闭或重开，丢弃过期回复
      applyAiPlan(result);
      setAiAdvice(result.advice);
      setAiMessage('');
    } catch (error) {
      if (requestId !== aiRequestRef.current) return;
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      if (requestId === aiRequestRef.current) setAiBusy(false);
    }
  };

  const totalMinutes = planned.reduce((sum, t) => sum + (t.estimateMinutes || 0), 0);

  const move = (index: number, delta: number) => {
    if (aiBusy) return;
    setPlanIds((ids) => {
      const target = index + delta;
      if (target < 0 || target >= ids.length) return ids;
      const next = [...ids];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const close = () => {
    aiRequestRef.current += 1; // 作废还没返回的 AI 请求
    setAiBusy(false);
    setOpen(false);
    if (standalone) window.appAPI?.hideMain();
  };

  // AI 正在排程时锁住会和它冲突的操作（保存、开始、手动编辑），关闭窗口仍然可以。
  const saveAndClose = () => {
    if (aiBusy) return;
    savePlan(planIds);
    close();
  };

  const removeFromPlan = (taskId: string) => {
    if (aiBusy) return;
    setPlanIds((ids) => ids.filter((id) => id !== taskId));
  };

  const addToPlan = (taskId: string) => {
    if (aiBusy) return;
    setPlanIds((ids) => [...ids, taskId]);
  };

  const start = (taskId: string) => {
    if (aiBusy) return;
    // 选中的任务排到第一位，其余顺序不变。
    const ordered = [taskId, ...planIds.filter((id) => id !== taskId)];
    savePlan(ordered);
    // 开始任务后要看番茄钟，不收起窗口
    if (startTaskNow(taskId, navigate)) setOpen(false);
  };

  // AI 排程进行中：手动编辑区域变灰且不可点击
  const lockedStyle: React.CSSProperties = aiBusy ? { opacity: 0.5, pointerEvents: 'none' } : {};

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
        background: standalone ? '#eef2f7' : 'rgba(17, 24, 39, 0.45)',
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
          {hasAiBridge && (
            <div
              style={{
                margin: '8px 0 4px',
                padding: 12,
                borderRadius: 10,
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <strong style={{ fontSize: 14, color: '#5b21b6', flex: 1 }}>🤖 和小精灵商量</strong>
                <button
                  onClick={() => setShowAiSettings(true)}
                  style={{ ...smallBtn, fontSize: 12, padding: '2px 8px' }}
                >
                  ⚙️ AI 设置
                </button>
              </div>
              {aiConfigured ? (
                <>
                  <textarea
                    value={aiMessage}
                    onChange={(e) => setAiMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        askAi();
                      }
                    }}
                    rows={2}
                    placeholder={
                      planned.length > 0
                        ? '想怎么调整？比如：周报挪到下午，再加一个 30 分钟的复盘'
                        : '说说今天要做什么，比如：写周报、修登录 bug，下午 3 点有个会'
                    }
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '8px 10px',
                      border: '1px solid #c4b5fd',
                      borderRadius: 8,
                      fontSize: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ flex: 1, fontSize: 12, color: '#7c3aed' }}>
                      小精灵会拆分任务、估计时长并排好顺序（Ctrl+Enter 发送）
                    </span>
                    <button
                      onClick={askAi}
                      disabled={aiBusy || !aiMessage.trim()}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        background: aiBusy || !aiMessage.trim() ? '#c4b5fd' : '#7c3aed',
                        color: 'white',
                        cursor: aiBusy ? 'wait' : 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {aiBusy ? '思考中…' : '帮我安排'}
                    </button>
                  </div>
                  {aiError && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#b91c1c' }}>{aiError}</div>
                  )}
                  {aiAdvice && !aiError && (
                    <div style={{ marginTop: 6, fontSize: 13, color: '#4c1d95' }}>💬 {aiAdvice}</div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 13, color: '#6b7280' }}>
                  填写 API key（DeepSeek、OpenAI、Claude 等）后，小精灵可以和你商量今天的安排：拆分任务、估时间、排顺序。
                  <button
                    onClick={() => setShowAiSettings(true)}
                    style={{ ...smallBtn, marginLeft: 6, color: '#7c3aed', borderColor: '#c4b5fd' }}
                  >
                    去设置
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, margin: '8px 0 16px', ...lockedStyle }} aria-busy={aiBusy}>
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
            {totalMinutes > 0 && (
              <span style={{ fontWeight: 'normal', fontSize: 13, color: '#6b7280', marginLeft: 6 }}>
                预计共 {totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)} 小时 ` : ''}
                {totalMinutes % 60 ? `${totalMinutes % 60} 分钟` : ''}
              </span>
            )}
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
            <ol style={{ listStyle: 'none', padding: 0, margin: 0, ...lockedStyle }} aria-busy={aiBusy}>
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
                    {task.estimateMinutes ? (
                      <span style={{ marginLeft: 6, fontSize: 12, color: '#9ca3af' }}>
                        约 {task.estimateMinutes} 分钟
                      </span>
                    ) : null}
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
                    onClick={() => removeFromPlan(task.id)}
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16, ...lockedStyle }}>
                {backlog.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => addToPlan(task.id)}
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
          <button
            onClick={saveAndClose}
            disabled={aiBusy}
            style={{ ...smallBtn, padding: '10px 16px', fontSize: 14, opacity: aiBusy ? 0.5 : 1 }}
          >
            保存安排
          </button>
          <button
            onClick={() => planned[0] && start(planned[0].id)}
            disabled={planned.length === 0 || aiBusy}
            style={{
              padding: '10px 16px',
              fontSize: 14,
              borderRadius: 6,
              border: 'none',
              cursor: planned.length === 0 || aiBusy ? 'not-allowed' : 'pointer',
              background: planned.length === 0 || aiBusy ? '#fca5a5' : '#ef4444',
              color: 'white',
            }}
          >
            开始第一个任务
          </button>
        </div>
      </div>
      {showAiSettings && (
        <AiSettingsDialog
          onClose={(config) => {
            setShowAiSettings(false);
            if (config) setAiConfigured(config.configured);
          }}
        />
      )}
    </div>
  );
};

export default DailyPlanner;
