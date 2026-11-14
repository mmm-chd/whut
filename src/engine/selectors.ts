import type { SceneStatus } from './types';

export interface ContinueState {
  status: SceneStatus;
  requiredInteractions: readonly string[];
  completedInteractions: readonly string[];
}

export function canContinue({
  status,
  requiredInteractions,
  completedInteractions,
}: ContinueState): boolean {
  if (status !== 'waiting') {
    return false;
  }

  const completed = new Set(completedInteractions);
  return requiredInteractions.every((interactionId) => completed.has(interactionId));
}
