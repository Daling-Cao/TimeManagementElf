import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Task, TomatoSession } from '../types';

interface TimeManagementDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-user': string; 'by-status': string; 'by-type': string };
  };
  tomato_sessions: {
    key: string;
    value: TomatoSession;
    indexes: { 'by-user': string; 'by-task': string; 'by-date': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      operation: 'create' | 'update' | 'delete';
      table: 'tasks' | 'tomato_sessions';
      data: any;
      timestamp: number;
      retryCount: number;
    };
  };
  settings: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

class StorageService {
  private db: IDBPDatabase<TimeManagementDB> | null = null;
  private dbName = 'TimeManagementElf';
  private version = 1;

  async init(): Promise<void> {
    this.db = await openDB<TimeManagementDB>(this.dbName, this.version, {
      upgrade(db) {
        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'task_id' });
          taskStore.createIndex('by-user', 'user_id');
          taskStore.createIndex('by-status', 'status');
          taskStore.createIndex('by-type', 'task_type');
        }

        // Tomato sessions store
        if (!db.objectStoreNames.contains('tomato_sessions')) {
          const sessionStore = db.createObjectStore('tomato_sessions', { keyPath: 'session_id' });
          sessionStore.createIndex('by-user', 'user_id');
          sessionStore.createIndex('by-task', 'task_id');
          sessionStore.createIndex('by-date', 'started_at');
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'id' });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }

  private async ensureDB(): Promise<IDBPDatabase<TimeManagementDB>> {
    if (!this.db) {
      await this.init();
    }
    return this.db!;
  }

  // Task methods
  async saveTask(task: Task): Promise<void> {
    const db = await this.ensureDB();
    await db.put('tasks', task);
  }

  async getTask(taskId: string): Promise<Task | undefined> {
    const db = await this.ensureDB();
    return db.get('tasks', taskId);
  }

  async getAllTasks(): Promise<Task[]> {
    const db = await this.ensureDB();
    return db.getAll('tasks');
  }

  async getTasksByStatus(status: Task['status']): Promise<Task[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('tasks', 'by-status', status);
  }

  async getTasksByType(type: string): Promise<Task[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('tasks', 'by-type', type);
  }

  async deleteTask(taskId: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('tasks', taskId);
  }

  // Tomato session methods
  async saveTomatoSession(session: TomatoSession): Promise<void> {
    const db = await this.ensureDB();
    await db.put('tomato_sessions', session);
  }

  async getTomatoSession(sessionId: string): Promise<TomatoSession | undefined> {
    const db = await this.ensureDB();
    return db.get('tomato_sessions', sessionId);
  }

  async getAllTomatoSessions(): Promise<TomatoSession[]> {
    const db = await this.ensureDB();
    return db.getAll('tomato_sessions');
  }

  async getTomatoSessionsByTask(taskId: string): Promise<TomatoSession[]> {
    const db = await this.ensureDB();
    return db.getAllFromIndex('tomato_sessions', 'by-task', taskId);
  }

  // Sync queue methods
  async addToSyncQueue(operation: {
    operation: 'create' | 'update' | 'delete';
    table: 'tasks' | 'tomato_sessions';
    data: any;
  }): Promise<void> {
    const db = await this.ensureDB();
    const queueItem = {
      id: `sync_${Date.now()}_${Math.random()}`,
      ...operation,
      timestamp: Date.now(),
      retryCount: 0,
    };
    await db.put('sync_queue', queueItem);
  }

  async getSyncQueue(): Promise<any[]> {
    const db = await this.ensureDB();
    return db.getAll('sync_queue');
  }

  async removeFromSyncQueue(id: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('sync_queue', id);
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDB();
    await db.clear('sync_queue');
  }

  // Settings methods
  async saveSetting(key: string, value: any): Promise<void> {
    const db = await this.ensureDB();
    await db.put('settings', { key, value });
  }

  async getSetting(key: string): Promise<any> {
    const db = await this.ensureDB();
    const setting = await db.get('settings', key);
    return setting?.value;
  }

  async deleteSetting(key: string): Promise<void> {
    const db = await this.ensureDB();
    await db.delete('settings', key);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    await db.clear('tasks');
    await db.clear('tomato_sessions');
    await db.clear('sync_queue');
  }

  async getLastSyncTime(): Promise<string | null> {
    return this.getSetting('last_sync_at');
  }

  async setLastSyncTime(timestamp: string): Promise<void> {
    await this.saveSetting('last_sync_at', timestamp);
  }
}

export const storageService = new StorageService();
