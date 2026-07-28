import themesData from './themes.json';
import type { PetVisualState } from './petAPI';

export interface PetTheme {
  id: string;
  name: string;
  /** "builtin" = the canvas pixel renderer; "image" = one GIF/PNG/WebP per state. */
  kind: 'builtin' | 'image';
  /** For "image" themes: folder under public/, e.g. "themes/pixel-gif". */
  dir?: string;
  /** For "image" themes: file extension, e.g. "gif" | "png" | "webp" | "apng". */
  ext?: string;
  /** Render with crisp pixels (no smoothing). */
  pixelated?: boolean;
}

export const THEMES = (themesData.themes as PetTheme[]).filter(Boolean);
export const DEFAULT_THEME_ID = THEMES[0]?.id ?? 'pixel';

const STORAGE_KEY = 'pet-theme';

export function getTheme(id: string): PetTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME_ID;
}

export function saveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** URL (relative to the pet HTML) of a state's asset for an "image" theme. */
export function stateAssetUrl(theme: PetTheme, state: PetVisualState): string {
  return `./${theme.dir}/${state}.${theme.ext}`;
}
