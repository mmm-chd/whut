import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DialogueLine } from '../../scenes/scene-01-jezero/dialogue';
import { useDialogueStore } from './dialogue.store';

function makeLine(overrides: Partial<DialogueLine> = {}): DialogueLine {
  return {
    id: 'line-a',
    speaker: 'percy',
    text: 'Test line',
    audioId: null,
    timelineLabel: 'test',
    placement: 'bottom',
    advance: 'manual',
    emphasis: false,
    ...overrides,
  };
}

const lineA = makeLine({ id: 'line-a' });
const lineB = makeLine({ id: 'line-b' });

function resetStore() {
  useDialogueStore.setState({ active: null, queue: [], nextKey: 1, releaseStory: null });
}

beforeEach(resetStore);

describe('dialogue store', () => {
  describe('cue', () => {
    it('shows a line immediately when the dialogue is idle', () => {
      useDialogueStore.getState().cue(lineA);

      expect(useDialogueStore.getState().active).toMatchObject({
        line: lineA,
        key: 1,
        holdsStory: false,
      });
      expect(useDialogueStore.getState().queue).toEqual([]);
    });

    it('queues a new line while another one is active — scene events never replace text', () => {
      useDialogueStore.getState().cue(lineA);
      useDialogueStore.getState().cue(lineB);

      expect(useDialogueStore.getState().active?.line.id).toBe('line-a');
      expect(useDialogueStore.getState().queue).toEqual([{ line: lineB, holdsStory: false }]);
    });

    it('ignores a cue for the line that is already active', () => {
      useDialogueStore.getState().cue(lineA);
      useDialogueStore.getState().cue(lineA);

      expect(useDialogueStore.getState().active?.key).toBe(1);
      expect(useDialogueStore.getState().queue).toEqual([]);
    });

    it('ignores a cue for a line that is already queued', () => {
      useDialogueStore.getState().cue(lineA);
      useDialogueStore.getState().cue(lineB);
      useDialogueStore.getState().cue(lineB);

      expect(useDialogueStore.getState().queue).toHaveLength(1);
    });
  });

  describe('resolve', () => {
    it('promotes the next queued line with a fresh key', () => {
      useDialogueStore.getState().cue(lineA);
      useDialogueStore.getState().cue(lineB);

      useDialogueStore.getState().resolve();

      expect(useDialogueStore.getState().active).toMatchObject({ line: lineB, key: 2 });
      expect(useDialogueStore.getState().queue).toEqual([]);
    });

    it('clears the dialogue when the queue is empty', () => {
      useDialogueStore.getState().cue(lineA);

      useDialogueStore.getState().resolve();

      expect(useDialogueStore.getState().active).toBeNull();
    });

    it('resolves nothing when the dialogue is idle', () => {
      useDialogueStore.getState().resolve();

      expect(useDialogueStore.getState().active).toBeNull();
    });

    it('releases the story only when the resolved line held it', () => {
      const release = vi.fn();
      useDialogueStore.setState({
        active: { line: lineA, key: 1, holdsStory: true },
        releaseStory: release,
      });

      useDialogueStore.getState().resolve();

      expect(release).toHaveBeenCalledTimes(1);
      expect(useDialogueStore.getState().releaseStory).toBeNull();
    });

    it('keeps a pending release that belongs to the next line, not the resolved one', () => {
      // The percy-03 gate can fire while percy-02 is still active: the
      // release is registered for the queued line and must survive the
      // unrelated resolve in between.
      const release = vi.fn();
      useDialogueStore.setState({
        active: { line: lineA, key: 1, holdsStory: false },
        queue: [{ line: lineB, holdsStory: true }],
        releaseStory: release,
      });

      useDialogueStore.getState().resolve();
      expect(release).not.toHaveBeenCalled();
      expect(useDialogueStore.getState().releaseStory).toBe(release);

      useDialogueStore.getState().resolve();
      expect(release).toHaveBeenCalledTimes(1);
    });
  });

  describe('holdStory', () => {
    it('marks the active line as holding the story', () => {
      const release = vi.fn();
      useDialogueStore.setState({ active: { line: lineA, key: 1, holdsStory: false } });

      useDialogueStore.getState().holdStory('line-a', release);

      expect(useDialogueStore.getState().active?.holdsStory).toBe(true);
      expect(useDialogueStore.getState().releaseStory).toBe(release);
    });

    it('marks a queued line so its own resolve releases the story', () => {
      const release = vi.fn();
      useDialogueStore.setState({
        active: { line: lineA, key: 1, holdsStory: false },
        queue: [{ line: lineB, holdsStory: false }],
      });

      useDialogueStore.getState().holdStory('line-b', release);
      expect(useDialogueStore.getState().queue[0].holdsStory).toBe(true);

      // The intermediate line resolves first; no release yet.
      useDialogueStore.getState().resolve();
      expect(release).not.toHaveBeenCalled();

      // The holding line resolves and the story continues.
      useDialogueStore.getState().resolve();
      expect(release).toHaveBeenCalledTimes(1);
    });

    it('releases immediately when the line is already gone', () => {
      const release = vi.fn();
      useDialogueStore.setState({ active: { line: lineA, key: 1, holdsStory: false } });

      useDialogueStore.getState().holdStory('line-c', release);

      expect(release).toHaveBeenCalledTimes(1);
      expect(useDialogueStore.getState().active?.holdsStory).toBe(false);
    });
  });

  describe('clear', () => {
    it('drops active line, queue and hold without releasing', () => {
      const release = vi.fn();
      useDialogueStore.setState({
        active: { line: lineA, key: 3, holdsStory: true },
        queue: [{ line: lineB, holdsStory: false }],
        releaseStory: release,
      });

      useDialogueStore.getState().clear();

      expect(useDialogueStore.getState().active).toBeNull();
      expect(useDialogueStore.getState().queue).toEqual([]);
      expect(useDialogueStore.getState().releaseStory).toBeNull();
      expect(release).not.toHaveBeenCalled();
    });

    it('restarts the key counter so a fresh scene run remounts lines', () => {
      useDialogueStore.getState().cue(lineA);
      useDialogueStore.getState().resolve();
      useDialogueStore.getState().clear();
      useDialogueStore.getState().cue(lineA);

      expect(useDialogueStore.getState().active?.key).toBe(1);
    });
  });
});
