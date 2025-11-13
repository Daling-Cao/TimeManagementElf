import React, { useState } from 'react';
import { useTomatoStore } from '../core/store/tomatoStore';
import { useNavigate } from 'react-router-dom';

const FloatingTomatoTimer: React.FC = () => {
  const { timeRemaining, isPaused, currentTask, pause, resume } = useTomatoStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const navigate = useNavigate();

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleNavigateToTomato = () => {
    navigate('/tomato');
  };

  const handleStop = () => {
    if (window.confirm('确定要停止当前番茄钟吗？')) {
      navigate('/tomato?action=stop');
    }
  };

  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '60px',
          height: '60px',
          backgroundColor: '#ef4444',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          transition: 'transform 0.2s',
          fontSize: '24px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        🍅
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: '280px',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        border: '2px solid #ef4444'
      }}
    >
      {/* 标题栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          🍅 番茄钟运行中
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
            color: '#6b7280'
          }}
          title="最小化"
        >
          ➖
        </button>
      </div>

      {/* 任务名称 */}
      {currentTask && (
        <div style={{
          fontSize: '13px',
          color: '#374151',
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#fef2f2',
          borderRadius: '6px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          <strong>任务：</strong>{currentTask.title}
        </div>
      )}

      {/* 倒计时显示 */}
      <div
        onClick={handleNavigateToTomato}
        style={{
          fontSize: '32px',
          fontWeight: 'bold',
          color: isPaused ? '#f59e0b' : '#ef4444',
          textAlign: 'center',
          marginBottom: '16px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: isPaused ? '#fffbeb' : '#fef2f2',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isPaused ? '#fef3c7' : '#fee2e2'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = isPaused ? '#fffbeb' : '#fef2f2'}
        title="点击返回番茄钟页面"
      >
        ⏱️ {formatTime(timeRemaining)}
      </div>

      {/* 状态提示 */}
      {isPaused && (
        <div style={{
          fontSize: '12px',
          color: '#f59e0b',
          textAlign: 'center',
          marginBottom: '12px',
          fontWeight: '500'
        }}>
          ⏸️ 已暂停
        </div>
      )}

      {/* 控制按钮 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        justifyContent: 'center'
      }}>
        <button
          onClick={isPaused ? resume : pause}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: isPaused ? '#10b981' : '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          {isPaused ? '▶️ 继续' : '⏸️ 暂停'}
        </button>
        <button
          onClick={handleStop}
          style={{
            flex: 1,
            padding: '8px 16px',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          ⏹️ 停止
        </button>
      </div>

      {/* 点击提示 */}
      <div style={{
        fontSize: '11px',
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: '8px'
      }}>
        点击时间返回番茄钟页面
      </div>
    </div>
  );
};

export default FloatingTomatoTimer;

