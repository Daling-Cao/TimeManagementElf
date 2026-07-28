import PixelCat from './PixelCat';
import { stateAssetUrl } from './theme';
import type { PetTheme } from './theme';
import type { PetVisualState } from './petAPI';

interface PetViewProps {
  theme: PetTheme;
  state: PetVisualState;
  scale?: number;
  /** Called if an image theme's asset fails to load (so we can fall back). */
  onImageError?: () => void;
}

const PetView = ({ theme, state, scale = 12, onImageError }: PetViewProps) => {
  if (theme.kind === 'builtin') {
    return <PixelCat state={state} scale={scale} />;
  }

  // Image themes: one GIF/PNG/WebP per state (GIF/APNG/animated WebP animate
  // on their own). `key` forces a reload when the state changes so the new
  // animation restarts from its first frame.
  return (
    <img
      key={state}
      className={`pet-theme-img${theme.pixelated ? ' pet-theme-img--pixelated' : ''}`}
      src={stateAssetUrl(theme, state)}
      alt={`${theme.name} - ${state}`}
      draggable={false}
      onError={onImageError}
    />
  );
};

export default PetView;
