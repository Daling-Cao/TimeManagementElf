export interface Task {
  task_id: string;
  user_id: string;
  title: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimate_minutes?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  status: 'todo' | 'in_progress' | 'done' | 'archived';
  stats_focus_minutes: number;
  version: number;
  stats_actual_minutes: number;
  stats_sessions_count: number;
  summary?: string;
}

export interface CreateTaskRequest {
  title: string;
  task_type: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  estimate_minutes?: number;
}

export interface UpdateTaskRequest {
  title?: string;
  task_type?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  estimate_minutes?: number;
  status?: 'todo' | 'in_progress' | 'done' | 'archived';
  summary?: string;
  version: number;
}

export interface CompleteTaskRequest {
  summary: string;
  version: number;
}
