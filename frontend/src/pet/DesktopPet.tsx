import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PetView from './PetView';
import {
  DEFAULT_THEME_ID,
  allThemes,
  behaviorOf,
  getTheme,
  hasState,
  idleStateAt,
  loadThemeId,
  maxThemeSize,
  saveThemeId,
  stateMotion,
  stateSize,
  themeStates,
} from './theme';
import type { PetTheme } from './theme';
import type { CustomPetTheme, PetBehavior, PetStateId } from './petAPI';

const DRAG_THRESHOLD = 4; // px of movement before it counts as a drag

// "fast" mode (add ?fast to the pet URL) shortens the random cooldowns so the
// behaviour can be demoed without waiting half an hour.
const FAST = new URLSearchParams(window.location.search).has('fast');
const PREVIEW_SECONDS = 6;

type TransientKind = 'celebrate' | 'random' | 'preview';
interface Transient {
  kind: TransientKind;
  state: PetStateId;
  /** index into behavior.random (for kind 'random') */
  rule?: number;
}

interface Activity {
  focus: boolean;
  title: string;
  paused: boolean;
  onBreak: boolean;
}

function randomDelayMs(minMinutes: number, maxMinutes: number): number {
  if (FAST) return 12_000 + Math.random() * 8_000;
  const min = minMinutes * 60_000;
  const max = Math.max(min, maxMinutes * 60_000);
  return min + Math.random() * (max - min);
}

/** The state to show when nothing transient is playing. */
function ambientState(theme: PetTheme, activity: Activity, now: Date): PetStateId {
  const b = behaviorOf(theme);
  let state: PetStateId;
  if (activity.focus) state = activity.paused ? b.paused || b.focus : b.focus;
  else if (activity.onBreak) state = b.break || idleStateAt(theme, now);
  else state = idleStateAt(theme, now);
  return hasState(theme, state) ? state : 'idle';
}

const DesktopPet = () => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [activity, setActivity] = useState<Activity>({
    focus: false,
    title: '',
    paused: false,
    onBreak: false,
  });
  const [transient, setTransient] = useState<Transient | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [themeId, setThemeId] = useState<string>(() => loadThemeId());
  // 用户上传的主题由主进程保存；null = 还没读到（先别把保存的选择当成无效）。
  const [customThemes, setCustomThemes] = useState<CustomPetTheme[] | null>(
    window.petThemesAPI ? null : [],
  );
  const [brokenUrls, setBrokenUrls] = useState<ReadonlySet<string>>(() => new Set());
  const themes = useMemo(() => allThemes(customThemes ?? []), [customThemes]);
  const theme = getTheme(themeId, themes);
  const behavior = behaviorOf(theme);

  const petState = transient?.state ?? ambientState(theme, activity, now);

  // ---- custom theme list ---------------------------------------------------
  const reloadCustomThemes = useCallback(() => {
    window.petThemesAPI
      ?.list()
      .then((list) => {
        setCustomThemes(list);
        setBrokenUrls(new Set());
      })
      .catch(() => setCustomThemes([]));
  }, []);

  useEffect(() => {
    reloadCustomThemes();
  }, [reloadCustomThemes]);

  // 保存的主题被删掉了（或不存在）：回到默认主题。
  useEffect(() => {
    if (customThemes === null) return;
    if (!themes.some((t) => t.id === themeId)) {
      setThemeId(DEFAULT_THEME_ID);
      saveThemeId(DEFAULT_THEME_ID);
    }
  }, [customThemes, themes, themeId]);

  // Keep the main-process context menu's theme list + selection in sync.
  useEffect(() => {
    if (customThemes === null) return;
    window.petAPI?.reportThemes({
      themes: themes.map((t) => ({
        id: t.id,
        name: t.kind === 'custom' ? `🎨 ${t.name}` : t.name,
      })),
      selectedId: getTheme(themeId, themes).id,
      states: themeStates(getTheme(themeId, themes)).map((s) => ({ id: s.id, name: s.name })),
    });
  }, [themes, themeId, customThemes]);

  // ---- window size follows the theme's largest animation ------------------
  const maxSize = maxThemeSize(theme);
  useEffect(() => {
    window.petAPI?.resize(Math.max(240, maxSize + 50), maxSize + 50);
  }, [maxSize]);

  // ---- clock for time-of-day rules ----------------------------------------
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), FAST ? 5_000 : 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // ---- transient states (celebrate / random / preview) ---------------------
  const transientTimer = useRef<number | undefined>(undefined);
  const nextRandomAt = useRef<number[]>([]);

  const scheduleRandom = useCallback((rules: PetBehavior['random'], only?: number) => {
    const at = Date.now();
    rules.forEach((rule, i) => {
      if (only === undefined || only === i) {
        nextRandomAt.current[i] = at + randomDelayMs(rule.minMinutes, rule.maxMinutes);
      }
    });
    nextRandomAt.current.length = rules.length;
  }, []);

  const playTransient = useCallback(
    (next: Transient, seconds: number, onEnd?: () => void) => {
      window.clearTimeout(transientTimer.current);
      setTransient(next);
      transientTimer.current = window.setTimeout(() => {
        setTransient(null);
        onEnd?.();
      }, seconds * 1000);
    },
    [],
  );

  const stopTransient = useCallback(() => {
    window.clearTimeout(transientTimer.current);
    setTransient(null);
  }, []);

  // Re-plan random appearances whenever the theme's random rules change.
  const randomKey = JSON.stringify(behavior.random);
  useEffect(() => {
    scheduleRandom(behavior.random);
    // randomKey 代表 behavior.random 的内容
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [randomKey, scheduleRandom]);

  // Latest values for the interval / IPC callbacks below.
  const live = useRef({ theme, behavior, activity, transient });
  live.current = { theme, behavior, activity, transient };

  // Randomly do something while idle (never more often than each rule's gap).
  useEffect(() => {
    const tick = window.setInterval(
      () => {
        const { theme: t, behavior: b, activity: a, transient: tr } = live.current;
        if (a.focus || a.onBreak || tr) return;
        const due = b.random.findIndex(
          (rule, i) => hasState(t, rule.state) && Date.now() >= (nextRandomAt.current[i] ?? Infinity),
        );
        if (due < 0) return;
        const rule = b.random[due];
        playTransient({ kind: 'random', state: rule.state, rule: due }, rule.seconds, () =>
          scheduleRandom(live.current.behavior.random, due),
        );
      },
      FAST ? 1_000 : 20_000,
    );
    return () => window.clearInterval(tick);
  }, [playTransient, scheduleRandom]);

  // ---- messages from the main process --------------------------------------
  useEffect(() => {
    const off = window.petAPI?.onState((data) => {
      const { theme: t, behavior: b } = live.current;
      if (data.type === 'focus') {
        setActivity((prev) => ({
          ...prev,
          focus: data.active,
          title: data.active ? (data.title ?? '') : prev.title,
          paused: data.active ? prev.paused : false,
        }));
        // 开始专注时打断正在播放的随机动作
        if (data.active && live.current.transient?.kind === 'random') stopTransient();
      } else if (data.type === 'activity') {
        setActivity((prev) => ({ ...prev, paused: data.paused, onBreak: data.onBreak }));
      } else if (data.type === 'theme') {
        setThemeId(data.id);
        saveThemeId(data.id);
        stopTransient();
      } else if (data.type === 'themes-changed') {
        reloadCustomThemes();
      } else if (data.type === 'celebrate') {
        const state = hasState(t, b.celebrate.state) ? b.celebrate.state : 'celebrate';
        playTransient({ kind: 'celebrate', state }, b.celebrate.seconds);
      } else if (data.type === 'preview') {
        playTransient({ kind: 'preview', state: data.state }, PREVIEW_SECONDS);
      }
    });
    return () => {
      window.clearTimeout(transientTimer.current);
      off?.();
    };
  }, [playTransient, stopTransient, reloadCustomThemes]);

  // ---- drag + click --------------------------------------------------------
  const grab = useRef({
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { offsetX, offsetY, startX, startY } = grab.current;
    if (
      Math.abs(e.screenX - startX) > DRAG_THRESHOLD ||
      Math.abs(e.screenY - startY) > DRAG_THRESHOLD
    ) {
      grab.current.moved = true;
    }
    window.petAPI?.move(e.screenX - offsetX, e.screenY - offsetY);
  }, []);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setDragging(false);
    if (!grab.current.moved) {
      window.petAPI?.toggleMain();
    }
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      grab.current = {
        offsetX: e.clientX,
        offsetY: e.clientY,
        startX: e.screenX,
        startY: e.screenY,
        moved: false,
      };
      setDragging(true);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [handleMouseMove, handleMouseUp],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    window.petAPI?.contextMenu();
  }, []);

  const showTitle = activity.focus && !transient;
  const isCelebrating = transient?.kind === 'celebrate';
  const bubbleText = isCelebrating
    ? '完成啦! 🎉'
    : transient
      ? '喵~ 🐾'
      : activity.onBreak
        ? '休息一下 ☕'
        : '点我打开 ✨';
  const size = stateSize(theme, petState);

  return (
    <div className="pet-stage">
      <div
        className={`pet pet--m-${stateMotion(theme, petState)} ${dragging ? 'pet--dragging' : ''}`}
        style={{ width: maxSize + 20, height: maxSize + 20 }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="点我打开/收起主界面 · 拖我移动 · 右键预览动作/退出"
      >
        {showTitle && (
          <div className="pet-title" title={activity.title || '专注中'}>
            {activity.paused ? '⏸' : '🍅'} {activity.title || '专注中'}
          </div>
        )}
        {(hovered || isCelebrating) && !showTitle && !dragging && (
          <div className="pet-bubble">{bubbleText}</div>
        )}
        <div className="pet-cat-wrap">
          <PetView
            theme={theme}
            state={petState}
            size={size}
            brokenUrls={brokenUrls}
            onImageError={(url) => {
              if (theme.kind === 'custom') {
                // 上传的某个文件坏了：只有这个状态改用内置小猫。
                setBrokenUrls((prev) => new Set(prev).add(url));
                return;
              }
              // A broken/missing theme asset falls back to the built-in cat.
              setThemeId(DEFAULT_THEME_ID);
              saveThemeId(DEFAULT_THEME_ID);
            }}
          />
        </div>
        <div className="pet-shadow" style={{ width: Math.round(size * 0.63) }} />
      </div>
    </div>
  );
};

export default DesktopPet;
