import type { SceneStatus } from './types';

const allowedTransitions: Record<SceneStatus, readonly SceneStatus[]> = {
  idle: ['playing'],
  playing: ['waiting', 'idle'],
  waiting: ['completed', 'idle'],
  completed: ['idle'],
};

export function canTransition(from: SceneStatus, to: SceneStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: SceneStatus, to: SceneStatus): SceneStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid scene status transition: ${from} -> ${to}`);
  }
  return to;
}
