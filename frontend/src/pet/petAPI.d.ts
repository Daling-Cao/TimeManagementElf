export type PetVisualState = 'idle' | 'focus' | 'celebrate' | 'play';

export interface PetThemeInfo {
  id: string;
  name: string;
}

export type PetStateMessage =
  | { type: 'focus'; active: boolean; title?: string }
  | { type: 'celebrate' }
  | { type: 'preview'; state: PetVisualState }
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
  /** state -> 可直接加载的 URL（elf-theme://...）。 */
  files: Partial<Record<PetVisualState, string>>;
  updatedAt: number;
}

export type PetThemeResult<T> = { ok: true; result: T } | { ok: false; error: string };

export interface PetThemesAPI {
  list: () => Promise<CustomPetTheme[]>;
  getSelected: () => Promise<string>;
  create: (input: { name?: string; base?: string; pixelated?: boolean }) => Promise<PetThemeResult<CustomPetTheme>>;
  update: (
    id: string,
    patch: { name?: string; base?: string; pixelated?: boolean },
  ) => Promise<PetThemeResult<CustomPetTheme>>;
  setStateFile: (id: string, state: PetVisualState, data: Uint8Array) => Promise<PetThemeResult<CustomPetTheme>>;
  clearStateFile: (id: string, state: PetVisualState) => Promise<PetThemeResult<CustomPetTheme>>;
  remove: (id: string) => Promise<PetThemeResult<boolean>>;
  /** 让桌面小猫切换到这个主题（并记住）。 */
  select: (id: string) => void;
  /** 让桌面小猫立刻播放某个状态。 */
  preview: (state: PetVisualState) => void;
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
  /** (pet window) Report available themes + current selection for the menu. */
  reportThemes: (payload: { themes: PetThemeInfo[]; selectedId: string }) => void;
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
  /** Main process asks to open the task search (pet menu "搜索任务"). */
  onSearchOpen: (cb: () => void) => () => void;
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
