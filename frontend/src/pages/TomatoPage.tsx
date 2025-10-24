import React, { useEffect, useState } from 'react';
import { useTaskStore, useTimerStore } from '../core/store';
import { syncService } from '../core/services/syncService';
import { Task } from '../core/types';
import TomatoTimer from '../components/Tomato/TomatoTimer';
import TomatoConfig from '../components/Tomato/TomatoConfig';

const TomatoPage: React.FC = () => {
  const { tasks, setTasks } = useTaskStore();
  const { currentTask, startTimer } = useTimerStore();
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  // 加载任务
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        const loadedTasks = await syncService.getLocalTasks();
        // 只显示未完成的任务
        const activeTasks = loadedTasks.filter(t => t.status !== 'done' && t.status !== 'archived');
        setTasks(activeTasks);
      } catch (err) {
        console.error('加载任务失败:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [setTasks]);

  const handleTaskSelect = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleComplete = async () => {
    // 番茄钟完成
    if (currentTask) {
      alert(`🎉 番茄钟完成！\n\n任务：${currentTask.title}\n\n建议休息一下~`);
      // 这里可以记录番茄钟会话
      // TODO: 调用 API 保存番茄钟会话
    }
  };

  const handleInterrupt = () => {
    // 番茄钟被中断
    console.log('番茄钟被中断');
    // TODO: 记录中断原因
  };

  const selectedTask = tasks.find(t => t.task_id === selectedTaskId);

  // 当选择任务时，自动设置为当前任务（但不启动计时器）
  useEffect(() => {
    if (selectedTask && !currentTask) {
      // 这里只是为了在UI上显示选中的任务
      // 实际启动由TomatoTimer组件处理
    }
  }, [selectedTask, currentTask]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{ color: '#6b7280', fontSize: '16px' }}>加载中...</div>
      </div>
    );
  }

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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>
                🍅 番茄钟
              </h1>
            </div>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>首页</a>
              <a href="/tasks" style={{ color: '#6b7280', textDecoration: 'none' }}>任务列表</a>
              <a href="/tomato" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>番茄钟</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '32px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '32px'
        }}>
          {/* 左侧：计时器 */}
          <div>
            <TomatoTimer
              selectedTask={selectedTask}
              onComplete={handleComplete}
              onInterrupt={handleInterrupt}
            />

            {/* 配置按钮 */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                onClick={() => setShowConfig(!showConfig)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                {showConfig ? '隐藏配置' : '显示配置'}
              </button>
            </div>

            {/* 配置面板 */}
            {showConfig && (
              <div style={{ marginTop: '16px' }}>
                <TomatoConfig />
              </div>
            )}
          </div>

          {/* 右侧：任务列表 */}
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              padding: '20px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '16px'
              }}>
                选择任务
              </h3>

              {tasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px',
                  color: '#6b7280'
                }}>
                  <p style={{ marginBottom: '12px' }}>暂无待办任务</p>
                  <a
                    href="/tasks"
                    style={{
                      color: '#0284c7',
                      textDecoration: 'underline'
                    }}
                  >
                    去创建任务
                  </a>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                  {tasks.map(task => (
                    <div
                      key={task.task_id}
                      onClick={() => handleTaskSelect(task.task_id)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${
                          selectedTaskId === task.task_id ? '#ef4444' :
                          currentTask?.task_id === task.task_id ? '#10b981' :
                          '#e5e7eb'
                        }`,
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedTaskId === task.task_id ? '#fef2f2' : 'white',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '6px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#111827',
                          flex: 1
                        }}>
                          {task.title}
                        </div>
                        {currentTask?.task_id === task.task_id && (
                          <span style={{
                            padding: '2px 8px',
                            backgroundColor: '#10b981',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            进行中
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: task.priority === 'high' ? '#fee2e2' :
                                        task.priority === 'medium' ? '#fef3c7' : '#dbeafe',
                          color: task.priority === 'high' ? '#991b1b' :
                                task.priority === 'medium' ? '#92400e' : '#1e40af'
                        }}>
                          {task.priority === 'high' ? '高' :
                           task.priority === 'medium' ? '中' : '低'}优先级
                        </span>

                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }}>
                          {task.task_type}
                        </span>

                        {task.estimate_minutes && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e'
                          }}>
                            预计 {task.estimate_minutes} 分钟
                          </span>
                        )}
                      </div>

                      {task.stats_sessions_count > 0 && (
                        <div style={{
                          marginTop: '8px',
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          🍅 已完成 {task.stats_sessions_count} 个番茄钟
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 提示信息 */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#1e40af'
            }}>
              <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                💡 使用提示
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>选择一个任务开始专注</li>
                <li>建议每个番茄钟25分钟</li>
                <li>完成后休息5-15分钟</li>
                <li>每4个番茄钟休息15-30分钟</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TomatoPage;

