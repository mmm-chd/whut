import { create } from 'zustand';

/**
 * Top-level experience stage, above the story engine: the splash screen and
 * the homepage launchpad come before the reader enters the story sequence.
 * The 2.5D adventure journal sits between the launch and the story.
 */
export type ExperienceStage = 'splash' | 'homepage' | 'book' | 'story';

interface ExperienceState {
  stage: ExperienceStage;
  setStage: (stage: ExperienceStage) => void;
}

export const useExperienceStore = create<ExperienceState>((set) => ({
  stage: 'splash',
  setStage: (stage) => set({ stage }),
}));
