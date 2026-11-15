import { describe, expect, it } from 'vitest';
import { CURSOR_ART, cursorCss, cursorDataUri, type CursorKind } from './cursors';

const KINDS: readonly CursorKind[] = ['default', 'active', 'grab', 'grabbing'];

/**
 * The cursors are the picture's pointing devices, so each one has to be usable
 * on its own: a data URI a browser accepts, a hotspot inside the box, and a CSS
 * fallback for engines that refuse the URI.
 */

describe('cursor art', () => {
  it('draws one glyph per state, each with its own shape', () => {
    const bodies = KINDS.map((kind) => CURSOR_ART[kind].body);
    expect(new Set(bodies).size).toBe(KINDS.length);
    for (const body of bodies) {
      expect(body.length).toBeGreaterThan(40);
      expect(body).toContain('stroke');
    }
  });

  it('keeps every hotspot inside the 24 x 26 box', () => {
    for (const kind of KINDS) {
      const [x, y] = CURSOR_ART[kind].hotspot;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(24);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(26);
    }
  });
});

describe('cursorDataUri', () => {
  it('returns an inline SVG the browser can read', () => {
    const uri = cursorDataUri('grab');
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true);
    const svg = decodeURIComponent(uri.replace('data:image/svg+xml,', ''));
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 24 26"');
    // No raw quote survives encoding, so nothing can break out of url("...").
    expect(uri).not.toContain('"');
    expect(uri).not.toContain('(');
  });

  it('gives every state a different drawing', () => {
    const uris = KINDS.map(cursorDataUri);
    expect(new Set(uris).size).toBe(KINDS.length);
  });
});

describe('cursorCss', () => {
  it('carries the hotspot and the fallback', () => {
    expect(cursorCss('default')).toMatch(/^url\("data:image\/svg\+xml,.*"\) 5 3, auto$/u);
    expect(cursorCss('active', 'pointer')).toMatch(/, pointer$/u);
    expect(cursorCss('grab', 'grab')).toMatch(/, grab$/u);
    expect(cursorCss('grabbing')).toMatch(/^url\(".*"\) \d+ \d+, auto$/u);
  });
});