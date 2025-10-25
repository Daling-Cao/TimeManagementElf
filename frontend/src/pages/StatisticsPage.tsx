import React, { useState, useEffect } from 'react';

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

interface TomatoStats {
  totalSessions: number;
  totalMinutes: number;
  todaySessions: number;
  weekSessions: number;
  averagePerDay: number;
}

interface PriorityStats {
  high: number;
  medium: number;
  low: number;
}

const StatisticsPage: React.FC = () => {
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    completionRate: 0
  });

  const [tomatoStats, setTomatoStats] = useState<TomatoStats>({
    totalSessions: 0,
    totalMinutes: 0,
    todaySessions: 0,
    weekSessions: 0,
    averagePerDay: 0
  });

  const [priorityStats, setPriorityStats] = useState<PriorityStats>({
    high: 0,
    medium: 0,
    low: 0
  });

  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = () => {
    // 从 localStorage 加载任务数据
    const tasksJson = localStorage.getItem('tasks');
    const tasks = tasksJson ? JSON.parse(tasksJson) : [];

    // 计算任务统计
    const completed = tasks.filter((t: any) => t.status === 'completed').length;
    const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
    const pending = tasks.filter((t: any) => t.status === 'pending').length;
    const total = tasks.length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    setTaskStats({
      total,
      completed,
      inProgress,
      pending,
      completionRate
    });

    // 计算优先级统计
    const high = tasks.filter((t: any) => t.priority === 'high').length;
    const medium = tasks.filter((t: any) => t.priority === 'medium').length;
    const low = tasks.filter((t: any) => t.priority === 'low').length;

    setPriorityStats({ high, medium, low });

    // 从 localStorage 加载番茄钟数据
    const tomatoSessionsJson = localStorage.getItem('tomatoSessions');
    const tomatoSessions = tomatoSessionsJson ? JSON.parse(tomatoSessionsJson) : [];

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const todaySessions = tomatoSessions.filter((s: any) => 
      new Date(s.startTime) >= todayStart
    ).length;

    const weekSessions = tomatoSessions.filter((s: any) => 
      new Date(s.startTime) >= weekStart
    ).length;

    const totalMinutes = tomatoSessions.reduce((sum: number, s: any) => 
      sum + (s.duration || 25), 0
    );

    const averagePerDay = weekSessions > 0 ? weekSessions / 7 : 0;

    setTomatoStats({
      totalSessions: tomatoSessions.length,
      totalMinutes,
      todaySessions,
      weekSessions,
      averagePerDay
    });
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    color: string;
    icon: string;
  }> = ({ title, value, subtitle, color, icon }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      borderLeft: `4px solid ${color}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '12px', color: '#9ca3af' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ fontSize: '32px' }}>{icon}</div>
      </div>
    </div>
  );

  const ProgressBar: React.FC<{
    label: string;
    value: number;
    max: number;
    color: string;
  }> = ({ label, value, max, color }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>{label}</span>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
            {value} / {max}
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>
    );
  };

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
              📊 数据统计
            </h1>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="/" style={{ color: '#6b7280', textDecoration: 'none' }}>首页</a>
              <a href="/tasks" style={{ color: '#6b7280', textDecoration: 'none' }}>任务列表</a>
              <a href="/tomato" style={{ color: '#6b7280', textDecoration: 'none' }}>番茄钟</a>
              <a href="/statistics" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>统计</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '32px 16px' }}>
        {/* Period Selector */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['today', 'week', 'month', 'all'] as const).map(period => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: selectedPeriod === period ? '#0284c7' : 'white',
                  color: selectedPeriod === period ? 'white' : '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {period === 'today' && '今天'}
                {period === 'week' && '本周'}
                {period === 'month' && '本月'}
                {period === 'all' && '全部'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <StatCard
            title="总任务数"
            value={taskStats.total}
            subtitle="所有任务"
            color="#0284c7"
            icon="📋"
          />
          <StatCard
            title="已完成"
            value={taskStats.completed}
            subtitle={`完成率 ${taskStats.completionRate.toFixed(1)}%`}
            color="#10b981"
            icon="✅"
          />
          <StatCard
            title="番茄钟会话"
            value={tomatoStats.totalSessions}
            subtitle={`共 ${tomatoStats.totalMinutes} 分钟`}
            color="#ef4444"
            icon="🍅"
          />
          <StatCard
            title="今日专注"
            value={tomatoStats.todaySessions}
            subtitle={`本周 ${tomatoStats.weekSessions} 次`}
            color="#f59e0b"
            icon="🔥"
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          {/* Task Status Distribution */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              任务状态分布
            </h2>
            <ProgressBar
              label="已完成"
              value={taskStats.completed}
              max={taskStats.total}
              color="#10b981"
            />
            <ProgressBar
              label="进行中"
              value={taskStats.inProgress}
              max={taskStats.total}
              color="#f59e0b"
            />
            <ProgressBar
              label="待办"
              value={taskStats.pending}
              max={taskStats.total}
              color="#6b7280"
            />
          </div>

          {/* Priority Distribution */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              优先级分布
            </h2>
            <ProgressBar
              label="高优先级"
              value={priorityStats.high}
              max={taskStats.total}
              color="#ef4444"
            />
            <ProgressBar
              label="中优先级"
              value={priorityStats.medium}
              max={taskStats.total}
              color="#f59e0b"
            />
            <ProgressBar
              label="低优先级"
              value={priorityStats.low}
              max={taskStats.total}
              color="#10b981"
            />
          </div>

          {/* Tomato Clock Stats */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              番茄钟统计
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#991b1b' }}>总会话数</span>
                <span style={{ fontWeight: '600', color: '#991b1b' }}>
                  {tomatoStats.totalSessions} 次
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#991b1b' }}>总专注时长</span>
                <span style={{ fontWeight: '600', color: '#991b1b' }}>
                  {Math.floor(tomatoStats.totalMinutes / 60)}h {tomatoStats.totalMinutes % 60}m
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px',
                backgroundColor: '#fef2f2',
                borderRadius: '8px'
              }}>
                <span style={{ color: '#991b1b' }}>日均会话</span>
                <span style={{ fontWeight: '600', color: '#991b1b' }}>
                  {tomatoStats.averagePerDay.toFixed(1)} 次
                </span>
              </div>
            </div>
          </div>

          {/* Productivity Insights */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '24px', color: '#111827' }}>
              生产力洞察
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                padding: '16px',
                backgroundColor: '#eff6ff',
                borderRadius: '8px',
                borderLeft: '4px solid #0284c7'
              }}>
                <div style={{ fontSize: '14px', color: '#1e40af', marginBottom: '4px' }}>
                  💡 任务完成率
                </div>
                <div style={{ fontSize: '12px', color: '#3b82f6' }}>
                  {taskStats.completionRate >= 70 
                    ? '很棒！保持这个节奏！' 
                    : taskStats.completionRate >= 40
                    ? '不错，继续努力！'
                    : '加油！一步一个脚印。'}
                </div>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#fef3c7',
                borderRadius: '8px',
                borderLeft: '4px solid #f59e0b'
              }}>
                <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
                  🔥 专注时长
                </div>
                <div style={{ fontSize: '12px', color: '#d97706' }}>
                  {tomatoStats.todaySessions >= 4
                    ? '今天专注力爆棚！'
                    : tomatoStats.todaySessions >= 2
                    ? '保持专注，再接再厉！'
                    : '开始你的第一个番茄钟吧！'}
                </div>
              </div>
              <div style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                borderRadius: '8px',
                borderLeft: '4px solid #10b981'
              }}>
                <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '4px' }}>
                  ✨ 建议
                </div>
                <div style={{ fontSize: '12px', color: '#059669' }}>
                  {taskStats.inProgress > 3
                    ? '专注完成进行中的任务，避免多任务切换'
                    : priorityStats.high > 0
                    ? '优先处理高优先级任务'
                    : '制定清晰的任务计划，提高效率'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StatisticsPage;

