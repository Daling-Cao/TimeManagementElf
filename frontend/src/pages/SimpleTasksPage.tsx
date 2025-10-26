import React, { useState, useEffect } from 'react';
import { useTomatoStore } from '../core/store/tomatoStore';
import FloatingTomatoTimer from '../components/FloatingTomatoTimer';

interface TomatoSummary {
  id: string;
  sessionId: string;
  summary: string;
  timestamp: string;
  duration: number;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: string;
  summaries?: TomatoSummary[];
  totalDuration?: number; // 总时长（分钟）
  completedSessions?: number; // 完成的番茄钟数量
  startedAt?: string; // 任务开始时间
  completedAt?: string; // 任务完成时间
}

const SimpleTasksPage: React.FC = () => {
  const { isRunning } = useTomatoStore();
  
  // 从 localStorage 加载任务
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('tasks');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      {
        id: '1',
        title: '完成项目文档',
        status: 'pending',
        priority: 'high',
        type: '工作',
      },
      {
        id: '2',
        title: '学习 React Hooks',
        status: 'in_progress',
        priority: 'medium',
        type: '学习',
      },
      {
        id: '3',
        title: '整理房间',
        status: 'completed',
        priority: 'low',
        type: '生活',
      },
    ];
  });

  // 过滤出当前活动的任务（排除今天之前完成的任务）
  const activeTasks = tasks.filter(task => {
    if (task.status !== 'completed') return true;
    if (!task.completedAt) return true; // 旧数据没有完成时间，保留显示
    
    const completedDate = new Date(task.completedAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return completedDate >= today; // 只显示今天完成的任务
  });

  const [newTask, setNewTask] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [newTaskPriority, setNewTaskPriority] = useState<Task['priority']>('medium');
  const [newTaskType, setNewTaskType] = useState('工作');
  const [isCustomType, setIsCustomType] = useState(false);
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // 一次性数据迁移：为旧的已完成任务补写 completedAt（优先用最后一条总结的时间）
  useEffect(() => {
    try {
      const migrated = tasks.map(task => {
        if (task.status === 'completed' && !task.completedAt) {
          let completedAt: string | undefined;
          if (task.summaries && task.summaries.length > 0) {
            const last = [...task.summaries]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
            completedAt = last?.timestamp;
          } else {
            completedAt = new Date().toISOString();
          }
          return { ...task, completedAt };
        }
        return task;
      });

      const hasChanges = migrated.some((t, i) => t.completedAt !== tasks[i].completedAt);
      if (hasChanges) {
        setTasks(migrated);
      }
    } catch (err) {
      console.error('迁移任务 completedAt 字段时出错:', err);
    }
  }, []);

  // 保存任务到 localStorage
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const openDialog = () => {
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setNewTask('');
    setNewTaskPriority('medium');
    setNewTaskType('工作');
    setIsCustomType(false);
    setCustomTypeInput('');
  };

  const addTask = () => {
    if (newTask.trim()) {
      const finalType = isCustomType ? customTypeInput.trim() || '其他' : newTaskType;
      const task: Task = {
        id: Date.now().toString(),
        title: newTask,
        status: 'pending',
        priority: newTaskPriority,
        type: finalType,
        summaries: [],
        totalDuration: 0,
        completedSessions: 0,
      };
      setTasks([...tasks, task]);
      closeDialog();
    }
  };

  const startTomato = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      // 如果任务是待办状态，改为进行中
      if (task.status === 'pending') {
        updateTaskStatus(taskId, 'in_progress');
        // 设置任务开始时间
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? { ...t, startedAt: t.startedAt || new Date().toISOString() } : t
        );
        setTasks(updatedTasks);
      }
      // 跳转到番茄钟页面，传递任务ID
      window.location.href = `/tomato?taskId=${taskId}`;
    }
  };

  const viewTaskDetail = (task: Task) => {
    setSelectedTask(task);
    setShowDetailDialog(true);
  };

  const closeDetailDialog = () => {
    setShowDetailDialog(false);
    setSelectedTask(null);
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return `${days}天 ${remainingHours}小时 ${mins}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${mins}分钟`;
    } else {
      return `${mins}分钟`;
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomType(true);
      setNewTaskType('');
    } else {
      setIsCustomType(false);
      setNewTaskType(value);
      setCustomTypeInput('');
    }
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, status };
        // 如果任务标记为完成，记录完成时间
        if (status === 'completed' && !task.completedAt) {
          updatedTask.completedAt = new Date().toISOString();
        }
        // 如果任务从完成改为其他状态，清除完成时间
        if (status !== 'completed' && task.completedAt) {
          updatedTask.completedAt = undefined;
        }
        return updatedTask;
      }
      return task;
    }));
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task && window.confirm(`确定要删除任务「${task.title}」吗？\n\n此操作不可恢复。`)) {
      setTasks(tasks.filter(task => task.id !== id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f9fafb',
      padding: '20px'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 0',
        marginBottom: '32px'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>
              时间管理小精灵
            </h1>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="/" style={{ color: '#4b5563', textDecoration: 'none' }}>首页</a>
              <a href="/tasks" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>任务列表</a>
              <a href="/tomato" style={{ color: '#6b7280', textDecoration: 'none' }}>番茄钟</a>
              <a href="/statistics" style={{ color: '#6b7280', textDecoration: 'none' }}>统计</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          padding: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>
            任务列表
          </h2>

          {/* Add Task Button */}
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={openDialog}
              style={{
                padding: '10px 20px',
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span style={{ fontSize: '18px' }}>+</span>
              添加任务
            </button>
          </div>

          {/* Task List */}
          <div>
            {tasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                还没有任务，创建一个开始吧！
              </div>
            ) : (
              activeTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    backgroundColor: '#fafafa',
                    padding: '12px'
                  }}
                >
                  {/* 第一行：任务基本信息 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={task.status === 'completed'}
                        onChange={(e) => updateTaskStatus(task.id, e.target.checked ? 'completed' : 'pending')}
                        style={{ width: '16px', height: '16px' }}
                      />
                      <span style={{
                        textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                        color: task.status === 'completed' ? '#6b7280' : '#111827',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {task.title}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getStatusColor(task.status) + '20',
                        color: getStatusColor(task.status)
                      }}>
                        {task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: getPriorityColor(task.priority) + '20',
                        color: getPriorityColor(task.priority)
                      }}>
                        {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}优先级
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {task.type}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as Task['status'])}
                        style={{
                          padding: '4px 8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}
                      >
                        <option value="pending">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="completed">已完成</option>
                      </select>
                      <button
                        onClick={() => deleteTask(task.id)}
                        style={{
                          padding: '4px 8px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {/* 第二行：执行时长和操作按钮 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingLeft: '28px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
                      {task.status !== 'pending' && (
                        <>
                          <span>
                            🍅 {task.completedSessions || 0} 个番茄钟
                          </span>
                          <span>
                            ⏱️ 总时长: {formatDuration(task.totalDuration || 0)}
                          </span>
                          {task.summaries && task.summaries.length > 0 && (
                            <span>
                              📝 {task.summaries.length} 条总结
                            </span>
                          )}
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {task.status !== 'completed' && (
                        <button
                          onClick={() => startTomato(task.id)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: task.status === 'in_progress' ? '#10b981' : '#0284c7',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          {task.status === 'in_progress' ? '🍅 继续' : '🍅 开始番茄钟'}
                        </button>
                      )}
                      {task.summaries && task.summaries.length > 0 && (
                        <button
                          onClick={() => viewTaskDetail(task)}
                          style={{
                            padding: '4px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          查看详情
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Task Creation Dialog */}
      {showDialog && (
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
          onClick={closeDialog}
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
              创建新任务
            </h3>

            {/* Task Title */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                任务标题 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
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
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
              />
            </div>

            {/* Priority */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                优先级
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as Task['priority'])}
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

            {/* Task Type */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                任务类型
              </label>
              <select
                value={isCustomType ? 'custom' : newTaskType}
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

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeDialog}
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
                onClick={addTask}
                disabled={!newTask.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: newTask.trim() ? '#0284c7' : '#d1d5db',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: newTask.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                确认创建
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Detail Dialog */}
      {showDetailDialog && selectedTask && (
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
          onClick={closeDetailDialog}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '700px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 2001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  {selectedTask.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: getStatusColor(selectedTask.status) + '20',
                    color: getStatusColor(selectedTask.status)
                  }}>
                    {selectedTask.status === 'completed' ? '已完成' : selectedTask.status === 'in_progress' ? '进行中' : '待办'}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: getPriorityColor(selectedTask.priority) + '20',
                    color: getPriorityColor(selectedTask.priority)
                  }}>
                    {selectedTask.priority === 'high' ? '高' : selectedTask.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {selectedTask.type}
                  </span>
                </div>
              </div>
              <button
                onClick={closeDetailDialog}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '18px',
                  cursor: 'pointer',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* 统计信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>完成番茄钟</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {selectedTask.completedSessions || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>总时长</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {formatDuration(selectedTask.totalDuration || 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>总结记录</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {selectedTask.summaries?.length || 0}
                </div>
              </div>
            </div>

            {/* 总结记录列表 */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                工作总结记录
              </h4>
              {selectedTask.summaries && selectedTask.summaries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...selectedTask.summaries]
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((summary) => (
                      <div
                        key={summary.id}
                        style={{
                          padding: '12px',
                          backgroundColor: summary.completed ? '#f0fdf4' : '#fef3c7',
                          border: `1px solid ${summary.completed ? '#86efac' : '#fcd34d'}`,
                          borderRadius: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {new Date(summary.timestamp).toLocaleString('zh-CN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500',
                              backgroundColor: summary.completed ? '#10b981' : '#f59e0b',
                              color: 'white'
                            }}>
                              {summary.completed ? '✓ 完成' : '中断'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {summary.duration} 分钟
                            </span>
                          </div>
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                          {summary.summary}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280', fontSize: '14px' }}>
                  还没有工作总结记录
                </div>
              )}
            </div>

            {/* 关闭按钮 */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={closeDetailDialog}
                style={{
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
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 浮动番茄钟窗口 */}
      {isRunning && <FloatingTomatoTimer />}
    </div>
  );
};

export default SimpleTasksPage;
