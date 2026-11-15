import { describe, expect, it } from 'vitest';
import { P04_POINT_IDS } from '../scene-04-percy-inspection/inspectionState';
import { P05_PANEL_CATEGORY, P05_PANEL_MEDIA } from './panelCopy';
import { INSPECTOR_BACKGROUND, INSPECTOR_BACKGROUND_LIGHT } from '../scene-04-percy-inspection/inspector/modelConfig';

/**
 * The panel's category line and its reserved media slot, per part.
 *
 * Only the two media-led parts get a slot: MOXIE and the Earth team are
 * interactions, so their primary content is the activity itself.
 */
describe('p05 panel copy', () => {
  it('labels every part with a category', () => {
    for (const point of P04_POINT_IDS) {
      expect(P05_PANEL_CATEGORY[point].length).toBeGreaterThan(3);
    }
    expect(P05_PANEL_CATEGORY.cameras).toBe('Imaging system');
    expect(P05_PANEL_CATEGORY['earth-team']).toBe('Mission operations');
  });

  it('reserves a media slot only where the content is media', () => {
    expect(P05_PANEL_MEDIA.cameras).not.toBeNull();
    expect(P05_PANEL_MEDIA.microphone).not.toBeNull();
    expect(P05_PANEL_MEDIA.moxie).toBeNull();
    expect(P05_PANEL_MEDIA['earth-team']).toBeNull();
    // An empty slot must say it is empty, never pretend to hold a recording.
    expect(P05_PANEL_MEDIA.cameras?.note).toContain('not loaded yet');
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
