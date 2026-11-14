import { describe, expect, it } from 'vitest';
import { useExperienceStore } from './experience.store';

describe('experience store', () => {
  it('starts on the splash stage', () => {
    expect(useExperienceStore.getState().stage).toBe('splash');
  });

  it('moves splash -> homepage -> book -> story', () => {
    const store = useExperienceStore.getState();
    store.setStage('homepage');
    expect(useExperienceStore.getState().stage).toBe('homepage');
    store.setStage('book');
    expect(useExperienceStore.getState().stage).toBe('book');
    store.setStage('story');
    expect(useExperienceStore.getState().stage).toBe('story');
  });
});
