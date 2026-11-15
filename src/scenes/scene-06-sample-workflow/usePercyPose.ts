import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import {
  addExcited,
  addInspect,
  addRelax,
} from '../../characters/percy/percyClips';
import type { SamplingPhase } from './samplingState';
import type { SampleNodes } from './nodes';

type Timeline = ReturnType<typeof gsap.timeline>;

/**
 * Percy's pose follows the game's phase: leaning over his rock while the
 * reader brushes, inspects and drills (with a small tremor while the drill
 * runs), then a hop when a tube is stored. The clips only write the rig's
 * nodes; a pause freezes the timeline where it is.
 */
export function usePercyPose(
  nodes: SampleNodes,
  phase: SamplingPhase,
  reducedMotion: boolean,
  paused: boolean,
): void {
  const timelineRef = useRef<Timeline | null>(null);
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
    timelineRef.current?.paused(paused);
  }, [paused]);

  useEffect(() => {
    const { percy } = nodes;
    const timeline = gsap.timeline({ paused: pausedRef.current });
    timelineRef.current = timeline;

    switch (phase) {
      case 'brush':
      case 'inspect':
      case 'drill-ready':
        addInspect(timeline, percy, 0, reducedMotion);
        break;
      case 'drilling': {
        addInspect(timeline, percy, 0, reducedMotion);
        if (!reducedMotion) {
          timeline.to(
            percy.body,
            { rotation: 4.2, duration: 0.06, ease: 'none', yoyo: true, repeat: -1 },
            0.4,
          );
        }
        break;
      }
      case 'cycle-complete':
      case 'mission-complete': {
        const hop = addExcited(timeline, percy, 0, reducedMotion);
        addRelax(timeline, percy, hop, reducedMotion);
        break;
      }
      default:
        addRelax(timeline, percy, 0, reducedMotion);
    }

    return () => {
      timeline.kill();
      if (timelineRef.current === timeline) {
        timelineRef.current = null;
      }
    };
  }, [nodes, phase, reducedMotion]);
}
