import { useEffect } from 'react';
import { useExperienceStore } from './experience.store';
import { bootStage, isCanonicalPath, pathForRoute, routeForPath, routeForStage, stageForRoute } from './router';

/**
 * Keeps the address bar and the mounted stage in step.
 *
 *  - a stage change (Play reaches the journal, the journal starts the story)
 *    pushes the matching path, so the URL is shareable and the browser Back
 *    button returns to the previous stage;
 *  - a `popstate` (Back/Forward) reads the path and mounts that stage;
 *  - the first load uses `bootStage`, which decides between the splash and a
 *    deep link. It runs in `applyBootRoute` before React renders, so no stage
 *    flashes before the correct one mounts.
 */
export function applyBootRoute(pathname: string = window.location.pathname): void {
  useExperienceStore.setState({ stage: bootStage(pathname) });
  if (!isCanonicalPath(pathname)) {
    // `/characters/` or a stale link: rewrite the address without adding history.
    window.history.replaceState(
      { route: routeForPath(pathname) },
      '',
      pathForRoute(routeForPath(pathname)),
    );
  }
}

export function useStageUrl(): void {
  const stage = useExperienceStore((state) => state.stage);
  const setStage = useExperienceStore((state) => state.setStage);

  // Stage -> URL.
  useEffect(() => {
    const path = pathForRoute(routeForStage(stage));
    if (window.location.pathname !== path) {
      window.history.pushState({ route: path }, '', path);
    }
  }, [stage]);

  // URL -> stage (Back/Forward).
  useEffect(() => {
    const onPopState = () => {
      setStage(stageForRoute(routeForPath(window.location.pathname)));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [setStage]);
}
