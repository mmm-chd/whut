/**
 * Where the two end-of-game choices lead.
 *
 * A destination is a real, registered scene id or `null`. Percy's next chapter
 * is now `scene-07-cheyava-falls`, so that button routes there; Ingenuity's
 * story is still separate work, so its button says so instead of routing
 * nowhere.
 */
export interface NextExperience {
  readonly id: 'percy-story' | 'ingenuity';
  readonly label: string;
  readonly destination: string | null;
  readonly unavailableNote: string;
}

export const NEXT_EXPERIENCES: readonly NextExperience[] = [
  {
    id: 'percy-story',
    label: "Continue Percy's Story",
    destination: 'scene-07-cheyava-falls',
    unavailableNote: "Percy's next chapter is still in development.",
  },
  {
    id: 'ingenuity',
    label: 'Meet Ingenuity',
    destination: null,
    unavailableNote: 'His story is coming soon.',
  },
];

export function isNavigable(experience: NextExperience): boolean {
  return experience.destination !== null;
}

/**
 * The only choice that finishes the scene today is the Percy one: it ends the
 * sampling scene into the shell's "to be continued" screen. Ingenuity never
 * completes anything until it has a real route.
 */
export function finishesScene(experience: NextExperience): boolean {
  return experience.id === 'percy-story';
}
