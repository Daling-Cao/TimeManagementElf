import { useCallback, useRef, useState } from 'react';

const DRAG_THRESHOLD = 4; // px of movement before it counts as a drag

const DesktopPet = () => {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Offset of the cursor inside the window at mousedown, the screen position
  // where the press started, and whether the pointer moved far enough to count
  // as a drag (vs a click).
  const grab = useRef({
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { offsetX, offsetY, startX, startY } = grab.current;
    const nextX = e.screenX - offsetX;
    const nextY = e.screenY - offsetY;
    if (
      Math.abs(e.screenX - startX) > DRAG_THRESHOLD ||
      Math.abs(e.screenY - startY) > DRAG_THRESHOLD
    ) {
      grab.current.moved = true;
    }
    window.petAPI?.move(nextX, nextY);
  }, []);

  const handleMouseUp = useCallback(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    setDragging(false);
    // A press without meaningful movement is a click → toggle the app.
    if (!grab.current.moved) {
      window.petAPI?.toggleMain();
    }
  }, [handleMouseMove]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return; // only left button drags/clicks
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

  return (
    <div className="pet-stage">
      <div
        className={`pet ${dragging ? 'pet--dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="点我打开时间管理小精灵 · 拖我移动 · 右键更多"
      >
        {hovered && !dragging && (
          <div className="pet-bubble">点我打开 ✨</div>
        )}
        <img
          className="pet-cat"
          src="./cat.png"
          alt="桌面小猫"
          draggable={false}
        />
        <div className="pet-shadow" />
      </div>
    </div>
  );
};

export default DesktopPet;
