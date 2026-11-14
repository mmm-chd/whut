import { useCallback, useEffect, useRef, useState } from 'react';
import { useStoryStore } from '../../stores/story.store';
import { resetParallax } from './parallax';
import { resetHomeNodes, type HomeNodes } from './nodes';
import { canStartLaunch, type HomePhase } from './state';
import {
  createHomeIdleLoops,
  createHomeLaunchTimeline,
  type HomeCountdown,
  type HomeLaunchTimeline,
} from './timeline';

export interface HomeSceneApi {
  phase: HomePhase;
  countdown: HomeCountdown;
  startLaunch: () => void;
}

/**
 * Owns one homepage run: the idle loops, the guarded Play action, and the
 * launch timeline. React state is only a view; guards read refs at event
 * time. `onComplete` fires once the smoke covers the frame.
 */
export function useHomeScene(nodes: HomeNodes, onComplete: () => void): HomeSceneApi {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const [phase, setPhase] = useState<HomePhase>('idle');
  const [countdown, setCountdown] = useState<HomeCountdown>(null);

  const phaseRef = useRef<HomePhase>('idle');
  const driverRef = useRef<HomeLaunchTimeline | null>(null);
  const loopsRef = useRef<ReturnType<typeof createHomeIdleLoops>>([]);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;

  // Idle loops keep the launchpad alive until Play is pressed.
  useEffect(() => {
    if (nodes.flags.launched) {
      return;
    }
    const loops = createHomeIdleLoops(nodes, reducedMotion);
    loopsRef.current = loops;
    return () => {
      for (const tween of loops) {
        tween.kill();
      }
      loopsRef.current = [];
    };
  }, [nodes, reducedMotion]);

  useEffect(() => {
    resetParallax();
    return () => {
      driverRef.current?.dispose();
      driverRef.current = null;
      resetParallax();
    };
  }, []);

  const startLaunch = useCallback(() => {
    if (driverRef.current) {
      return;
    }
    if (!canStartLaunch({ phase: phaseRef.current, launched: nodes.flags.launched })) {
      return;
    }
    // A fresh run begins from rest; idle loops hand the nodes over.
    for (const tween of loopsRef.current) {
      tween.kill();
    }
    loopsRef.current = [];
    resetHomeNodes(nodes, reducedRef.current);
    nodes.flags.launched = true;

    const driver = createHomeLaunchTimeline({
      nodes,
      reducedMotion: reducedRef.current,
      onPhase: (next) => {
        phaseRef.current = next;
        setPhase(next);
      },
      onCountdown: (value) => setCountdown(value),
      onComplete: () => onCompleteRef.current(),
    });
    driverRef.current = driver;
    driver.play(0);
  }, [nodes]);

  return { phase, countdown, startLaunch };
}
