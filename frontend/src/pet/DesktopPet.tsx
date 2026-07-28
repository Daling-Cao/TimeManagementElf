import { useCallback, useEffect, useRef, useState } from 'react';
import PixelCat from './PixelCat';
import type { PetVisualState } from './petAPI';

const DRAG_THRESHOLD = 4; // px of movement before it counts as a drag

// "fast" mode (add ?fast to the pet URL) shortens the playful cooldown so the
// behaviour can be demoed without waiting half an hour.
const FAST = new URLSearchParams(window.location.search).has('fast');
const PLAY_MIN_GAP_MS = FAST ? 12_000 : 30 * 60 * 1000; // >= 30 min between plays
const PLAY_GAP_JITTER_MS = FAST ? 8_000 : 15 * 60 * 1000;
const PLAY_DURATION_MS = 6_000;
const CELEBRATE_DURATION_MS = 6_000;

const DesktopPet = () => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [petState, setPetState] = useState<PetVisualState>('idle');

  const stateRef = useRef<PetVisualState>('idle');
  const nextPlayAt = useRef(0);
  const returnTimer = useRef<number | undefined>(undefined);

  const setState = useCallback((next: PetVisualState) => {
    stateRef.current = next;
    setPetState(next);
  }, []);

  // ---- state machine / scheduler ------------------------------------------
  useEffect(() => {
    const schedulePlay = () => {
      nextPlayAt.current =
        Date.now() + PLAY_MIN_GAP_MS + Math.random() * PLAY_GAP_JITTER_MS;
    };
    const goIdle = () => {
      setState('idle');
      schedulePlay();
    };
    const enterTransient = (s: PetVisualState, ms: number) => {
      window.clearTimeout(returnTimer.current);
      setState(s);
      returnTimer.current = window.setTimeout(goIdle, ms);
    };

    schedulePlay();

    // Randomly become playful while idle (never more often than the min gap).
    const tick = window.setInterval(
      () => {
        if (stateRef.current === 'idle' && Date.now() >= nextPlayAt.current) {
          enterTransient('play', PLAY_DURATION_MS);
        }
      },
      FAST ? 1_000 : 20_000,
    );

    const off = window.petAPI?.onState((data) => {
      if (data.type === 'focus') {
        if (data.active) {
          window.clearTimeout(returnTimer.current);
          setState('focus');
        } else if (stateRef.current === 'focus') {
          goIdle();
        }
      } else if (data.type === 'celebrate') {
        enterTransient('celebrate', CELEBRATE_DURATION_MS);
      } else if (data.type === 'preview') {
        if (data.state === 'play') enterTransient('play', PLAY_DURATION_MS);
        else if (data.state === 'celebrate')
          enterTransient('celebrate', CELEBRATE_DURATION_MS);
        else {
          window.clearTimeout(returnTimer.current);
          setState(data.state);
          if (data.state === 'idle') schedulePlay();
        }
      }
    });

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(returnTimer.current);
      off?.();
    };
  }, [setState]);

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

  const bubbleText: Record<PetVisualState, string> = {
    idle: '点我打开 ✨',
    focus: '专注中… 🐾',
    celebrate: '完成啦! 🎉',
    play: '喵~ 🐾',
  };

  return (
    <div className="pet-stage">
      <div
        className={`pet pet--${petState} ${dragging ? 'pet--dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="点我打开/收起主界面 · 拖我移动 · 右键预览动作/退出"
      >
        {(hovered || petState === 'celebrate') && !dragging && (
          <div className="pet-bubble">{bubbleText[petState]}</div>
        )}
        <div className="pet-cat-wrap">
          <PixelCat state={petState} scale={12} />
        </div>
        <div className="pet-shadow" />
      </div>
    </div>
  );
};

export default DesktopPet;
