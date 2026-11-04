import PixelCat from './PixelCat';
import { isStandardState, resolveStateSource, stateSize } from './theme';
import type { PetTheme } from './theme';
import type { PetStateId } from './petAPI';

interface PetViewProps {
  theme: PetTheme;
  state: PetStateId;
  /** Display size in px (defaults to the theme's size for this state). */
  size?: number;
  /** Called if an image asset fails to load (so we can fall back). */
  onImageError?: (url: string) => void;
  /** Image URLs known to be broken: render the built-in cat for those instead. */
  brokenUrls?: ReadonlySet<string>;
}

const PetView = ({ theme, state, size, onImageError, brokenUrls }: PetViewProps) => {
  const px = size ?? stateSize(theme, state);
  const source = resolveStateSource(theme, state);
  if (source.kind === 'builtin' || brokenUrls?.has(source.url)) {
    // The pixel cat is a 16×16 grid drawn at an integer scale.
    const fallbackState =
      source.kind === 'builtin' ? source.state : isStandardState(state) ? state : 'idle';
    return <PixelCat state={fallbackState} scale={Math.max(2, Math.round(px / 16))} />;
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
      style={{ width: px, height: px }}
      onError={() => onImageError?.(source.url)}
    />
  );
};

export default PetView;
