import { create } from 'zustand';
import type { DialogueLine } from './types';

/** The line currently on screen, with a key so re-cues remount fresh. */
export interface ActiveDialogue {
  line: DialogueLine;
  key: number;
}

interface QueuedDialogue {
  line: DialogueLine;
  /** The scene timeline paused at this line's gate and waits for it. */
  holdsStory: boolean;
}

interface DialogueState {
  active: (ActiveDialogue & { holdsStory: boolean }) | null;
  queue: QueuedDialogue[];
  nextKey: number;
  /**
   * Registered by the scene when its timeline pauses at a dialogue gate.
   * Invoked once when the line that owns the pause resolves, so the scene
   * never needs to know when or how the player advances a line.
   */
  releaseStory: (() => void) | null;

  /**
   * Offer a line to the dialogue system. Scene events (timeline labels,
   * interactions) may only cue — they can never clear or replace the active
   * text directly; a cued line simply waits here until the active one leaves.
   */
  cue: (line: DialogueLine) => void;
  /**
   * Finish the active line: promote the next queued line, or clear the
   * dialogue. Called by the player (Continue) or an auto-advance delay —
   * never by a scene transition.
   */
  resolve: () => void;
  /**
   * Bind the current timeline pause to a line: when that line resolves, the
   * registered release resumes the story. If the line is already gone the
   * release runs immediately so the pause cannot deadlock.
   */
  holdStory: (lineId: string, release: () => void) => void;
  /**
   * Drop everything. Teardown only (scene unmount, fresh scene run) — not a
   * transition. A held pause is deliberately not released: the timeline is
   * being killed or restarted with the scene.
   */
  clear: () => void;
}

export const useDialogueStore = create<DialogueState>((set, get) => ({
  active: null,
  queue: [],
  nextKey: 1,
  releaseStory: null,

  cue: (line) => {
    const { active, queue, nextKey } = get();
    if (active?.line.id === line.id || queue.some((entry) => entry.line.id === line.id)) {
      return;
    }
    if (active) {
      set({ queue: [...queue, { line, holdsStory: false }] });
      return;
    }
    set({ active: { line, key: nextKey, holdsStory: false }, nextKey: nextKey + 1 });
  },

  resolve: () => {
    const { active, queue, nextKey, releaseStory } = get();
    if (!active) {
      return;
    }
    const [next, ...rest] = queue;
    set({
      active: next ? { line: next.line, key: nextKey, holdsStory: next.holdsStory } : null,
      queue: rest,
      nextKey: next ? nextKey + 1 : nextKey,
      // A pending release may belong to the next line's gate (it can fire
      // while another line is still active), so only consume it here when
      // this line actually owned the pause.
      releaseStory: active.holdsStory ? null : releaseStory,
    });
    if (active.holdsStory) {
      releaseStory?.();
    }
  },

  holdStory: (lineId, release) => {
    const { active, queue } = get();
    if (active?.line.id === lineId) {
      set({ active: { ...active, holdsStory: true }, releaseStory: release });
      return;
    }
    const index = queue.findIndex((entry) => entry.line.id === lineId);
    if (index >= 0) {
      set({
        queue: queue.map((entry, i) => (i === index ? { ...entry, holdsStory: true } : entry)),
        releaseStory: release,
      });
      return;
    }
    // The line already resolved and left (e.g. the player was faster than the
    // playhead): holding would deadlock, so the story continues at once.
    release();
  },

  clear: () => set({ active: null, queue: [], nextKey: 1, releaseStory: null }),
}));
