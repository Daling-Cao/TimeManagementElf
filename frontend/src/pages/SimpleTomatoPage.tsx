import React, { useState, useEffect } from 'react';

const SimpleTomatoPage: React.FC = () => {
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // 25分钟
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && !isPaused && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isRunning) {
      setIsRunning(false);
      alert('🎉 番茄钟完成！建议休息一下~');
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, timeRemaining]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    setTimeRemaining(selectedDuration * 60);
    setIsRunning(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    if (window.confirm('确定要停止吗？')) {
      setIsRunning(false);
      setIsPaused(false);
      setTimeRemaining(selectedDuration * 60);
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
              <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>首页</a>
              <a href="/tasks" style={{ color: '#6b7280', textDecoration: 'none' }}>任务列表</a>
              <a href="/tomato" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>番茄钟</a>
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
                      onClick={() => {
                        setSelectedDuration(duration);
                        setTimeRemaining(duration * 60);
                      }}
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
                开始专注 🍅
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
    </div>
  );
};

export default SimpleTomatoPage;

