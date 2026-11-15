import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../audio/audioManager';
import { resetAudioManager } from '../../audio/audioManagerInstance';
import { useStoryStore } from '../../stores/story.store';
import { DialogueLayer } from './DialogueLayer';
import { useDialogueStore } from './dialogue.store';
import type { DialogueLine } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const line: DialogueLine = {
  id: 'narrator-01',
  speaker: 'narrator',
  text: 'Far deep in the Jezero Crater.',
  audioId: 'vo-narrator-01',
  timelineLabel: 'descend',
  placement: 'narrator-top-right',
  advance: 'manual',
  holdsStory: true,
  emphasis: false,
};

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  resetAudioManager();
  useDialogueStore.getState().clear();
  useStoryStore.setState({ status: 'playing', isPaused: false });
  vi.spyOn(AudioManager.prototype, 'play').mockReturnValue(true);
  vi.spyOn(AudioManager.prototype, 'stop');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<DialogueLayer />);
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
  vi.restoreAllMocks();
});

describe('DialogueLayer voice-over', () => {
  it('plays a line once, even when the story hold is bound to it', async () => {
    await act(async () => {
      useDialogueStore.getState().cue(line);
    });
    expect(AudioManager.prototype.play).toHaveBeenCalledTimes(1);

    // The timeline reaches the line's gate: the same line is marked as holding the story.
    await act(async () => {
      useDialogueStore.getState().holdStory(line.id, () => {});
    });
    expect(AudioManager.prototype.play).toHaveBeenCalledTimes(1);
    expect(AudioManager.prototype.stop).not.toHaveBeenCalled();
  });

  it('stops the recording when the line leaves', async () => {
    await act(async () => {
      useDialogueStore.getState().cue(line);
    });
    await act(async () => {
      useDialogueStore.getState().resolve();
    });
    expect(AudioManager.prototype.stop).toHaveBeenCalledWith('vo-narrator-01');
  });
});
