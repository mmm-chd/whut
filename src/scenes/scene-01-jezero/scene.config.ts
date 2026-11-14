import type { SceneConfig } from '../../engine/types';

export const scene01Config: SceneConfig = {
  id: 'p01-jezero',
  title: 'Pagi di Jezero',
  requiredInteractions: ['rock-a', 'rock-b', 'rock-c'],
  assets: {
    critical: [
      'bg-space',
      'bg-sky',
      'bg-cloud-1',
      'bg-cloud-2',
      'bg-cloud-3',
      'bg-ridge-far',
      'bg-ridge-near',
      'bg-ground',
      'fg-band',
      'rover',
      'rover-shadow',
    ],
    deferred: ['rock-a', 'rock-b', 'rock-c', 'ui-card-frame', 'ui-hand', 'fg-band-wide'],
  },
};
