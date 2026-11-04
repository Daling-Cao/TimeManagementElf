import themesData from './themes.json';
import type { CustomPetTheme, PetVisualState } from './petAPI';

export interface PetTheme {
  id: string;
  name: string;
  /**
   * "builtin" = the canvas pixel renderer; "image" = one GIF/PNG/WebP per state;
   * "custom" = user-uploaded per-state files, falling back to `base` for the rest.
   */
  kind: 'builtin' | 'image' | 'custom';
  /** For "image" themes: folder under public/, e.g. "themes/pixel-gif". */
  dir?: string;
  /** For "image" themes: file extension, e.g. "gif" | "png" | "webp" | "apng". */
  ext?: string;
  /** Render with crisp pixels (no smoothing). */
  pixelated?: boolean;
  /** For "custom" themes: built-in theme used for states without an upload. */
  base?: string;
  /** For "custom" themes: state -> URL of the uploaded file. */
  files?: Partial<Record<PetVisualState, string>>;
}

export const PET_STATES: PetVisualState[] = ['idle', 'focus', 'celebrate', 'play'];

export const STATE_LABELS: Record<PetVisualState, string> = {
  idle: '😴 闲置 · 睡觉',
  focus: '🐱 专注 · 番茄钟进行中',
  celebrate: '🚩 完成 · 庆祝',
  play: '✨ 调皮 · 偶尔蹦跳',
};

/** Themes shipped with the app (themes.json). Custom themes are never in here. */
export const THEMES = (themesData.themes as PetTheme[]).filter(Boolean);
export const DEFAULT_THEME_ID = THEMES[0]?.id ?? 'pixel';

const STORAGE_KEY = 'pet-theme';

export function fromCustom(theme: CustomPetTheme): PetTheme {
  return {
    id: theme.id,
    name: theme.name,
    kind: 'custom',
    base: theme.base,
    pixelated: theme.pixelated,
    files: theme.files,
  };
}

/** Built-in + custom themes, built-ins first. */
export function allThemes(custom: CustomPetTheme[]): PetTheme[] {
  return [...THEMES, ...custom.map(fromCustom)];
}

export function getTheme(id: string, themes: PetTheme[] = THEMES): PetTheme {
  return themes.find((t) => t.id === id) ?? THEMES[0];
}

/** Saved selection (may be a custom id that is only known once the list loads). */
export function loadThemeId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
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

export type StateSource =
  | { kind: 'builtin' }
  | { kind: 'image'; url: string; pixelated: boolean; custom: boolean };

/** What to draw for one state of a theme (custom themes fall back to their base). */
export function resolveStateSource(theme: PetTheme, state: PetVisualState): StateSource {
  if (theme.kind === 'custom') {
    const url = theme.files?.[state];
    if (url) return { kind: 'image', url, pixelated: theme.pixelated !== false, custom: true };
    const base = getTheme(theme.base ?? DEFAULT_THEME_ID);
    return base.kind === 'custom' ? { kind: 'builtin' } : resolveStateSource(base, state);
  }
  if (theme.kind === 'image') {
    return {
      kind: 'image',
      url: stateAssetUrl(theme, state),
      pixelated: !!theme.pixelated,
      custom: false,
    };
  }
  return { kind: 'builtin' };
}
