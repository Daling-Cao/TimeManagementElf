import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../core/store';
import { Task } from '../core/types';
import TaskList from '../components/TaskList';

const TasksPage: React.FC = () => {
  const { tasks, addTask, updateTask, deleteTask, setTasks } = useTaskStore();
  const [loading, setLoading] = useState(true);

  // 模拟从 API 加载数据
  useEffect(() => {
    const loadTasks = async () => {
      try {
        // 这里将来会从 API 加载数据
        // 现在使用模拟数据
        const mockTasks: Task[] = [
          {
            task_id: '1',
            user_id: 'user1',
            title: '完成项目文档',
            task_type: '工作',
            priority: 'high',
            tags: ['文档', '项目'],
            estimate_minutes: 120,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'todo',
            stats_focus_minutes: 0,
            version: 1,
            stats_actual_minutes: 0,
            stats_sessions_count: 0,
            summary: '需要完成项目的技术文档和用户手册',
          },
          {
            task_id: '2',
            user_id: 'user1',
            title: '学习 React Hooks',
            task_type: '学习',
            priority: 'medium',
            tags: ['React', '前端'],
            estimate_minutes: 90,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'in_progress',
            stats_focus_minutes: 30,
            version: 1,
            stats_actual_minutes: 30,
            stats_sessions_count: 1,
            summary: '深入学习 React Hooks 的使用方法',
          },
          {
            task_id: '3',
            user_id: 'user1',
            title: '整理房间',
            task_type: '生活',
            priority: 'low',
            tags: ['家务'],
            estimate_minutes: 60,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: 'done',
            completed_at: new Date().toISOString(),
            stats_focus_minutes: 60,
            version: 1,
            stats_actual_minutes: 60,
            stats_sessions_count: 1,
            summary: '整理房间，清理不需要的物品',
          },
        ];
        
        setTasks(mockTasks);
      } catch (error) {
        console.error('Failed to load tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [setTasks]);

  const handleTaskCreate = (taskData: Omit<Task, 'task_id' | 'created_at' | 'updated_at' | 'version'>) => {
    const newTask: Task = {
      ...taskData,
      task_id: Date.now().toString(),
      user_id: 'user1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: 1,
      stats_focus_minutes: 0,
      stats_actual_minutes: 0,
      stats_sessions_count: 0,
    };
    addTask(newTask);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, {
      ...updates,
      updated_at: new Date().toISOString(),
    });
  };

  const handleTaskDelete = (taskId: string) => {
    if (window.confirm('确定要删除这个任务吗？')) {
      deleteTask(taskId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">加载中...</div>
      </div>
    );
  }

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
              <a href="/" className="text-gray-600 hover:text-primary-600">首页</a>
              <a href="/tasks" className="text-primary-600 font-medium">任务列表</a>
              <a href="/tomato" className="text-gray-600 hover:text-primary-600">番茄钟</a>
              <a href="/settings" className="text-gray-600 hover:text-primary-600">设置</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <TaskList
          tasks={tasks}
          onTaskCreate={handleTaskCreate}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
        />
      </main>
    </div>
  );
};

export default TasksPage;
