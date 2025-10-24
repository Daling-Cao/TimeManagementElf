import { create } from 'zustand';
import { TimerState, TimerConfig, Task } from '../types';

interface TimerStore extends TimerState {
  config: TimerConfig;
  
  // Actions
  startTimer: (task: Task, duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  updateTimeRemaining: (time: number) => void;
  setConfig: (config: Partial<TimerConfig>) => void;
}

const defaultConfig: TimerConfig = {
  duration: 25,
  shortBreak: 5,
  longBreak: 15,
  autoStart: false,
  soundEnabled: true,
};

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  isPaused: false,
  timeRemaining: 0,
  totalTime: 0,
  currentTask: undefined,
  sessionId: undefined,
  config: defaultConfig,
  
  startTimer: (task, duration) => {
    const sessionId = `session_${Date.now()}`;
    set({
      isRunning: true,
      isPaused: false,
      timeRemaining: duration * 60,
      totalTime: duration * 60,
      currentTask: task,
      sessionId,
    });
  },
  
  pauseTimer: () => set((state) => ({
    isRunning: false,
    isPaused: true,
  })),
  
  resumeTimer: () => set((state) => ({
    isRunning: true,
    isPaused: false,
  })),
  
  stopTimer: () => set({
    isRunning: false,
    isPaused: false,
    timeRemaining: 0,
    totalTime: 0,
    currentTask: undefined,
    sessionId: undefined,
  }),
  
  resetTimer: () => set((state) => ({
    timeRemaining: state.totalTime,
    isRunning: false,
    isPaused: false,
  })),
  
  updateTimeRemaining: (time) => set({ timeRemaining: time }),
  
  setConfig: (newConfig) => set((state) => ({
    config: { ...state.config, ...newConfig }
  })),
}));
