import type { ExperienceStage } from './experience.store';

/**
 * The addressable stages of the experience. The journal/character selection
 * lives at `/characters` (concept 9: "Character Selection"), so the URL is
 * shareable and the back button walks the story backwards instead of leaving
 * the site. The splash and the homepage share `/`: the splash is an intro to
 * that page, not a document of its own.
 *
 * The router is deliberately tiny: three static paths, no params, and the
 * experience store already owns which stage is mounted. `history.pushState`
 * writes the URL, `popstate` reads it back.
 */
export type AppRoute = 'home' | 'characters' | 'story';

export const ROUTE_PATHS: Record<AppRoute, string> = {
  home: '/',
  characters: '/characters',
  story: '/story',
};

const PATH_ROUTES: Readonly<Record<string, AppRoute>> = {
  '/': 'home',
  '/characters': 'characters',
  '/story': 'story',
};

/** Trims the trailing slash and query-free casing so `/characters/` matches. */
function normalisePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '');
  return trimmed === '' ? '/' : trimmed.toLowerCase();
}

/** Unknown paths fall back to the homepage rather than a blank screen. */
export function routeForPath(pathname: string): AppRoute {
  const normalised = normalisePath(pathname);
  // `/story/<character>` (e.g. `/story/perseverance`) addresses the story too:
  // the slug keeps the address descriptive while the engine stays the same.
  if (normalised === '/story' || normalised.startsWith('/story/')) {
    return 'story';
  }
  return PATH_ROUTES[normalised] ?? 'home';
}

export function pathForRoute(route: AppRoute): string {
  return ROUTE_PATHS[route];
}

/** The stage that renders a route after an in-app navigation. */
export function stageForRoute(route: AppRoute): ExperienceStage {
  switch (route) {
    case 'characters':
      return 'book';
    case 'story':
      return 'story';
    case 'home':
      return 'homepage';
  }
}

/** Which address a stage should be reachable at. */
export function routeForStage(stage: ExperienceStage): AppRoute {
  switch (stage) {
    case 'book':
      return 'characters';
    case 'story':
      return 'story';
    case 'splash':
    case 'homepage':
      return 'home';
  }
}

/**
 * The stage a fresh page load starts in. Landing on `/` plays the splash;
 * landing on a deep link goes straight to that stage, because replaying the
 * intro (or the launch) would be a lie about where the reader is.
 */
export function bootStage(pathname: string): ExperienceStage {
  const route = routeForPath(pathname);
  return route === 'home' ? 'splash' : stageForRoute(route);
}

/** True when the current URL is the canonical spelling of its route. */
export function isCanonicalPath(pathname: string): boolean {
  // `/story` and `/story/<character>` are both canonical spellings; the slug
  // survives the boot so the address bar keeps its character name. Like the
  // other routes, trailing slashes and casing are rewritten to this spelling.
  if (/^\/story(\/[a-z0-9-]+)?$/.test(pathname)) {
    return true;
  }
  return pathname === pathForRoute(routeForPath(pathname));
}
