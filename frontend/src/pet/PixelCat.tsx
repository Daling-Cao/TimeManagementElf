import { useEffect, useRef } from 'react';
import spriteData from './sprites.json';
import type { PetVisualState } from './petAPI';

const palette = spriteData.palette as Record<string, string>;
const SIZE = spriteData.size;
const states = spriteData.states as Record<
  string,
  { fps: number; frames: string[][] }
>;

interface PixelCatProps {
  state: PetVisualState;
  scale?: number;
}

const PixelCat = ({ state, scale = 11 }: PixelCatProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<PetVisualState>(state);

  // Reset to the first frame whenever the state changes.
  useEffect(() => {
    stateRef.current = state;
    frameRef.current = 0;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = 0;

    const render = (t: number) => {
      const def = states[stateRef.current] ?? states.idle;
      const fps = def.fps || 4;
      if (t - last >= 1000 / fps) {
        last = t;
        frameRef.current = (frameRef.current + 1) % def.frames.length;
      }
      const frame = def.frames[frameRef.current] ?? def.frames[0];

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let y = 0; y < SIZE; y++) {
        const row = frame[y] ?? '';
        for (let x = 0; x < SIZE; x++) {
          const color = palette[row[x]];
          if (!color) continue;
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [scale]);

  return (
    <canvas
      ref={canvasRef}
      width={SIZE * scale}
      height={SIZE * scale}
      className="pixel-cat"
    />
  );
};

export default PixelCat;
