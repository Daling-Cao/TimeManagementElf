export type PetVisualState = 'idle' | 'focus' | 'celebrate' | 'play';

export interface PetThemeInfo {
  id: string;
  name: string;
}

export type PetStateMessage =
  | { type: 'focus'; active: boolean; title?: string }
  | { type: 'celebrate' }
  | { type: 'preview'; state: PetVisualState }
  | { type: 'theme'; id: string };

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

declare global {
  interface Window {
    petAPI?: PetAPI;
  }
}

export {};
