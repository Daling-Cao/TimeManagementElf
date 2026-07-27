import type { Task } from './task';

export interface TomatoSession {
  session_id: string;
  user_id: string;
  task_id?: string;
  task_type: string;
  planned_minutes: number;
  actual_minutes: number;
  started_at: string;
  ended_at: string;
  status: 'completed' | 'interrupted' | 'cancelled';
  interruption_reason?: string;
}

export interface CreateTomatoSessionRequest {
  task_id?: string;
  task_type: string;
  planned_minutes: number;
  actual_minutes: number;
  started_at: string;
  ended_at: string;
  status: 'completed' | 'interrupted' | 'cancelled';
  interruption_reason?: string;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  timeRemaining: number; // in seconds
  totalTime: number; // in seconds
  currentTask?: Task;
  sessionId?: string;
}

export interface TimerConfig {
  duration: number; // in minutes
  shortBreak: number; // in minutes
  longBreak: number; // in minutes
  autoStart: boolean;
  soundEnabled: boolean;
}
