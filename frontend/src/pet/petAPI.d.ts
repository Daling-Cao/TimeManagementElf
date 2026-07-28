export type PetVisualState = 'idle' | 'focus' | 'celebrate' | 'play';

export type PetStateMessage =
  | { type: 'focus'; active: boolean }
  | { type: 'celebrate' }
  | { type: 'preview'; state: PetVisualState };

export interface PetAPI {
  /** Toggle the main app window (show/hide). */
  toggleMain: () => void;
  /** Move the pet window to absolute screen coordinates. */
  move: (x: number, y: number) => void;
  /** Ask the main process to pop up the pet context menu. */
  contextMenu: () => void;
  /** Quit the whole application. */
  quit: () => void;
  /** (main window) Tell the pet whether a focus timer is running. */
  setFocus: (active: boolean) => void;
  /** (main window) Tell the pet a focus session just completed. */
  celebrate: () => void;
  /** (pet window) Subscribe to state messages; returns an unsubscribe fn. */
  onState: (cb: (data: PetStateMessage) => void) => () => void;
}

declare global {
  interface Window {
    petAPI?: PetAPI;
  }
}

export {};
