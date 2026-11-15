import gsap from 'gsap';
import { isPercyOutsideViewport, type P06Layout } from './layout';
import type { P06Nodes } from './nodes';

/**
 * The P-06 intro: journey, full exit, black time skip, valley reveal.
 *
 * One pausable GSAP timeline owns the picture. It reports beats with
 * `onEvent`; it never reads the story store, so a paused timeline cannot
 * believe it is far ahead of the screen. Every duration below is either a
 * reading hold or a fade, never a claim about how long the exit took.
 */
export type P06IntroEvent =
  | 'journey'
  | 'exited'
  | 'faded-out'
  | 'skip-shown'
  | 'skip-cleared'
  | 'valley'
  | 'intro-done';

export interface P06IntroOptions {
  readonly nodes: P06Nodes;
  readonly layout: P06Layout;
  readonly reducedMotion: boolean;
  readonly onEvent: (event: P06IntroEvent) => void;
}

export interface P06Intro {
  readonly timeline: gsap.core.Timeline;
  play: (at?: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number, suppressEvents?: boolean) => void;
  isRunning: () => boolean;
  setReducedMotion: (reduced: boolean) => void;
  /** Seconds from the first frame to the card stack, for tests and the doc. */
  readonly duration: number;
}

export const JOURNEY_SECONDS = 3.2;
export const EXIT_FADE_SECONDS = 0.7;
/** Long enough to read a two-word title, short enough not to feel stalled. */
export const TIME_SKIP_SECONDS = 2.6;
export const VALLEY_HOLD_SECONDS = 1.4;
const REDUCED_SECONDS = 0.01;

/** How far the camera follows before it leaves Percy to roll out of frame. */
export function followLimitX(layout: P06Layout, scale: number): number {
  return layout.exitX - layout.width / (scale * layout.unit);
}

export function createP06Intro(options: P06IntroOptions): P06Intro {
  const { nodes, layout, onEvent } = options;
  const { percy, camera, fade, valley, marker } = nodes;

  let reducedMotion = options.reducedMotion;
  let disposed = false;
  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power1.inOut' } });
  const motion = (normal: number, short: number = REDUCED_SECONDS) =>
    reducedMotion ? short : normal;
  const call = (at: number, event: P06IntroEvent) => {
    timeline.call(() => {
      if (!disposed) {
        onEvent(event);
      }
    }, undefined, at);
  };

  // 1. The journey: Percy rolls right and the camera follows until the limit.
  const journey = motion(JOURNEY_SECONDS, 0.6);
  const limit = followLimitX(layout, camera.scale);
  timeline.set(percy.body, { x: layout.startX }, 0);
  timeline.to(
    percy.body,
    {
      x: layout.exitX,
      duration: journey,
      ease: 'none',
      onUpdate: () => {
        camera.x = Math.min(layout.followX(percy.body.x), layout.followX(limit));
      },
    },
    0,
  );
  call(0, 'journey');
  call(journey, 'exited');

  // 2. Black. The exit is checked against the sprite's own bounds, not this clock.
  const fadeOut = motion(EXIT_FADE_SECONDS);
  timeline.to(fade, { opacity: 1, duration: fadeOut, ease: 'none' }, journey);
  call(journey + fadeOut, 'faded-out');
  call(journey + fadeOut, 'skip-shown');

  // 3. The world moves on behind the black: a new valley, Percy beside it.
  const skipEnd = journey + fadeOut + motion(TIME_SKIP_SECONDS, 0.2);
  timeline.call(
    () => {
      if (disposed) {
        return;
      }
      // Only jump if he really did leave: a resize mid-run can move the edge.
      if (!isPercyOutsideViewport(percy.body.x, camera, layout, 0)) {
        percy.body.x = layout.exitX;
      }
      Object.assign(camera, {
        x: layout.valley.x,
        lift: layout.valley.lift,
        scale: layout.valley.scale,
      });
      percy.body.x = layout.rockX - 340;
      valley.opacity = 1;
    },
    undefined,
    skipEnd,
  );
  timeline.to(fade, { opacity: 0, duration: motion(EXIT_FADE_SECONDS), ease: 'none' }, skipEnd);
  call(skipEnd, 'skip-cleared');

  // 4. The rock draws the eye, and the intro rests so the card stack can open.
  const valleyAt = skipEnd + motion(EXIT_FADE_SECONDS);
  timeline.to(marker, { opacity: 1, scale: 1, duration: motion(0.6) }, valleyAt);
  call(valleyAt, 'valley');
  const end = valleyAt + motion(VALLEY_HOLD_SECONDS, 0.1);
  call(end, 'intro-done');

  return {
    timeline,
    duration: end,
    play: (at = 0) => {
      timeline.play(at);
    },
    pause: () => {
      timeline.pause();
    },
    resume: () => {
      timeline.resume();
    },
    seek: (seconds, suppressEvents = false) => {
      timeline.seek(seconds, suppressEvents);
    },
    isRunning: () => !disposed && timeline.isActive(),
    setReducedMotion: (reduced: boolean) => {
      reducedMotion = reduced;
    },
  };
}
