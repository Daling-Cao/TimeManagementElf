import React from 'react';
import { useTaskStore, useTimerStore } from '../core/store';

const HomePage: React.FC = () => {
  const { getTasksByStatus } = useTaskStore();
  const { currentTask, isRunning, timeRemaining } = useTimerStore();

  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in_progress');
  const completedTasks = getTasksByStatus('done');

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">时间管理小精灵</h1>
            </div>
            <nav className="flex space-x-8">
              <a href="#/tasks">任务列表</a>
              <a href="#/tomato">番茄钟</a>
              <a href="#/settings">设置</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8">
          {/* Left Panel - Task List */}
          <div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">任务概览</h2>
              <div className="space-y-4">
                <div className="stat-card blue">
                  <span className="text-blue-800 font-medium">待办任务</span>
                  <span className="text-blue-600 font-bold">{todoTasks.length}</span>
                </div>
                <div className="stat-card yellow">
                  <span className="text-yellow-800 font-medium">进行中</span>
                  <span className="text-yellow-600 font-bold">{inProgressTasks.length}</span>
                </div>
                <div className="stat-card green">
                  <span className="text-green-800 font-medium">已完成</span>
                  <span className="text-green-600 font-bold">{completedTasks.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Panel - Tomato Timer */}
          <div>
            <div className="card tomato-panel">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">番茄钟</h2>
              {currentTask ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    当前任务: {currentTask.title}
                  </div>
                  <div className="timer-display">
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {isRunning ? '进行中...' : '已暂停'}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="timer-display inactive">
                    25:00
                  </div>
                  <div className="text-sm text-gray-500">
                    选择一个任务开始专注
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Statistics */}
          <div>
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">今日统计</h2>
              <div className="stats-panel">
                <div className="stat-item">
                  <span className="stat-label">专注时长</span>
                  <span className="stat-value">2小时 30分钟</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">完成任务</span>
                  <span className="stat-value">5个</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">番茄钟次数</span>
                  <span className="stat-value">6次</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
