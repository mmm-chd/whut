import { AssetImage } from '../../../assets/AssetLoader';
import { DESIGN_WIDTH } from '../camera';
import type { RockConfig } from '../rocks.config';
import type { RockId } from '../interactions';
import type { SonarMode } from '../sonar';
import { SonarRings } from './SonarRings';

interface RockProps {
  config: RockConfig;
  inspected: boolean;
  onInspect: (rockId: RockId) => void;
  disabled?: boolean;
  sonarMode: SonarMode;
  reducedMotion?: boolean;
}

export function Rock({ config, inspected, onInspect, disabled, sonarMode, reducedMotion }: RockProps) {
  const { id, alt, worldX, size, baseY } = config;
  const left = (worldX / DESIGN_WIDTH) * 100 - (size * 100) / 2;

  return (
    <button
      type="button"
      className={`rock ${inspected ? 'rock--inspected' : ''}`}
      data-rock={id}
      data-inspected={inspected}
      aria-label={inspected ? `${alt} (inspected)` : `Inspect ${alt}`}
      aria-pressed={inspected}
      disabled={disabled}
      onClick={() => onInspect(id)}
      style={{
        left: `${left}%`,
        width: `${size * 100}%`,
        bottom: `${(1 - baseY) * 100}%`,
      }}
    >
      <SonarRings mode={sonarMode} reducedMotion={reducedMotion} />
      <AssetImage assetId={id} alt="" className="rock__image" />
    </button>
  );
}
