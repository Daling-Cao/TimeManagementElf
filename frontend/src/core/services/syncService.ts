import type { Task, CreateTaskRequest, UpdateTaskRequest, CompleteTaskRequest, SyncStatus } from '../types';
import { apiService } from './apiService';
import { storageService } from './storageService';
import type { SyncQueueItem } from './storageService';

class SyncService {
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private syncInterval: number | null = null;

  constructor() {
    // 监听网络状态变化
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // 初始化存储服务
    this.init();
  }

  private async init() {
    await storageService.init();
    // 启动自动同步（每30秒）
    this.startAutoSync(30000);
  }

  /**
   * 启动自动同步
   */
  startAutoSync(intervalMs: number = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.syncInProgress) {
        this.processSyncQueue();
      }
    }, intervalMs);
  }

  /**
   * 停止自动同步
   */
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(): Promise<SyncStatus> {
    const queue = await storageService.getSyncQueue();
    const lastSyncAt = await storageService.getLastSyncTime();
    
    return {
      isOnline: this.isOnline,
      lastSyncAt: lastSyncAt || undefined,
      pendingChanges: queue.length,
      isSyncing: this.syncInProgress,
    };
  }

  /**
   * 同步所有任务（从服务器拉取）
   */
  async syncTasks(): Promise<Task[]> {
    try {
      if (!this.isOnline) {
        // 离线时从本地加载
        return await storageService.getAllTasks();
      }

      // 在线时从服务器获取
      const lastSyncTime = await storageService.getLastSyncTime();
      const response = await apiService.getTasks(
        lastSyncTime ? { since: lastSyncTime } : undefined
      );

      // 更新本地存储
      for (const task of response.data) {
        await storageService.saveTask(task);
      }

      // 更新最后同步时间
      await storageService.setLastSyncTime(new Date().toISOString());

      return response.data;
    } catch (error) {
      console.error('同步任务失败:', error);
      // 失败时返回本地数据
      return await storageService.getAllTasks();
    }
  }

  /**
   * 创建任务
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    const tempTask: Task = {
      task_id: `temp_${Date.now()}_${Math.random()}`,
      user_id: 'current_user', // 应该从认证状态获取
      title: request.title,
      task_type: request.task_type,
      priority: request.priority,
      tags: request.tags,
      estimate_minutes: request.estimate_minutes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'todo',
      stats_focus_minutes: 0,
      version: 1,
      stats_actual_minutes: 0,
      stats_sessions_count: 0,
    };

    // 先保存到本地
    await storageService.saveTask(tempTask);

    if (this.isOnline) {
      try {
        // 尝试发送到服务器
        const serverTask = await apiService.createTask(request);
        
        // 删除临时任务，保存服务器返回的任务
        await storageService.deleteTask(tempTask.task_id);
        await storageService.saveTask(serverTask);
        
        return serverTask;
      } catch (error) {
        console.error('创建任务失败，已加入同步队列:', error);
        // 失败时加入同步队列
        await storageService.addToSyncQueue({
          operation: 'create',
          table: 'tasks',
          data: { request, tempId: tempTask.task_id },
        });
        
        return tempTask;
      }
    } else {
      // 离线时直接加入同步队列
      await storageService.addToSyncQueue({
        operation: 'create',
        table: 'tasks',
        data: { request, tempId: tempTask.task_id },
      });
      
      return tempTask;
    }
  }

  /**
   * 更新任务
   */
  async updateTask(taskId: string, updates: UpdateTaskRequest): Promise<Task> {
    // 先获取本地任务
    const localTask = await storageService.getTask(taskId);
    if (!localTask) {
      throw new Error('任务不存在');
    }

    // 更新本地任务
    const updatedTask: Task = {
      ...localTask,
      ...updates,
      updated_at: new Date().toISOString(),
      version: localTask.version + 1,
    };
    
    await storageService.saveTask(updatedTask);

    if (this.isOnline) {
      try {
        // 尝试发送到服务器
        const serverTask = await apiService.updateTask(taskId, updates);
        
        // 使用服务器返回的数据（Last-Write-Wins）
        await storageService.saveTask(serverTask);
        
        return serverTask;
      } catch (error) {
        console.error('更新任务失败:', error);

        // 如果是版本冲突，从服务器重新获取
        const message = error instanceof Error ? error.message : '';
        if (message.includes('conflict') || message.includes('409')) {
          console.warn('检测到版本冲突，将在下次同步时处理');
        }
        
        // 加入同步队列
        await storageService.addToSyncQueue({
          operation: 'update',
          table: 'tasks',
          data: { taskId, updates },
        });
        
        return updatedTask;
      }
    } else {
      // 离线时加入同步队列
      await storageService.addToSyncQueue({
        operation: 'update',
        table: 'tasks',
        data: { taskId, updates },
      });
      
      return updatedTask;
    }
  }

  /**
   * 完成任务
   */
  async completeTask(taskId: string, data: CompleteTaskRequest): Promise<Task> {
    const localTask = await storageService.getTask(taskId);
    if (!localTask) {
      throw new Error('任务不存在');
    }

    // 更新本地任务状态
    const completedTask: Task = {
      ...localTask,
      status: 'done',
      summary: data.summary,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      version: localTask.version + 1,
    };
    
    await storageService.saveTask(completedTask);

    if (this.isOnline) {
      try {
        const serverTask = await apiService.completeTask(taskId, data);
        await storageService.saveTask(serverTask);
        return serverTask;
      } catch (error) {
        console.error('完成任务失败，已加入同步队列:', error);
        await storageService.addToSyncQueue({
          operation: 'update',
          table: 'tasks',
          data: { taskId, updates: { status: 'done', summary: data.summary, version: data.version } },
        });
        return completedTask;
      }
    } else {
      await storageService.addToSyncQueue({
        operation: 'update',
        table: 'tasks',
        data: { taskId, updates: { status: 'done', summary: data.summary, version: data.version } },
      });
      return completedTask;
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(taskId: string): Promise<void> {
    // 先删除本地任务
    await storageService.deleteTask(taskId);

    if (this.isOnline) {
      try {
        // 尝试从服务器删除
        await apiService.deleteTask(taskId);
      } catch (error) {
        console.error('删除任务失败，已加入同步队列:', error);
        // 失败时加入同步队列
        await storageService.addToSyncQueue({
          operation: 'delete',
          table: 'tasks',
          data: { taskId },
        });
      }
    } else {
      // 离线时加入同步队列
      await storageService.addToSyncQueue({
        operation: 'delete',
        table: 'tasks',
        data: { taskId },
      });
    }
  }

  /**
   * 处理同步队列
   */
  async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;

    try {
      const queue = await storageService.getSyncQueue();
      
      for (const item of queue) {
        try {
          if (item.table === 'tasks') {
            await this.processSyncQueueItem(item);
            // 成功后从队列中移除
            await storageService.removeFromSyncQueue(item.id);
          }
        } catch (error) {
          console.error('处理同步队列项失败:', item, error);
          // 增加重试计数
          if (item.retryCount < 3) {
            // 可以在这里更新重试次数
            console.log(`将重试 (${item.retryCount + 1}/3)`);
          } else {
            // 超过重试次数，从队列移除
            console.error('超过最大重试次数，丢弃:', item);
            await storageService.removeFromSyncQueue(item.id);
          }
        }
      }

      // 同步完成后拉取最新数据
      await this.syncTasks();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 处理单个同步队列项
   */
  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    const { operation, data } = item;

    switch (operation) {
      case 'create': {
        const serverTask = await apiService.createTask(
          data.request as CreateTaskRequest,
        );
        // 删除临时任务
        if (data.tempId) {
          await storageService.deleteTask(data.tempId as string);
        }
        await storageService.saveTask(serverTask);
        break;
      }

      case 'update': {
        const updatedTask = await apiService.updateTask(
          data.taskId as string,
          data.updates as UpdateTaskRequest,
        );
        await storageService.saveTask(updatedTask);
        break;
      }

      case 'delete':
        await apiService.deleteTask(data.taskId as string);
        break;

      default:
        console.warn('未知的同步操作:', operation);
    }
  }

  /**
   * 获取所有本地任务
   */
  async getLocalTasks(): Promise<Task[]> {
    return await storageService.getAllTasks();
  }

  /**
   * 强制同步
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline) {
      throw new Error('当前离线，无法同步');
    }

    await this.processSyncQueue();
    await this.syncTasks();
  }
}

export const syncService = new SyncService();

