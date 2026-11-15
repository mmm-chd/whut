import { describe, expect, it } from 'vitest';
import { P04_POINT_IDS } from '../scene-04-percy-inspection/inspectionState';
import { P05_PANEL_CATEGORY } from './panelCopy';
import { P05_MEDIA, mediaHasSound, youtubeEmbedUrl } from './panelMedia';
import { INSPECTOR_BACKGROUND, INSPECTOR_BACKGROUND_LIGHT } from '../scene-04-percy-inspection/inspector/modelConfig';

/**
 * The panel's category line and its media, per part.
 */
describe('p05 panel copy', () => {
  it('labels every part with a category', () => {
    for (const point of P04_POINT_IDS) {
      expect(P05_PANEL_CATEGORY[point].length).toBeGreaterThan(3);
    }
    expect(P05_PANEL_CATEGORY.cameras).toBe('Imaging system');
    expect(P05_PANEL_CATEGORY['earth-team']).toBe('Mission operations');
  });

  it('gives media to the camera, microphone and MOXIE cards, and none to the Earth team', () => {
    expect(P05_MEDIA.cameras?.kind).toBe('gif');
    expect(P05_MEDIA.microphone).toEqual(expect.objectContaining({ kind: 'youtube', id: 'GHenFGnixzU' }));
    expect(P05_MEDIA.moxie).toEqual(expect.objectContaining({ kind: 'youtube', id: 'WHodcMRoRZw' }));
    expect(P05_MEDIA['earth-team']).toBeNull();
  });

  it('embeds video through the privacy-friendly domain, and only video has sound', () => {
    expect(youtubeEmbedUrl('abc')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/abc\?/);
    expect(mediaHasSound(P05_MEDIA.microphone)).toBe(true);
    expect(mediaHasSound(P05_MEDIA.cameras)).toBe(false);
    expect(mediaHasSound(P05_MEDIA['earth-team'])).toBe(false);
  });
});

describe('the close-up stage', () => {
  it('is light, which is the one theme this scene ships', () => {
    const luminance = (hex: string): number => {
      const value = Number.parseInt(hex.slice(1), 16);
      const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    expect(luminance(INSPECTOR_BACKGROUND_LIGHT)).toBeGreaterThan(200);
    expect(luminance(INSPECTOR_BACKGROUND_LIGHT)).toBeGreaterThan(
      luminance(INSPECTOR_BACKGROUND) + 100,
    );
  });
});
