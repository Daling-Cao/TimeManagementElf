import React, { useEffect, useState } from 'react';
import { useTimerStore } from '../../core/store';
import { Task, CreateTomatoSessionRequest } from '../../core/types';
import { apiService } from '../../core/services/apiService';

interface TomatoTimerProps {
  selectedTask?: Task | null;
  onComplete?: () => void;
  onInterrupt?: () => void;
}

const TomatoTimer: React.FC<TomatoTimerProps> = ({ selectedTask, onComplete, onInterrupt }) => {
  const {
    isRunning,
    isPaused,
    timeRemaining,
    totalTime,
    currentTask,
    config,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    resetTimer,
    updateTimeRemaining,
  } = useTimerStore();

  const [customDuration, setCustomDuration] = useState<number>(config.duration);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // 倒计时逻辑
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        updateTimeRemaining(timeRemaining - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      // 计时结束
      handleComplete();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, timeRemaining]);

  const handleComplete = async () => {
    // 播放提示音（如果启用）
    if (config.soundEnabled) {
      playSound();
    }

    // 保存番茄钟会话
    if (currentTask && sessionStartTime) {
      await saveTomatoSession('completed');
    }
    
    stopTimer();
    setSessionStartTime(null);
    if (onComplete) {
      onComplete();
    }
  };

  const saveTomatoSession = async (status: 'completed' | 'interrupted' | 'cancelled') => {
    if (!currentTask || !sessionStartTime) return;

    const endTime = new Date();
    const actualMinutes = Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 60000);

    const sessionData: CreateTomatoSessionRequest = {
      task_id: currentTask.task_id,
      task_type: currentTask.task_type,
      planned_minutes: totalTime / 60,
      started_at: sessionStartTime.toISOString(),
      ended_at: endTime.toISOString(),
      status,
      actual_minutes: actualMinutes,
    };

    try {
      await apiService.createTomatoSession(sessionData);
      console.log('番茄钟会话已保存');
    } catch (error) {
      console.error('保存番茄钟会话失败:', error);
      // 即使保存失败也不影响用户体验
    }
  };

  const handleStart = () => {
    if (!selectedTask) {
      alert('请先选择一个任务');
      return;
    }
    startTimer(selectedTask, customDuration);
    setSessionStartTime(new Date());
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  const handleStop = async () => {
    if (window.confirm('确定要停止当前番茄钟吗？')) {
      // 保存中断的会话
      if (currentTask && sessionStartTime) {
        await saveTomatoSession('interrupted');
      }
      
      stopTimer();
      setSessionStartTime(null);
      if (onInterrupt) {
        onInterrupt();
      }
    }
  };

  const handleReset = () => {
    resetTimer();
  };

  const playSound = () => {
    // 简单的提示音（可以替换为实际的音频文件）
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSaAzvLRgThRQQo=');
    audio.play().catch(err => console.error('播放提示音失败:', err));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '32px',
      maxWidth: '500px',
      margin: '0 auto'
    }}>
      {/* 计时器显示 */}
      <div style={{
        textAlign: 'center',
        marginBottom: '32px'
      }}>
        <h2 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: isRunning ? '#ef4444' : '#6b7280',
          marginBottom: '16px',
          fontFamily: 'monospace'
        }}>
          {formatTime(timeRemaining)}
        </h2>

        {/* 进度条 */}
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: '100%',
            backgroundColor: isRunning ? '#ef4444' : '#10b981',
            transition: 'width 1s linear'
          }} />
        </div>

        {/* 当前任务 */}
        {currentTask && (
          <div style={{
            padding: '12px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
              当前任务
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
              {currentTask.title}
            </div>
          </div>
        )}
      </div>

      {/* 控制按钮 */}
      {!isRunning && !isPaused ? (
        /* 未开始状态 */
        <div>
          {/* 时长选择 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              选择时长（分钟）
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              {[15, 25, 30, 45, 60].map(duration => (
                <button
                  key={duration}
                  onClick={() => setCustomDuration(duration)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: customDuration === duration ? '#ef4444' : '#f3f4f6',
                    color: customDuration === duration ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  {duration}
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              max="120"
              value={customDuration}
              onChange={(e) => setCustomDuration(parseInt(e.target.value) || config.duration)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              placeholder="自定义时长（分钟）"
            />
          </div>

          <button
            onClick={handleStart}
            disabled={!selectedTask}
            style={{
              width: '100%',
              padding: '16px',
              backgroundColor: selectedTask ? '#ef4444' : '#d1d5db',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: selectedTask ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s'
            }}
          >
            开始专注
          </button>
        </div>
      ) : (
        /* 运行中状态 */
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

          <button
            onClick={handleReset}
            style={{
              padding: '16px 20px',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            重置
          </button>
        </div>
      )}

      {/* 提示信息 */}
      {!selectedTask && !isRunning && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#92400e'
        }}>
          💡 请先在任务列表中选择一个任务，然后开始专注
        </div>
      )}
    </div>
  );
};

export default TomatoTimer;

