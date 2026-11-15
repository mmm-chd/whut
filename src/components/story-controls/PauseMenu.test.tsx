import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useExperienceStore } from '../../app/experience.store';
import { useStoryStore } from '../../stores/story.store';
import { PauseMenu } from './PauseMenu';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const onResume = vi.fn();

const setSlider = (selector: string, value: string) => {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  setter.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

beforeEach(async () => {
  onResume.mockClear();
  useExperienceStore.setState({ stage: 'story' });
  useStoryStore.setState({
    activeSceneId: 'scene-03-arrival-jezero',
    status: 'playing',
    isPaused: true,
    completedInteractions: [],
    settings: { muted: false, volume: 0.6, reducedMotion: false },
  });
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<PauseMenu onResume={onResume} />);
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('PauseMenu', () => {
  it('is a labelled dialog with the resume button focused', () => {
    expect(container.querySelector('[role="dialog"][aria-modal="true"]')).not.toBeNull();
    expect(document.activeElement?.hasAttribute('data-resume')).toBe(true);
  });

  it('sets voice and music volume apart from the master volume', async () => {
    await act(async () => {
      setSlider('[data-voice-volume]', '0.4');
      setSlider('[data-music-volume]', '0.2');
    });
    const { settings } = useStoryStore.getState();
    expect(settings.voiceVolume).toBeCloseTo(0.4);
    expect(settings.musicVolume).toBeCloseTo(0.2);
    expect(settings.volume).toBe(0.6);
  });

  it('lists every scene and marks the current one', () => {
    const choices = container.querySelectorAll('[data-scene-choice]');
    expect(choices).toHaveLength(10);
    expect(
      container.querySelector('[data-scene-choice="scene-03-arrival-jezero"]')?.getAttribute('aria-current'),
    ).toBe('true');
  });

  it('jumps to a scene and starts it', async () => {
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-scene-choice="scene-06-sample-workflow"]')?.click();
    });
    const story = useStoryStore.getState();
    expect(story.activeSceneId).toBe('scene-06-sample-workflow');
    expect(story.status).toBe('playing');
    expect(story.isPaused).toBe(false);
  });

  it('goes back to P-01 title card from the first scene entry', async () => {
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-scene-choice="p01-jezero"]')?.click();
    });
    expect(useStoryStore.getState().activeSceneId).toBeNull();
    expect(useStoryStore.getState().status).toBe('idle');
  });

  it('returns to the launchpad and keeps the settings', async () => {
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-main-menu]')?.click();
    });
    expect(useExperienceStore.getState().stage).toBe('homepage');
    expect(useStoryStore.getState().activeSceneId).toBeNull();
    expect(useStoryStore.getState().settings.volume).toBe(0.6);
  });

  it('resumes on Escape and on the resume button', async () => {
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onResume).toHaveBeenCalledTimes(1);
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-resume]')?.click();
    });
    expect(onResume).toHaveBeenCalledTimes(2);
  });
});
