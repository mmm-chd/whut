export interface SmokeNode {
  layer: 'far' | 'mid' | 'near';
  left: number;
  top: number;
  size: number;
}

/** Launch smoke at the pad: 18 puffs, six per layer, three shared textures. */
export const SMOKE_NODES: readonly SmokeNode[] = [
  { layer: 'far', left: 720, top: 830, size: 170 },
  { layer: 'far', left: 820, top: 800, size: 150 },
  { layer: 'far', left: 930, top: 790, size: 180 },
  { layer: 'far', left: 1040, top: 815, size: 160 },
  { layer: 'far', left: 1120, top: 860, size: 140 },
  { layer: 'far', left: 880, top: 870, size: 200 },
  { layer: 'mid', left: 690, top: 880, size: 200 },
  { layer: 'mid', left: 800, top: 860, size: 220 },
  { layer: 'mid', left: 920, top: 850, size: 240 },
  { layer: 'mid', left: 1040, top: 870, size: 220 },
  { layer: 'mid', left: 1140, top: 900, size: 200 },
  { layer: 'mid', left: 980, top: 920, size: 230 },
  { layer: 'near', left: 650, top: 940, size: 250 },
  { layer: 'near', left: 780, top: 930, size: 270 },
  { layer: 'near', left: 910, top: 950, size: 280 },
  { layer: 'near', left: 1040, top: 940, size: 260 },
  { layer: 'near', left: 1160, top: 960, size: 240 },
  { layer: 'near', left: 860, top: 990, size: 300 },
];

export const SMOKE_ASSET: Record<SmokeNode['layer'], string> = {
  far: 'p02-smoke-far',
  mid: 'p02-smoke-mid',
  near: 'p02-smoke-near',
};
