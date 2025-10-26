import React, { useState, useEffect } from 'react';
import { useTomatoStore } from '../core/store/tomatoStore';
import FloatingTomatoTimer from '../components/FloatingTomatoTimer';

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

interface TaskDetailStats {
  name: string;
  status: string;
  sessions: number;
  duration: number;
  summaries: number;
  type: string;
}

interface TypeStats {
  type: string;
  count: number;
  completed: number;
  sessions: number;
  duration: number;
  avgDuration: number;
}

const StatisticsPage: React.FC = () => {
  const { isRunning } = useTomatoStore();
  
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

  const [taskDetailStats, setTaskDetailStats] = useState<TaskDetailStats[]>([]);
  const [typeStats, setTypeStats] = useState<TypeStats[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [sortBy, setSortBy] = useState<'name' | 'duration' | 'sessions'>('duration');
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [selectedHistoryTask, setSelectedHistoryTask] = useState<any | null>(null);

  useEffect(() => {
    loadStatistics();
  }, [selectedPeriod]);

  const loadStatistics = () => {
    // 从 localStorage 加载任务数据
    const tasksJson = localStorage.getItem('tasks');
    const allTasks = tasksJson ? JSON.parse(tasksJson) : [];

    // 根据选择的时间段过滤任务
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let tasks = allTasks;
    if (selectedPeriod === 'today') {
      // 今天：排除今天之前完成的任务
      tasks = allTasks.filter((t: any) => {
        if (t.status !== 'completed') return true;
        if (!t.completedAt) return true;
        return new Date(t.completedAt) >= todayStart;
      });
    } else if (selectedPeriod === 'week') {
      // 本周：排除本周之前完成的任务
      tasks = allTasks.filter((t: any) => {
        if (t.status !== 'completed') return true;
        if (!t.completedAt) return true;
        return new Date(t.completedAt) >= weekStart;
      });
    } else if (selectedPeriod === 'month') {
      // 本月：排除本月之前完成的任务
      tasks = allTasks.filter((t: any) => {
        if (t.status !== 'completed') return true;
        if (!t.completedAt) return true;
        return new Date(t.completedAt) >= monthStart;
      });
    }
    // 'all' 显示所有任务

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

    // 计算按任务名称统计
    const taskDetails: TaskDetailStats[] = tasks.map((task: any) => ({
      name: task.title,
      status: task.status,
      sessions: task.completedSessions || 0,
      duration: task.totalDuration || 0,
      summaries: task.summaries?.length || 0,
      type: task.type || '其他'
    }));
    setTaskDetailStats(taskDetails);

    // 计算按类型统计
    const typeStatsMap: Record<string, any> = {};
    tasks.forEach((task: any) => {
      const type = task.type || '其他';
      if (!typeStatsMap[type]) {
        typeStatsMap[type] = { count: 0, completed: 0, sessions: 0, duration: 0 };
      }
      typeStatsMap[type].count++;
      if (task.status === 'completed') typeStatsMap[type].completed++;
      typeStatsMap[type].sessions += task.completedSessions || 0;
      typeStatsMap[type].duration += task.totalDuration || 0;
    });

    const typeStatsArray: TypeStats[] = Object.entries(typeStatsMap).map(([type, stats]) => ({
      type,
      count: stats.count,
      completed: stats.completed,
      sessions: stats.sessions,
      duration: stats.duration,
      avgDuration: stats.count > 0 ? Math.round(stats.duration / stats.count) : 0
    }));
    setTypeStats(typeStatsArray);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'pending': return '待办';
      default: return status;
    }
  };

  const sortedTaskDetails = [...taskDetailStats].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'duration') return b.duration - a.duration;
    if (sortBy === 'sessions') return b.sessions - a.sessions;
    return 0;
  });

  // 加载历史任务（今天之前完成的任务）
  const loadHistoryTasks = () => {
    const tasksJson = localStorage.getItem('tasks');
    const allTasks = tasksJson ? JSON.parse(tasksJson) : [];
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const history = allTasks.filter((t: any) => {
      if (t.status !== 'completed') return false;
      if (!t.completedAt) return false;
      return new Date(t.completedAt) < todayStart;
    }).sort((a: any, b: any) => {
      // 按完成时间倒序排列
      return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
    });
    
    setHistoryTasks(history);
    setShowHistoryDialog(true);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

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
        {/* Period Selector and History Button */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          <button
            onClick={loadHistoryTasks}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            📜 查看历史任务
          </button>
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

        {/* 按任务名称统计表格 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>
              按任务统计
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setSortBy('name')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: sortBy === 'name' ? '#0284c7' : '#f3f4f6',
                  color: sortBy === 'name' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                按名称
              </button>
              <button
                onClick={() => setSortBy('duration')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: sortBy === 'duration' ? '#0284c7' : '#f3f4f6',
                  color: sortBy === 'duration' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                按时长
              </button>
              <button
                onClick={() => setSortBy('sessions')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: sortBy === 'sessions' ? '#0284c7' : '#f3f4f6',
                  color: sortBy === 'sessions' ? 'white' : '#374151',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                按番茄钟数
              </button>
            </div>
          </div>

          {sortedTaskDetails.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>任务名称</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>状态</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>类型</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>番茄钟</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>总时长</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>总结数</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTaskDetails.map((task, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    >
                      <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{task.name}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: getStatusColor(task.status) + '20',
                          color: getStatusColor(task.status)
                        }}>
                          {getStatusText(task.status)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>{task.type}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{task.sessions}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{formatDuration(task.duration)}</td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>{task.summaries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              还没有任务数据
            </div>
          )}
        </div>

        {/* 按任务类型统计表格 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          marginTop: '24px'
        }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#111827' }}>
            按类型统计
          </h2>

          {typeStats.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>任务类型</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>任务数</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>已完成</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>完成率</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>番茄钟数</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>总时长</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>平均时长</th>
                  </tr>
                </thead>
                <tbody>
                  {typeStats.map((stat, index) => {
                    const completionRate = stat.count > 0 ? (stat.completed / stat.count * 100).toFixed(1) : '0';
                    return (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{stat.type}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827' }}>{stat.count}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#10b981', fontWeight: '500' }}>{stat.completed}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            <div style={{
                              width: '60px',
                              height: '6px',
                              backgroundColor: '#e5e7eb',
                              borderRadius: '3px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${completionRate}%`,
                                height: '100%',
                                backgroundColor: '#10b981',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '40px' }}>{completionRate}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{stat.sessions}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{formatDuration(stat.duration)}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>{formatDuration(stat.avgDuration)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
              还没有任务数据
            </div>
          )}
        </div>
      </main>

      {/* 历史任务对话框 */}
      {showHistoryDialog && (
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
          onClick={() => setShowHistoryDialog(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              zIndex: 2001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', margin: 0 }}>
                📜 历史任务（已完成）
              </h3>
              <button
                onClick={() => setShowHistoryDialog(false)}
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

            {historyTasks.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>任务名称</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>完成时间</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>类型</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>优先级</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>番茄钟</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>总时长</th>
                      <th style={{ padding: '12px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyTasks.map((task: any, index: number) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: '1px solid #e5e7eb',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <td style={{ padding: '12px', fontSize: '14px', color: '#111827' }}>{task.title}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                          {new Date(task.completedAt).toLocaleString('zh-CN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>{task.type}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            backgroundColor: getPriorityColor(task.priority) + '20',
                            color: getPriorityColor(task.priority)
                          }}>
                            {task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{task.completedSessions || 0}</td>
                        <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#111827', fontWeight: '500' }}>{formatDuration(task.totalDuration || 0)}</td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedHistoryTask(task)}
                            style={{
                              padding: '4px 12px',
                              backgroundColor: '#0284c7',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            查看详情
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#6b7280' }}>
                没有历史任务记录
              </div>
            )}
          </div>
        </div>
      )}

      {/* 历史任务详情对话框 */}
      {selectedHistoryTask && (
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
            zIndex: 3000
          }}
          onClick={() => setSelectedHistoryTask(null)}
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
              zIndex: 3001
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                  {selectedHistoryTask.title}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: '#10b98120',
                    color: '#10b981'
                  }}>
                    已完成
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: getPriorityColor(selectedHistoryTask.priority) + '20',
                    color: getPriorityColor(selectedHistoryTask.priority)
                  }}>
                    {selectedHistoryTask.priority === 'high' ? '高' : selectedHistoryTask.priority === 'medium' ? '中' : '低'}优先级
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    {selectedHistoryTask.type}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedHistoryTask(null)}
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

            {/* 完成时间 */}
            <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #86efac' }}>
              <div style={{ fontSize: '12px', color: '#065f46', marginBottom: '4px' }}>完成时间</div>
              <div style={{ fontSize: '14px', color: '#047857', fontWeight: '500' }}>
                {new Date(selectedHistoryTask.completedAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>

            {/* 统计信息 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>完成番茄钟</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {selectedHistoryTask.completedSessions || 0}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>总时长</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {formatDuration(selectedHistoryTask.totalDuration || 0)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>总结记录</div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                  {selectedHistoryTask.summaries?.length || 0}
                </div>
              </div>
            </div>

            {/* 总结记录列表 */}
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                工作总结记录
              </h4>
              {selectedHistoryTask.summaries && selectedHistoryTask.summaries.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {[...selectedHistoryTask.summaries]
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((summary: any) => (
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
                onClick={() => setSelectedHistoryTask(null)}
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

export default StatisticsPage;

