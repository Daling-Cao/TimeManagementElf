import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 任务完成后的休息。用结束时间戳而不是每秒递减：
// 电脑睡眠、窗口隐藏或重启应用后，剩余时间依然准确。
export const BREAK_MINUTES = 10;

interface BreakState {
  /** 休息结束的时间戳（毫秒）；null 表示没有在休息。 */
  endsAt: number | null;
  /** 刚完成的任务标题，用于休息界面的提示。 */
  finishedTaskTitle: string | null;
  start: (minutes: number, finishedTaskTitle?: string | null) => void;
  end: () => void;
}

export const useBreakStore = create<BreakState>()(
  persist(
    (set) => ({
      endsAt: null,
      finishedTaskTitle: null,
      start: (minutes, finishedTaskTitle = null) =>
        set({ endsAt: Date.now() + minutes * 60 * 1000, finishedTaskTitle }),
      end: () => set({ endsAt: null, finishedTaskTitle: null }),
    }),
    { name: 'break-store' },
  ),
);
