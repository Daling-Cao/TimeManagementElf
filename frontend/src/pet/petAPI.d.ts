export interface PetAPI {
  /** Toggle the main app window (show/hide). */
  toggleMain: () => void;
  /** Move the pet window to absolute screen coordinates. */
  move: (x: number, y: number) => void;
  /** Ask the main process to pop up the pet context menu. */
  contextMenu: () => void;
  /** Quit the whole application. */
  quit: () => void;
}

declare global {
  interface Window {
    petAPI?: PetAPI;
  }
}

export {};
