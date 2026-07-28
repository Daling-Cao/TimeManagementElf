import React, { useEffect, useState } from 'react';
import { useTaskStore } from '../core/store';
import type { Task, CreateTaskRequest, SyncStatus } from '../core/types';
import { syncService } from '../core/services/syncService';
import TaskList from '../components/TaskList';

const TasksPage: React.FC = () => {
  const { tasks, setTasks } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  // 加载任务数据
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // 从同步服务加载任务（优先从本地，然后从服务器同步）
        const loadedTasks = await syncService.syncTasks();
        setTasks(loadedTasks);
        
        // 获取同步状态
        const status = await syncService.getSyncStatus();
        setSyncStatus(status);
      } catch (err) {
        console.error('加载任务失败:', err);
        setError('加载任务失败，请稍后重试');
        
        // 尝试从本地加载
        try {
          const localTasks = await syncService.getLocalTasks();
          setTasks(localTasks);
        } catch (localErr) {
          console.error('从本地加载任务也失败:', localErr);
        }
      } finally {
        setLoading(false);
      }
    };

    loadTasks();
  }, [setTasks]);

  // 手动同步
  const handleSync = async () => {
    try {
      setSyncStatus({ ...syncStatus!, isSyncing: true });
      await syncService.forceSync();
      const loadedTasks = await syncService.getLocalTasks();
      setTasks(loadedTasks);
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('同步失败:', err);
      setError('同步失败，请检查网络连接');
    }
  };

  // 创建任务（适配 TaskList 组件的接口）
  const handleTaskCreate = async (taskData: Omit<Task, 'task_id' | 'created_at' | 'updated_at' | 'version'>) => {
    try {
      // 转换为 API 请求格式
      const request: CreateTaskRequest = {
        title: taskData.title,
        task_type: taskData.task_type,
        priority: taskData.priority,
        tags: taskData.tags,
        estimate_minutes: taskData.estimate_minutes,
      };
      
      await syncService.createTask(request);
      // 更新本地状态
      const updatedTasks = await syncService.getLocalTasks();
      setTasks(updatedTasks);
      
      // 更新同步状态
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('创建任务失败:', err);
      setError('创建任务失败');
    }
  };

  // 更新任务
  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      const task = tasks.find(t => t.task_id === taskId);
      if (!task) return;

      await syncService.updateTask(taskId, {
        ...updates,
        version: task.version,
      });
      
      // 更新本地状态
      const updatedTasks = await syncService.getLocalTasks();
      setTasks(updatedTasks);
      
      // 更新同步状态
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('更新任务失败:', err);
      setError('更新任务失败');
    }
  };

  // 删除任务
  const handleTaskDelete = async (taskId: string) => {
    if (!window.confirm('确定要删除这个任务吗？')) {
      return;
    }

    try {
      await syncService.deleteTask(taskId);
      
      // 更新本地状态
      const updatedTasks = await syncService.getLocalTasks();
      setTasks(updatedTasks);
      
      // 更新同步状态
      const status = await syncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('删除任务失败:', err);
      setError('删除任务失败');
    }
  };

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '64px' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0284c7' }}>
                时间管理小精灵
              </h1>
            </div>
            <nav style={{ display: 'flex', gap: '32px' }}>
              <a href="#/" style={{ color: '#6b7280', textDecoration: 'none' }}>首页</a>
              <a href="#/tasks" style={{ color: '#0284c7', fontWeight: '500', textDecoration: 'none' }}>任务列表</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Sync Status Bar */}
      {syncStatus && (
        <div style={{
          backgroundColor: syncStatus.isOnline ? '#ecfdf5' : '#fef2f2',
          borderBottom: '1px solid ' + (syncStatus.isOnline ? '#d1fae5' : '#fecaca'),
          padding: '8px 16px'
        }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px' }}>
              <span style={{ color: syncStatus.isOnline ? '#059669' : '#dc2626' }}>
                {syncStatus.isOnline ? '● 在线' : '● 离线'}
              </span>
              {syncStatus.pendingChanges > 0 && (
                <span style={{ color: '#f59e0b' }}>
                  {syncStatus.pendingChanges} 个待同步更改
                </span>
              )}
              {syncStatus.isSyncing && (
                <span style={{ color: '#3b82f6' }}>同步中...</span>
              )}
            </div>
            <button
              onClick={handleSync}
              disabled={!syncStatus.isOnline || syncStatus.isSyncing}
              style={{
                padding: '4px 12px',
                backgroundColor: syncStatus.isOnline && !syncStatus.isSyncing ? '#0284c7' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: syncStatus.isOnline && !syncStatus.isSyncing ? 'pointer' : 'not-allowed'
              }}
            >
              手动同步
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '6px',
          padding: '12px 16px',
          margin: '16px auto',
          maxWidth: '80rem',
          color: '#dc2626'
        }}>
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: '12px',
              padding: '2px 8px',
              backgroundColor: 'transparent',
              border: '1px solid #dc2626',
              borderRadius: '4px',
              color: '#dc2626',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            关闭
          </button>
        </div>
      )}

      {/* Main Content */}
      <main style={{ maxWidth: '80rem', margin: '0 auto', padding: '32px 16px' }}>
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
