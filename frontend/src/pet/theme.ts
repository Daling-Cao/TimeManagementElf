import themesData from './themes.json';
import type {
  CustomPetTheme,
  PetBehavior,
  PetCustomState,
  PetMotion,
  PetStateId,
  PetVisualState,
} from './petAPI';

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
  files?: Record<PetStateId, string>;
  size?: number;
  sizes?: Record<PetStateId, number>;
  motions?: Record<PetStateId, PetMotion>;
  customStates?: PetCustomState[];
  behavior?: PetBehavior;
}

export const PET_STATES: PetVisualState[] = ['idle', 'focus', 'celebrate', 'play'];

export const STATE_LABELS: Record<PetVisualState, string> = {
  idle: '😴 闲置 · 睡觉',
  focus: '🐱 专注 · 猫头',
  celebrate: '🚩 完成 · 挥旗',
  play: '✨ 调皮 · 蹦跳',
};

export const MOTION_LABELS: Record<PetMotion, string> = {
  none: '不加动作',
  breathe: '呼吸起伏',
  bob: '上下轻摆',
  cheer: '左右欢呼',
  hop: '蹦跳',
};

const DEFAULT_MOTIONS: Record<PetVisualState, PetMotion> = {
  idle: 'breathe',
  focus: 'bob',
  celebrate: 'cheer',
  play: 'hop',
};

export const DEFAULT_SIZE = 190;
export const MIN_SIZE = 60;
export const MAX_SIZE = 400;

/** Behaviour of the built-in themes (and the starting point of new custom themes). */
export const DEFAULT_BEHAVIOR: PetBehavior = {
  idle: 'idle',
  focus: 'focus',
  paused: '',
  break: '',
  celebrate: { state: 'celebrate', seconds: 6 },
  random: [{ state: 'play', minMinutes: 30, maxMinutes: 45, seconds: 6 }],
  schedule: [],
};

/** Themes shipped with the app (themes.json). Custom themes are never in here. */
export const THEMES = (themesData.themes as PetTheme[]).filter(Boolean);
export const DEFAULT_THEME_ID = THEMES[0]?.id ?? 'pixel';

const STORAGE_KEY = 'pet-theme';

export function isStandardState(id: PetStateId): id is PetVisualState {
  return (PET_STATES as string[]).includes(id);
}

export function fromCustom(theme: CustomPetTheme): PetTheme {
  return {
    id: theme.id,
    name: theme.name,
    kind: 'custom',
    base: theme.base,
    pixelated: theme.pixelated,
    files: theme.files,
    size: theme.size,
    sizes: theme.sizes,
    motions: theme.motions,
    customStates: theme.customStates,
    behavior: theme.behavior,
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

/** All states of a theme: the four standard ones, then user-added ones. */
export function themeStates(theme: PetTheme): { id: PetStateId; name: string; custom: boolean }[] {
  return [
    ...PET_STATES.map((id) => ({ id, name: STATE_LABELS[id], custom: false })),
    ...(theme.customStates ?? []).map((s) => ({ id: s.id, name: s.name, custom: true })),
  ];
}

export function stateName(theme: PetTheme, id: PetStateId): string {
  return themeStates(theme).find((s) => s.id === id)?.name ?? id;
}

export function hasState(theme: PetTheme, id: PetStateId): boolean {
  return isStandardState(id) || !!theme.customStates?.some((s) => s.id === id);
}

export function behaviorOf(theme: PetTheme): PetBehavior {
  return theme.behavior ?? DEFAULT_BEHAVIOR;
}

export function stateSize(theme: PetTheme, id: PetStateId): number {
  return theme.sizes?.[id] ?? theme.size ?? DEFAULT_SIZE;
}

/** Largest display size used by the theme (for sizing the pet window). */
export function maxThemeSize(theme: PetTheme): number {
  return Math.max(theme.size ?? DEFAULT_SIZE, ...Object.values(theme.sizes ?? {}));
}

export function stateMotion(theme: PetTheme, id: PetStateId): PetMotion {
  return theme.motions?.[id] ?? (isStandardState(id) ? DEFAULT_MOTIONS[id] : 'none');
}

/** URL (relative to the pet HTML) of a state's asset for an "image" theme. */
export function stateAssetUrl(theme: PetTheme, state: PetVisualState): string {
  return `./${theme.dir}/${state}.${theme.ext}`;
}

export type StateSource =
  | { kind: 'builtin'; state: PetVisualState }
  | { kind: 'image'; url: string; pixelated: boolean; custom: boolean };

/**
 * What to draw for one state of a theme. Custom themes use their upload, then
 * the base theme for the four standard states; a user-added state without an
 * upload shows the idle animation.
 */
export function resolveStateSource(theme: PetTheme, state: PetStateId): StateSource {
  if (theme.kind === 'custom') {
    const url = theme.files?.[state];
    if (url) return { kind: 'image', url, pixelated: theme.pixelated !== false, custom: true };
    if (!isStandardState(state)) return resolveStateSource(theme, 'idle');
    const base = getTheme(theme.base ?? DEFAULT_THEME_ID);
    return base.kind === 'custom' ? { kind: 'builtin', state } : resolveStateSource(base, state);
  }
  const standard: PetVisualState = isStandardState(state) ? state : 'idle';
  if (theme.kind === 'image') {
    return {
      kind: 'image',
      url: stateAssetUrl(theme, standard),
      pixelated: !!theme.pixelated,
      custom: false,
    };
  }
  return { kind: 'builtin', state: standard };
}

/** "HH:mm" -> minutes since midnight. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Whether `now` falls inside [from, to) — the range may wrap past midnight. */
export function inTimeRange(from: string, to: string, now = new Date()): boolean {
  const start = toMinutes(from);
  const end = toMinutes(to);
  const t = now.getHours() * 60 + now.getMinutes();
  if (start === end) return true;
  return start < end ? t >= start && t < end : t >= start || t < end;
}

/** The idle state for right now (time-of-day rules first, then behaviour.idle). */
export function idleStateAt(theme: PetTheme, now = new Date()): PetStateId {
  const behavior = behaviorOf(theme);
  const rule = behavior.schedule.find((r) => hasState(theme, r.state) && inTimeRange(r.from, r.to, now));
  return rule?.state ?? behavior.idle;
}
