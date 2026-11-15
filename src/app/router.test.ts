import { describe, expect, it } from 'vitest';
import {
  ROUTE_PATHS,
  bootStage,
  isCanonicalPath,
  pathForRoute,
  routeForPath,
  routeForStage,
  stageForRoute,
} from './router';

/**
 * The address bar is part of the experience now: home, the character selection
 * and the story each own a path (concept 9), and the back button must walk the
 * journey backwards.
 */

describe('route parsing', () => {
  it('maps the three documents', () => {
    expect(routeForPath('/')).toBe('home');
    expect(routeForPath('/characters')).toBe('characters');
    expect(routeForPath('/story')).toBe('story');
  });

  it('tolerates a trailing slash and casing', () => {
    expect(routeForPath('/characters/')).toBe('characters');
    expect(routeForPath('/Characters')).toBe('characters');
    expect(routeForPath('')).toBe('home');
  });

  it('falls back to home for unknown paths', () => {
    expect(routeForPath('/nope')).toBe('home');
    expect(routeForPath('/characters/percy')).toBe('home');
  });

  it('round-trips every route to its path', () => {
    for (const [route, path] of Object.entries(ROUTE_PATHS)) {
      expect(pathForRoute(route as keyof typeof ROUTE_PATHS)).toBe(path);
      expect(routeForPath(path)).toBe(route);
    }
  });
});

describe('stage mapping', () => {
  it('renders the journal for the characters route', () => {
    expect(stageForRoute('characters')).toBe('book');
    expect(routeForStage('book')).toBe('characters');
  });

  it('shares "/" between the splash and the homepage', () => {
    expect(routeForStage('splash')).toBe('home');
    expect(routeForStage('homepage')).toBe('home');
    expect(stageForRoute('home')).toBe('homepage');
  });

  it('routes the story engine to /story', () => {
    expect(stageForRoute('story')).toBe('story');
    expect(routeForStage('story')).toBe('story');
  });
});

describe('boot stage', () => {
  it('plays the splash when landing on the homepage', () => {
    expect(bootStage('/')).toBe('splash');
  });

  it('skips the intro when deep linking to a later stage', () => {
    expect(bootStage('/characters')).toBe('book');
    expect(bootStage('/story')).toBe('story');
  });

  it('falls back to the splash for unknown paths', () => {
    expect(bootStage('/missing')).toBe('splash');
  });
});

describe('canonical paths', () => {
  it('accepts the exact spelling only', () => {
    expect(isCanonicalPath('/')).toBe(true);
    expect(isCanonicalPath('/characters')).toBe(true);
    expect(isCanonicalPath('/characters/')).toBe(false);
    expect(isCanonicalPath('/missing')).toBe(false);
  });
});
