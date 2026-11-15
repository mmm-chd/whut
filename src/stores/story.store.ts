import { create } from 'zustand';
import { canTransition } from '../engine/status';
import type { SceneStatus, StorySettings } from '../engine/types';

interface StoryState {
  activeSceneId: string | null;
  status: SceneStatus;
  isPaused: boolean;
  completedInteractions: string[];
  settings: StorySettings;
  startScene: (sceneId: string) => void;
  setStatus: (status: SceneStatus) => void;
  setPaused: (isPaused: boolean) => void;
  markInteractionComplete: (interactionId: string) => void;
  resetScene: () => void;
  /**
   * Forget the whole story run: no active scene, nothing completed. Settings stay.
   * `resetScene` keeps the active scene id, so it cannot restart or leave a story.
   */
  resetStory: () => void;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setReducedMotion: (reducedMotion: boolean) => void;
}

const initialSettings: StorySettings = {
  muted: false,
  volume: 0.8,
  reducedMotion: false,
};

export const useStoryStore = create<StoryState>((set) => ({
  activeSceneId: null,
  status: 'idle',
  isPaused: false,
  completedInteractions: [],
  settings: initialSettings,
  startScene: (sceneId) =>
    set({
      activeSceneId: sceneId,
      status: 'playing',
      isPaused: false,
      completedInteractions: [],
    }),
  setStatus: (status) =>
    set((state) => {
      if (!canTransition(state.status, status)) {
        console.warn(`[story] Ignored invalid status transition: ${state.status} -> ${status}`);
        return {};
      }
      return { status };
    }),
  setPaused: (isPaused) => set({ isPaused }),
  markInteractionComplete: (interactionId) =>
    set((state) => {
      if (state.completedInteractions.includes(interactionId)) {
        return {};
      }
      return { completedInteractions: [...state.completedInteractions, interactionId] };
    }),
  resetScene: () =>
    set({
      status: 'idle',
      isPaused: false,
      completedInteractions: [],
    }),
  resetStory: () =>
    set({
      activeSceneId: null,
      status: 'idle',
      isPaused: false,
      completedInteractions: [],
    }),
  setMuted: (muted) => set((state) => ({ settings: { ...state.settings, muted } })),
  setVolume: (volume) =>
    set((state) => ({
      settings: {
        ...state.settings,
        volume: Math.min(1, Math.max(0, volume)),
      },
    })),
  setReducedMotion: (reducedMotion) =>
    set((state) => ({ settings: { ...state.settings, reducedMotion } })),
}));
