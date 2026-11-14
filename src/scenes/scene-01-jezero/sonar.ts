import type { SceneStatus } from '../../engine/types';

export type SonarMode = 'run' | 'paused' | 'off';

export interface SonarState {
  status: SceneStatus;
  inspected: boolean;
  paused: boolean;
  cardOpen: boolean;
}

/**
 * Sonar is a hint, never decoration: it only runs while the rock can be
 * inspected, freezes while playback is paused or a card is open, and stops
 * for good once the rock has been inspected.
 */
export function getSonarMode({ status, inspected, paused, cardOpen }: SonarState): SonarMode {
  if (status !== 'waiting' || inspected) {
    return 'off';
  }
  if (paused || cardOpen) {
    return 'paused';
  }
  return 'run';
}
