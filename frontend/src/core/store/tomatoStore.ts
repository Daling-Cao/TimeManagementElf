import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: string;
  summaries?: any[];
  totalDuration?: number;
  completedSessions?: number;
  startedAt?: string;
  completedAt?: string;
}

interface TomatoState {
  timeRemaining: number;
  isRunning: boolean;
  isPaused: boolean;
  selectedDuration: number;
  sessionStartTime: string | null; // 改为 string 以便持久化
  currentTask: Task | null;
  
  start: (duration: number, task?: Task | null) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  tick: () => void;
  setCurrentTask: (task: Task | null) => void;
  setTimeRemaining: (time: number) => void;
  setSelectedDuration: (duration: number) => void;
}

export const useTomatoStore = create<TomatoState>()(
  persist(
    (set, get) => {
  // 定时器引用
  let intervalId: number | null = null;

  // 启动定时器
  const startInterval = () => {
    if (intervalId) clearInterval(intervalId);
    
    intervalId = setInterval(() => {
      const state = get();
      if (state.isRunning && !state.isPaused && state.timeRemaining > 0) {
        set({ timeRemaining: state.timeRemaining - 1 });
        
        // 更新浏览器标签标题
        const minutes = Math.floor(state.timeRemaining / 60);
        const seconds = state.timeRemaining % 60;
        const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        document.title = `[${timeStr}] ${state.currentTask ? state.currentTask.title : '番茄钟'}`;
      } else if (state.timeRemaining === 0 && state.isRunning) {
        // 番茄钟完成
        if (intervalId) clearInterval(intervalId);
        set({ isRunning: false });
        document.title = '🍅 番茄钟';
        
        // 发送通知
        if ('Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification('🎉 番茄钟完成！', {
            body: state.currentTask ? `任务「${state.currentTask.title}」的番茄钟已完成` : '番茄钟已完成，请记录工作总结',
            icon: '/favicon.ico',
            requireInteraction: true,
            tag: 'tomato-complete'
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        
        // 激活窗口
        window.focus();
      }
    }, 1000);
  };

  // 停止定时器
  const stopInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };

  return {
    timeRemaining: 25 * 60,
    isRunning: false,
    isPaused: false,
    selectedDuration: 25,
    sessionStartTime: null,
    currentTask: null,

    start: (duration: number, task?: Task | null) => {
      // 单例保护：若已有计时在运行或暂停，则忽略新的启动请求
      const state = get();
      if (state.isRunning || state.isPaused) {
        return;
      }
      set({
        timeRemaining: duration * 60,
        isRunning: true,
        isPaused: false,
        selectedDuration: duration,
        sessionStartTime: new Date().toISOString(), // 转为字符串
        currentTask: task || null
      });
      startInterval();
    },

    pause: () => {
      set({ isPaused: true });
      const state = get();
      const minutes = Math.floor(state.timeRemaining / 60);
      const seconds = state.timeRemaining % 60;
      const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      document.title = `[暂停] ${timeStr}${state.currentTask ? ' - ' + state.currentTask.title : ''}`;
    },

    resume: () => {
      set({ isPaused: false });
      startInterval();
    },

    stop: () => {
      stopInterval();
      set({
        isRunning: false,
        isPaused: false,
        sessionStartTime: null
      });
      document.title = '🍅 番茄钟';
    },

    reset: () => {
      stopInterval();
      const state = get();
      set({
        timeRemaining: state.selectedDuration * 60,
        isRunning: false,
        isPaused: false,
        sessionStartTime: null
      });
      document.title = '🍅 番茄钟';
    },

    tick: () => {
      const state = get();
      if (state.isRunning && !state.isPaused && state.timeRemaining > 0) {
        set({ timeRemaining: state.timeRemaining - 1 });
      }
    },

    setCurrentTask: (task: Task | null) => {
      set({ currentTask: task });
    },

    setTimeRemaining: (time: number) => {
      set({ timeRemaining: time });
    },

    setSelectedDuration: (duration: number) => {
      set({ selectedDuration: duration, timeRemaining: duration * 60 });
    }
  };
},
    {
      name: 'tomato-store' // localStorage key
    }
  )
);

