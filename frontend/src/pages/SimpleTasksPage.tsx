import React, { useState } from 'react';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  type: string;
}

const SimpleTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: '1',
      title: '完成项目文档',
      status: 'todo',
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
      status: 'done',
      priority: 'low',
      type: '生活',
    },
  ]);

  const [newTask, setNewTask] = useState('');

  const addTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now().toString(),
        title: newTask,
        status: 'todo',
        priority: 'medium',
        type: '其他',
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
    setTasks(tasks.map(task => 
      task.id === id ? { ...task, status } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return '#10b981';
      case 'in_progress': return '#3b82f6';
      case 'todo': return '#6b7280';
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

          {/* Add Task */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="输入新任务..."
              style={{
                flex: 1,
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px'
              }}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
            />
            <button
              onClick={addTask}
              style={{
                padding: '8px 16px',
                backgroundColor: '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
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
              tasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={(e) => updateTaskStatus(task.id, e.target.checked ? 'done' : 'todo')}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span style={{
                      textDecoration: task.status === 'done' ? 'line-through' : 'none',
                      color: task.status === 'done' ? '#6b7280' : '#111827',
                      fontSize: '14px'
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
                      {task.status === 'done' ? '已完成' : task.status === 'in_progress' ? '进行中' : '待办'}
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
                      <option value="todo">待办</option>
                      <option value="in_progress">进行中</option>
                      <option value="done">已完成</option>
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
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default SimpleTasksPage;
