/** 四个内置状态（内置主题都有这四个动画）。 */
export type PetVisualState = 'idle' | 'focus' | 'celebrate' | 'play';
/** 内置状态，或用户新增的状态（'s-xxxx'）。 */
export type PetStateId = string;
/** 叠加在动画上的 CSS 动作。 */
export type PetMotion = 'none' | 'breathe' | 'bob' | 'cheer' | 'hop';

/** 什么时候显示哪个状态。 */
export interface PetBehavior {
  idle: PetStateId;
  focus: PetStateId;
  /** '' = 和专注一样 */
  paused: PetStateId;
  /** '' = 和闲置一样 */
  break: PetStateId;
  celebrate: { state: PetStateId; seconds: number };
  /** 闲置时随机出现 */
  random: { state: PetStateId; minMinutes: number; maxMinutes: number; seconds: number }[];
  /** 闲置时按时间段（HH:mm，可跨午夜）替换闲置状态 */
  schedule: { from: string; to: string; state: PetStateId }[];
}

export interface PetCustomState {
  id: PetStateId;
  name: string;
}

export interface PetThemeInfo {
  id: string;
  name: string;
}

export type PetStateMessage =
  | { type: 'focus'; active: boolean; title?: string }
  | { type: 'celebrate' }
  | { type: 'preview'; state: PetStateId }
  | { type: 'activity'; paused: boolean; onBreak: boolean }
  | { type: 'theme'; id: string }
  | { type: 'themes-changed' };

/** 用户自定义主题（主进程 userData/pet-themes 里保存）。 */
export interface CustomPetTheme {
  id: string;
  name: string;
  kind: 'custom';
  /** 没有上传的状态沿用这个内置主题。 */
  base: string;
  pixelated: boolean;
  /** 默认显示大小（px）。 */
  size: number;
  /** state -> 可直接加载的 URL（elf-theme://...）。 */
  files: Record<PetStateId, string>;
  /** state -> 单独的显示大小（覆盖 size）。 */
  sizes: Record<PetStateId, number>;
  motions: Record<PetStateId, PetMotion>;
  customStates: PetCustomState[];
  behavior: PetBehavior;
  updatedAt: number;
}

export interface CustomPetThemePatch {
  name?: string;
  base?: string;
  pixelated?: boolean;
  size?: number;
  sizes?: Record<PetStateId, number>;
  motions?: Record<PetStateId, PetMotion>;
  /** 不带 id 的项会新建状态；列表里没有的旧状态会被删除（连同文件）。 */
  customStates?: { id?: string; name: string }[];
  behavior?: PetBehavior;
}

export type PetThemeResult<T> = { ok: true; result: T } | { ok: false; error: string };

export interface PetThemesAPI {
  list: () => Promise<CustomPetTheme[]>;
  getSelected: () => Promise<string>;
  create: (input: { name?: string; base?: string; pixelated?: boolean }) => Promise<PetThemeResult<CustomPetTheme>>;
  update: (id: string, patch: CustomPetThemePatch) => Promise<PetThemeResult<CustomPetTheme>>;
  setStateFile: (id: string, state: PetStateId, data: Uint8Array) => Promise<PetThemeResult<CustomPetTheme>>;
  clearStateFile: (id: string, state: PetStateId) => Promise<PetThemeResult<CustomPetTheme>>;
  remove: (id: string) => Promise<PetThemeResult<boolean>>;
  /** 让桌面小猫切换到这个主题（并记住）。 */
  select: (id: string) => void;
  /** 让桌面小猫立刻播放某个状态。 */
  preview: (state: PetStateId) => void;
  openFolder: () => void;
  /** (main window) 小猫当前主题变了（包括右键菜单切换）；返回取消订阅函数。 */
  onSelectedChanged: (cb: (id: string) => void) => () => void;
}

export interface PetAPI {
  /** Toggle the main app window (show/hide). */
  toggleMain: () => void;
  /** Move the pet window to absolute screen coordinates. */
  move: (x: number, y: number) => void;
  /** Ask the main process to pop up the pet context menu. */
  contextMenu: () => void;
  /** Quit the whole application. */
  quit: () => void;
  /** (main window) Tell the pet whether a focus timer is running (and the task title). */
  setFocus: (active: boolean, title?: string) => void;
  /** (main window) Tell the pet a focus session just completed. */
  celebrate: () => void;
  /** (main window) 番茄钟是否暂停、是否在休息。 */
  setActivity: (paused: boolean, onBreak: boolean) => void;
  /** (pet window) 按主题大小调整小猫窗口（保持底部中点不动）。 */
  resize: (width: number, height: number) => void;
  /** (pet window) Report available themes + current selection for the menu. */
  reportThemes: (payload: {
    themes: PetThemeInfo[];
    selectedId: string;
    /** 当前主题的全部状态（「预览动作」菜单） */
    states: { id: PetStateId; name: string }[];
  }) => void;
  /** (pet window) Subscribe to state messages; returns an unsubscribe fn. */
  onState: (cb: (data: PetStateMessage) => void) => () => void;
}

export interface DesktopDataAPI {
  load: () => Promise<{
    tasks: unknown[] | null;
    history: unknown[] | null;
    dataRoot: string;
  }>;
  saveTasks: (tasks: unknown[]) => Promise<{ date: string; taskCount: number }>;
  saveHistory: (
    history: unknown[],
  ) => Promise<{ historyCount: number; dayCount: number }>;
  getRoot: () => Promise<string>;
  onRootChanged: (
    cb: (payload: { dataRoot: string }) => void,
  ) => () => void;
}

export interface DialogAPI {
  /** Main-process confirm box; returns true when the user clicks 确定. */
  confirm: (message: string) => boolean;
  /** Main-process info box. */
  alert: (message: string) => void;
}

export interface AppAPI {
  /** Show and focus the main window (e.g. for the daily planner or break end). */
  showMain: () => void;
  /** Hide the main window (e.g. after a planner that popped up on its own is closed). */
  hideMain: () => void;
  /** Whether the main window is currently visible (sync). */
  isMainVisible: () => boolean;
  /** Pet context menu asks the main window to show a page (HashRouter path). */
  onNavigate: (cb: (route: string) => void) => () => void;
  /** Main process hints that a new day may have started (resume / unlock / tick). */
  onPlanCheck: (cb: (payload: { reason?: string }) => void) => () => void;
  /** Main process asks to open the daily planner (pet menu "规划今天"). */
  onPlanOpen: (cb: () => void) => () => void;
}

export type AiFormat = 'openai' | 'anthropic';

export interface AiPublicConfig {
  format: AiFormat;
  baseURL: string;
  model: string;
  hasKey: boolean;
  configured: boolean;
  encryptionAvailable: boolean;
}

export interface AiConfigInput {
  format: AiFormat;
  baseURL: string;
  model: string;
  /** undefined = keep the saved key; '' = remove it. */
  apiKey?: string;
}

export interface AiAPI {
  getConfig: () => Promise<AiPublicConfig>;
  setConfig: (
    config: AiConfigInput,
  ) => Promise<{ ok: true; config: AiPublicConfig } | { ok: false; error: string }>;
  complete: (request: {
    system: string;
    user: string;
    jsonSchema?: Record<string, unknown>;
  }) => Promise<{ ok: true; text: string } | { ok: false; error: string }>;
}

declare global {
  interface Window {
    aiAPI?: AiAPI;
    appAPI?: AppAPI;
    petAPI?: PetAPI;
    petThemesAPI?: PetThemesAPI;
    dataAPI?: DesktopDataAPI;
    dialogAPI?: DialogAPI;
  }
}

export {};
