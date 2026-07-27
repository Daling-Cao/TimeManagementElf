import { create } from 'zustand';
import type { Task } from '../types';

interface TaskState {
  tasks: Task[];
  selectedTask: Task | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  setSelectedTask: (task: Task | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getTasksByStatus: (status: Task['status']) => Task[];
  getTasksByType: (type: string) => Task[];
  getTasksByPriority: (priority: Task['priority']) => Task[];
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  selectedTask: null,
  isLoading: false,
  error: null,
  
  setTasks: (tasks) => set({ tasks }),
  
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  })),
  
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task.task_id === taskId 
        ? { ...task, ...updates, updated_at: new Date().toISOString() }
        : task
    )
  })),
  
  deleteTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(task => task.task_id !== taskId)
  })),
  
  setSelectedTask: (task) => set({ selectedTask: task }),
  
  setLoading: (loading) => set({ isLoading: loading }),
  
  setError: (error) => set({ error }),
  
  getTasksByStatus: (status) => {
    return get().tasks.filter(task => task.status === status);
  },
  
  getTasksByType: (type) => {
    return get().tasks.filter(task => task.task_type === type);
  },
  
  getTasksByPriority: (priority) => {
    return get().tasks.filter(task => task.priority === priority);
  },
}));
