import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { hasWebGL2 } from '../scene-04-percy-inspection/inspector/useInspectorRenderer';
import { layoutP06, type P06Layout } from './layout';
import { createP06Nodes, resetP06Nodes, type P06Nodes } from './nodes';
import type { P06IntroBeat } from './state';
import { createP06Intro, type P06Intro, type P06IntroEvent } from './timeline';

/**
 * Owns the picture for the P-06 intro: one timeline, attached to the narrative
 * controller so pause and resume reach it. Beats are reported outward; this hook
 * never decides that the intro is over, it only says which beat it reached.
 */
export interface P06IntroApi {
  readonly nodes: P06Nodes;
  readonly layout: P06Layout;
  /** True while the black title card is on screen. */
  readonly timeSkipVisible: boolean;
  readonly skipping: boolean;
  replay: () => void;
}

/** Beats that happen on the timeline, mapped to the machine's phases. */
const BEAT_OF: Partial<Record<P06IntroEvent, P06IntroBeat>> = {
  journey: 'journey',
  'faded-out': 'time-skip',
  valley: 'intro',
};

export function useP06Intro(
  onBeat: (beat: P06IntroBeat) => void,
  onIntroDone: () => void,
): P06IntroApi {
  const controller = useNarrativeController();
  const controllerRef = useRef(controller);
  controllerRef.current = controller;

  const reducedMotion = useStoryStore((store) => store.settings.reducedMotion);
  const [nodes] = useState(() => createP06Nodes(reducedMotion));
  const [size, setSize] = useState(() => ({
    width: typeof window === 'undefined' ? 1920 : window.innerWidth || 1920,
    height: typeof window === 'undefined' ? 1080 : window.innerHeight || 1080,
  }));
  const layout = useMemo(() => layoutP06(size.width, size.height), [size.width, size.height]);

  const introRef = useRef<P06Intro | null>(null);
  const [timeSkipVisible, setTimeSkipVisible] = useState(false);
  const [skipping, setSkipping] = useState(false);
  /** No WebGL (or no timeline yet) means the deck is all there is to show. */
  const [introAvailable] = useState(() => hasWebGL2());
  const beatRef = useRef(onBeat);
  beatRef.current = onBeat;
  const doneRef = useRef(onIntroDone);
  doneRef.current = onIntroDone;

  useEffect(() => {
    if (!introAvailable) {
      return;
    }
    resetP06Nodes(nodes, layout, reducedMotion);
    const intro = createP06Intro({
      nodes,
      layout,
      reducedMotion,
      onEvent: (event) => {
        const beat = BEAT_OF[event];
        if (beat) {
          beatRef.current(beat);
        }
        if (event === 'skip-shown') {
          setTimeSkipVisible(true);
        }
        if (event === 'skip-cleared') {
          setTimeSkipVisible(false);
        }
        if (event === 'intro-done') {
          doneRef.current();
        }
      },
    });
    introRef.current = intro;
    controllerRef.current.attachTimeline({
      play: () => intro.play(0),
      pause: () => intro.pause(),
      resume: () => intro.resume(),
      restart: () => intro.play(0),
      isRunning: () => intro.isRunning(),
    });
    intro.play(0);
    return () => {
      intro.pause();
      intro.timeline.kill();
      introRef.current = null;
      controllerRef.current.attachTimeline(null);
    };
    // One intro per mount, built for the layout it starts with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introAvailable, layout, nodes, reducedMotion]);

  useEffect(() => {
    if (!introAvailable) {
      return;
    }
    const onResize = () => {
      // A resize keeps the run: it shortens or lengthens the remaining travel,
      // it does not replay what the reader already watched.
      setSize({
        width: window.innerWidth || 1920,
        height: window.innerHeight || 1080,
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [introAvailable]);

  // A reduced-motion reader sees the same beats with almost no travel, so the
  // caption still appears and the deck still opens in order.
  useEffect(() => {
    introRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const replay = useCallback(() => {
    setSkipping(true);
    introRef.current?.play(0);
    setSkipping(false);
  }, []);

  return { nodes, layout, timeSkipVisible, skipping, replay };
}
