import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTomatoStore } from '../core/store/tomatoStore';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: string;
  summaries?: unknown[];
  totalDuration?: number;
  completedSessions?: number;
  startedAt?: string;
  completedAt?: string;
}

const SimpleTomatoPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // 使用全局状态
  const {
    timeRemaining,
    isRunning,
    isPaused,
    selectedDuration,
    sessionStartTime,
    currentTask,
    start,
    pause,
    resume,
    stop,
    setCurrentTask,
    setSelectedDuration
  } = useTomatoStore();

  // 本地状态（仅用于总结对话框）
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summary, setSummary] = useState('');
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // 快速任务创建相关状态
  const [showQuickTaskForm, setShowQuickTaskForm] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskPriority, setQuickTaskPriority] = useState<Task['priority']>('medium');
  const [quickTaskType, setQuickTaskType] = useState('工作');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');

  // 从 Hash 路由的查询参数加载任务和处理 action
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const action = searchParams.get('action');
    
    if (taskId) {
      const tasksJson = localStorage.getItem('tasks');
      if (tasksJson) {
        const tasks: Task[] = JSON.parse(tasksJson);
        const task = tasks.find(t => t.id === taskId);
        if (task) {
          setCurrentTask(task);
        }
      }
    }
    
    // 处理停止操作
    if (action === 'stop') {
      if (isRunning || isPaused) {
        stop();
        setSessionCompleted(false);
        setShowSummaryDialog(true);
      }
      navigate('/tomato', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // 请求通知权限
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // 监听番茄钟完成事件
  useEffect(() => {
    if (timeRemaining === 0 && !isRunning && sessionStartTime) {
      // 番茄钟完成，显示总结对话框
      setSessionCompleted(true);
      setShowSummaryDialog(true);
    }
  }, [timeRemaining, isRunning, sessionStartTime]);

  // 清除 currentTask 的逻辑：当总结对话框显示且计时器已停止时清除
  useEffect(() => {
    if (showSummaryDialog && !isRunning && !isPaused) {
      // 延迟清除，确保 handleSaveSummary 能获取到 currentTask
      const timer = setTimeout(() => {
        setCurrentTask(null);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showSummaryDialog, isRunning, isPaused, setCurrentTask]);

  const saveTomatoSession = (completed: boolean, summaryText: string, taskRef?: Task | null) => {
    if (!sessionStartTime) return;

    const endTime = new Date();
    const startTime = new Date(sessionStartTime); // 从字符串转换为 Date
    
    // 计算实际工作时长（分钟）
    const actualDurationMs = endTime.getTime() - startTime.getTime();
    const actualDurationMinutes = Math.round(actualDurationMs / 1000 / 60);

    // 使用传入的 taskRef 或 currentTask
    const task = taskRef || currentTask;

    const sessionId = Date.now().toString();
    const session = {
      id: sessionId,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: actualDurationMinutes, // 使用实际时长
      plannedDuration: selectedDuration, // 保存计划时长
      completed,
      taskId: task?.id || null,
      summary: summaryText
    };

    // 保存到番茄钟会话记录
    const sessionsJson = localStorage.getItem('tomatoSessions');
    const sessions = sessionsJson ? JSON.parse(sessionsJson) : [];
    sessions.push(session);
    localStorage.setItem('tomatoSessions', JSON.stringify(sessions));

    // 如果有关联任务，更新任务的总结记录
    if (task) {
      const tasksJson = localStorage.getItem('tasks');
      if (tasksJson) {
        const tasks: Task[] = JSON.parse(tasksJson);
        const taskIndex = tasks.findIndex(t => t.id === task.id);
        
        if (taskIndex !== -1) {
          const taskToUpdate = tasks[taskIndex];
          const newSummary = {
            id: Date.now().toString(),
            sessionId: sessionId,
            summary: summaryText,
            timestamp: new Date().toISOString(),
            duration: actualDurationMinutes, // 使用实际时长
            completed: completed
          };

          tasks[taskIndex] = {
            ...taskToUpdate,
            summaries: [...(taskToUpdate.summaries || []), newSummary],
            totalDuration: (taskToUpdate.totalDuration || 0) + actualDurationMinutes, // 累加实际时长
            completedSessions: (taskToUpdate.completedSessions || 0) + (completed ? 1 : 0)
          };

          localStorage.setItem('tasks', JSON.stringify(tasks));
          // 只有在 currentTask 还存在时才更新它
          if (currentTask && currentTask.id === task.id) {
            setCurrentTask(tasks[taskIndex]);
          }
        }
      }
    }
  };

  const handleSaveSummary = (taskCompleted: boolean) => {
    // 在清除 currentTask 之前保存任务引用
    const taskToSave = currentTask;
    
    saveTomatoSession(sessionCompleted, summary, taskToSave);
    
    // 如果任务完成，更新任务状态
    if (taskCompleted && taskToSave) {
      const tasksJson = localStorage.getItem('tasks');
      if (tasksJson) {
        const tasks: Task[] = JSON.parse(tasksJson);
        const taskIndex = tasks.findIndex(t => t.id === taskToSave.id);
        
        if (taskIndex !== -1) {
          tasks[taskIndex].status = 'completed';
          tasks[taskIndex].completedAt = new Date().toISOString();
          localStorage.setItem('tasks', JSON.stringify(tasks));
        }
      }
      // 返回任务列表
      navigate('/tasks');
    } else {
      // 重置状态，准备下一个番茄钟
      setShowSummaryDialog(false);
      setSummary('');
      setSessionCompleted(false);
      // 如果有关联任务，导航回任务列表以刷新显示
      if (taskToSave) {
        navigate('/tasks');
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    // 双重检查：确保不会在已有计时时启动新的
    if (isRunning || isPaused) {
      alert('已有番茄钟正在运行或暂停中，请先完成当前番茄钟。');
      return;
    }
    
    // 如果没有选择任务，显示快速任务创建表单
    if (!currentTask) {
      setShowQuickTaskForm(true);
      return;
    }
    
    start(selectedDuration, currentTask);
  };

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomType(true);
      setQuickTaskType('');
    } else {
      setIsCustomType(false);
      setQuickTaskType(value);
      setCustomTypeInput('');
    }
  };

  const handleCreateQuickTask = () => {
    if (!quickTaskTitle.trim()) {
      alert('请输入任务标题');
      return;
    }

    const finalType = isCustomType ? customTypeInput.trim() || '其他' : quickTaskType;
    
    // 创建新任务
    const newTask: Task = {
      id: Date.now().toString(),
      title: quickTaskTitle.trim(),
      status: 'in_progress',
      priority: quickTaskPriority,
      type: finalType,
      summaries: [],
      totalDuration: 0,
      completedSessions: 0,
      startedAt: new Date().toISOString()
    };

    // 保存到 localStorage
    const tasksJson = localStorage.getItem('tasks');
    const tasks: Task[] = tasksJson ? JSON.parse(tasksJson) : [];
    tasks.push(newTask);
    localStorage.setItem('tasks', JSON.stringify(tasks));

    // 设置为当前任务并开始番茄钟
    setCurrentTask(newTask);
    setShowQuickTaskForm(false);
    setQuickTaskTitle('');
    setQuickTaskPriority('medium');
    setQuickTaskType('工作');
    setIsCustomType(false);
    setCustomTypeInput('');
    
    // 开始番茄钟
    start(selectedDuration, newTask);
  };

  const handlePause = () => {
    pause();
  };

  const handleResume = () => {
    resume();
  };

  const handleStop = () => {
    if (window.confirm('确定要停止吗？')) {
      stop();
      setSessionCompleted(false);
      setShowSummaryDialog(true);
    }
  };

  const progressPercentage = selectedDuration > 0 
    ? ((selectedDuration * 60 - timeRemaining) / (selectedDuration * 60)) * 100 
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '64px'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7', margin: 0 }}>
              🍅 番茄钟
            </h1>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="#/" style={{ color: '#6b7280', textDecoration: 'none' }}>首页</a>
              <a href="#/tasks" style={{ color: '#6b7280', textDecoration: 'none' }}>任务列表</a>
              <a href="#/tomato" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>番茄钟</a>
              <a href="#/statistics" style={{ color: '#6b7280', textDecoration: 'none' }}>统计</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          padding: '32px'
        }}>
          {/* 当前任务显示 */}
          {currentTask && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe'
            }}>
              <div style={{ fontSize: '12px', color: '#3b82f6', marginBottom: '4px' }}>
                当前任务
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e40af' }}>
                {currentTask.title}
              </div>
            </div>
          )}

          {/* Timer Display */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{
              fontSize: '64px',
              fontWeight: 'bold',
              color: isRunning ? '#ef4444' : '#6b7280',
              marginBottom: '16px',
              fontFamily: 'monospace'
            }}>
              {formatTime(timeRemaining)}
            </h2>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              <div style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: isRunning ? '#ef4444' : '#10b981',
                transition: 'width 1s linear'
              }} />
            </div>
          </div>

          {/* Controls */}
          {!isRunning && !isPaused ? (
            <div>
              {/* Duration Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  选择时长（分钟）
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[15, 25, 30, 45, 60].map(duration => (
                    <button
                      key={duration}
                      onClick={() => setSelectedDuration(duration)}
                      style={{
                        flex: '1',
                        minWidth: '60px',
                        padding: '12px',
                        backgroundColor: selectedDuration === duration ? '#ef4444' : '#f3f4f6',
                        color: selectedDuration === duration ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleStart}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {currentTask ? '开始专注 🍅' : '创建任务并开始 🍅'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px' }}>
              {isPaused ? (
                <button
                  onClick={handleResume}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  继续
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  style={{
                    flex: 1,
                    padding: '16px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  暂停
                </button>
              )}
              
              <button
                onClick={handleStop}
                style={{
                  flex: 1,
                  padding: '16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                停止
              </button>
            </div>
          )}

          {/* Tips */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            fontSize: '14px',
            color: '#1e40af'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 番茄工作法</div>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>专注工作25分钟</li>
              <li>休息5分钟</li>
              <li>4个番茄钟后休息15-30分钟</li>
            </ul>
          </div>
        </div>
      </main>

      {/* 总结对话框 */}
      {showSummaryDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 2001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              {sessionCompleted ? '🎉 番茄钟完成！' : '⏸️ 番茄钟中断'}
            </h3>

            {/* 显示实际工作时长 */}
            {sessionStartTime && (
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '12px',
                padding: '8px 12px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px'
              }}>
                实际工作时长: <strong style={{ color: '#111827' }}>
                  {Math.round((new Date().getTime() - new Date(sessionStartTime).getTime()) / 1000 / 60)} 分钟
                </strong>
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
              {sessionCompleted 
                ? '恭喜完成一个番茄钟！请写下这段时间的工作总结。'
                : '番茄钟已中断，请简单记录一下工作内容。'}
            </p>

            {/* 总结输入 */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                工作总结
              </label>
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="请输入本次工作的总结..."
                autoFocus
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* 任务完成询问 */}
            {currentTask && currentTask.status !== 'completed' && (
              <div style={{
                marginBottom: '20px',
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                border: '1px solid #fcd34d'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '500', color: '#92400e', marginBottom: '8px' }}>
                  任务状态
                </div>
                <div style={{ fontSize: '14px', color: '#78350f' }}>
                  任务「{currentTask.title}」是否已完成？
                </div>
              </div>
            )}

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: '12px' }}>
              {currentTask && currentTask.status !== 'completed' ? (
                <>
                  <button
                    onClick={() => handleSaveSummary(false)}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    任务未完成
                  </button>
                  <button
                    onClick={() => handleSaveSummary(true)}
                    style={{
                      flex: 1,
                      padding: '10px 20px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    任务已完成
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleSaveSummary(false)}
                  style={{
                    width: '100%',
                    padding: '10px 20px',
                    backgroundColor: '#0284c7',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  保存总结
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 快速任务创建对话框 */}
      {showQuickTaskForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowQuickTaskForm(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 2001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
              快速创建任务
            </h3>

            {/* 任务标题 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                任务标题 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="请输入任务标题..."
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing || e.key === 'Process') return;
                  if (e.key === 'Enter') handleCreateQuickTask();
                }}
              />
            </div>

            {/* 优先级 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                优先级
              </label>
              <select
                value={quickTaskPriority}
                onChange={(e) => setQuickTaskPriority(e.target.value as Task['priority'])}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
              </select>
            </div>

            {/* 任务类型 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                任务类型
              </label>
              <select
                value={isCustomType ? 'custom' : quickTaskType}
                onChange={(e) => handleTypeChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  cursor: 'pointer'
                }}
              >
                <option value="工作">工作</option>
                <option value="学习">学习</option>
                <option value="生活">生活</option>
                <option value="运动">运动</option>
                <option value="娱乐">娱乐</option>
                <option value="其他">其他</option>
                <option value="custom">自定义...</option>
              </select>
              
              {isCustomType && (
                <input
                  type="text"
                  value={customTypeInput}
                  onChange={(e) => setCustomTypeInput(e.target.value)}
                  placeholder="请输入自定义类型..."
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    marginTop: '8px'
                  }}
                />
              )}
            </div>

            {/* 按钮 */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowQuickTaskForm(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleCreateQuickTask}
                disabled={!quickTaskTitle.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: quickTaskTitle.trim() ? '#ef4444' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: quickTaskTitle.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                创建并开始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleTomatoPage;

