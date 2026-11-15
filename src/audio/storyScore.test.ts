import { describe, expect, it } from 'vitest';
import { assetManifest } from '../assets/manifest';
import { p02CriticalAssetIds, p02DeferredAssetIds } from '../scenes/scene-02-launch-to-mars/assets';
import { p03DeferredAssetIds } from '../scenes/scene-03-arrival-jezero/assets';
import { MENU_SCORE_ID } from './useMenuScore';

/**
 * The Perseverance story (P-01 take-off, P-02 launch to Mars, P-03 arrival)
 * shares one looping score. It used to be `music-kindred-spirits`; the story
 * now runs on `music-perseverance`, so every scene that preloads or starts
 * music must point at the new id or the score silently drops out.
 */

const STORY_MUSIC = 'music-perseverance';
const RETIRED_MUSIC = 'music-kindred-spirits';

describe('perseverance score', () => {
  it('is registered as a playable looping track', () => {
    const entry = assetManifest[STORY_MUSIC];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('audio');
    expect(entry.path).toBeTruthy();
    expect(entry.path).toMatch(/\.mp3$/);
  });

  it('is a different file from the retired track', () => {
    expect(assetManifest[STORY_MUSIC].path).not.toBe(assetManifest[RETIRED_MUSIC].path);
    expect(assetManifest[STORY_MUSIC].path).toMatch(/bgm-[\w-]+\.mp3$/);
  });

  it('is preloaded by the launch and arrival scenes', () => {
    // Music is a deferred asset: it may arrive late without blocking the story.
    expect(p02DeferredAssetIds).toContain(STORY_MUSIC);
    expect(p02DeferredAssetIds).not.toContain(RETIRED_MUSIC);
    expect(p03DeferredAssetIds).toContain(STORY_MUSIC);
    expect(p03DeferredAssetIds).not.toContain(RETIRED_MUSIC);
  });

  it('leaves no scene on the retired track', () => {
    for (const ids of [p02CriticalAssetIds, p02DeferredAssetIds, p03DeferredAssetIds]) {
      expect(ids).not.toContain(RETIRED_MUSIC);
    }
  });
});

describe('menu score', () => {
  it('is a separate looping track for the pages outside the story', () => {
    const entry = assetManifest[MENU_SCORE_ID];
    expect(entry).toBeDefined();
    expect(entry.type).toBe('audio');
    expect(entry.path).toMatch(/bgm-[\w-]+\.mp3$/);
    expect(entry.path).not.toBe(assetManifest[STORY_MUSIC].path);
  });
});
