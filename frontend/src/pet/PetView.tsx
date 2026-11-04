import PixelCat from './PixelCat';
import { resolveStateSource } from './theme';
import type { PetTheme } from './theme';
import type { PetVisualState } from './petAPI';

interface PetViewProps {
  theme: PetTheme;
  state: PetVisualState;
  scale?: number;
  /** Called if an image asset fails to load (so we can fall back). */
  onImageError?: (url: string) => void;
  /** Image URLs known to be broken: render the built-in cat for those instead. */
  brokenUrls?: ReadonlySet<string>;
}

const PetView = ({ theme, state, scale = 12, onImageError, brokenUrls }: PetViewProps) => {
  const source = resolveStateSource(theme, state);
  if (source.kind === 'builtin' || brokenUrls?.has(source.url)) {
    return <PixelCat state={state} scale={scale} />;
  }

  // Image states: GIF/APNG/animated WebP animate on their own. `key` forces a
  // reload when the state (or file) changes so the animation restarts.
  return (
    <img
      key={`${state}:${source.url}`}
      className={`pet-theme-img${source.pixelated ? ' pet-theme-img--pixelated' : ''}`}
      src={source.url}
      alt={`${theme.name} - ${state}`}
      draggable={false}
      onError={() => onImageError?.(source.url)}
    />
  );
};

export default PetView;
