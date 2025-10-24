export * from './task';
export * from './tomatoRecord';

export interface User {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSyncAt?: string;
  pendingChanges: number;
  isSyncing: boolean;
}
