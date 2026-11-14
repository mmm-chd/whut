import { AssetImage } from '../../../assets/AssetLoader';

export type PercyState = 'slide-in' | 'idle' | 'look-around' | 'excited';

interface PercyProps {
  state?: PercyState;
}

export function Percy({ state = 'idle' }: PercyProps) {
  return (
    <div className="percy" data-percy data-state={state} role="img" aria-label="Percy the rover">
      <div className="percy__glow" data-percy-glow aria-hidden="true" />
      <AssetImage assetId="rover-shadow" alt="" className="percy__shadow" />
      <AssetImage assetId="rover" alt="" className="percy__rover" />
    </div>
  );
}
