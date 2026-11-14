import gsap from 'gsap';
import { DEPTHS, LIFTOFF_SHIFT } from './layers';
import type { HomeNodes } from './nodes';
import type { HomePhase } from './state';

export type HomeCountdown = 3 | 2 | 1 | 'GO!' | null;

export interface HomeTimelineOptions {
  nodes: HomeNodes;
  reducedMotion: boolean;
  onPhase: (phase: HomePhase) => void;
  onCountdown: (value: HomeCountdown) => void;
  onComplete: () => void;
}

export interface HomeLaunchTimeline {
  play: (time?: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (time: number, suppressEvents?: boolean) => void;
  paused: () => boolean;
  isRunning: () => boolean;
  labels: Record<string, number>;
  dispose: () => void;
}

/**
 * Launch cue sheet (concept 4.4 + 4.7): ignition, stamp countdown, liftoff
 * with a depth-scaled downward shift per layer, then the smoke transition
 * that covers the frame while the sky turns deep space. Starts paused; the
 * guarded Play action plays it.
 */
export function createHomeLaunchTimeline(options: HomeTimelineOptions): HomeLaunchTimeline {
  const { nodes } = options;
  const { rocket } = nodes;

  let disposed = false;
  let completed = false;
  let reducedMotion = options.reducedMotion;

  const timeline = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.out' },
  });

  const isReduced = () => reducedMotion;
  const motion = (normal: number, reduced = 0.01) => (isReduced() ? reduced : normal);

  const phase = (value: HomePhase, position: number) => {
    timeline.call(
      () => {
        if (!disposed) {
          options.onPhase(value);
        }
      },
      [],
      position,
    );
  };

  const countdown = (value: HomeCountdown, position: number) => {
    timeline.call(
      () => {
        if (!disposed) {
          options.onCountdown(value);
        }
      },
      [],
      position,
    );
  };

  // --- Phase 1: engine ignition --------------------------------------------
  timeline.addLabel('ignition', 0);
  phase('ignition', 0);
  timeline.to(
    nodes.rocket.exhaust,
    { opacity: 1, scaleY: 0.95, duration: motion(0.5, 0.05), ease: 'power1.out' },
    0.05,
  );
  if (!isReduced()) {
    timeline.to(
      nodes.rocket.vibration,
      { x: 1.4, duration: 0.04, repeat: 20, yoyo: true, ease: 'none' },
      0.1,
    );
  }

  // --- Phase 2: countdown stamps --------------------------------------------
  timeline.addLabel('countdown', 0.9);
  phase('countdown', 0.9);
  countdown(3, 0.9);
  countdown(2, 1.7);
  countdown(1, 2.5);
  countdown('GO!', 3.3);
  timeline.to(
    nodes.rocket.exhaust,
    { scaleY: 1.2, duration: motion(0.4, 0.05), ease: 'power1.out' },
    3.3,
  );

  // --- Phase 3: liftoff ------------------------------------------------------
  timeline.addLabel('liftoff', 3.5);
  phase('liftoff', 3.5);
  timeline.set(nodes.rocket.vibration, { x: 0 }, 3.5);
  timeline.to(
    rocket.motion,
    { y: -LIFTOFF_SHIFT - 200, duration: motion(4, 1), ease: isReduced() ? 'none' : 'power2.in' },
    3.5,
  );
  // Camera tilt: every layer slides down at a speed proportional to its depth,
  // so the foreground leaves the frame first (concept 4.7).
  timeline.to(
    nodes.sky.motion,
    { y: DEPTHS.sky * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.moon.motion,
    { y: DEPTHS.moon * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.sea.motion,
    { y: DEPTHS.sea * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.boat.motion,
    { y: DEPTHS.boat * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  for (const cloud of nodes.clouds) {
    timeline.to(
      cloud.motion,
      { y: DEPTHS.clouds * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
      3.6,
    );
  }
  timeline.to(
    nodes.towers.motion,
    { y: DEPTHS.towers * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.smokeFar.motion,
    { y: DEPTHS.smokeFar * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.smokeMid.motion,
    { y: DEPTHS.smokeMid * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.smokeNear.motion,
    { y: DEPTHS.smokeNear * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );
  timeline.to(
    nodes.crowd.motion,
    { y: DEPTHS.crowd * LIFTOFF_SHIFT, duration: motion(4, 0.3), ease: 'power2.in' },
    3.6,
  );

  // --- Phase 4: smoke transition into deep space -----------------------------
  timeline.addLabel('exit', 5.6);
  phase('exit', 5.6);
  const cover = (node: HomeNodes['smokeFar'], scale: number, position: number) => {
    timeline.to(node.motion, { scale, y: 180, duration: motion(2.8, 0.4), ease: 'power2.in' }, position);
  };
  cover(nodes.smokeFar, 4.2, 5.7);
  cover(nodes.smokeMid, 4.8, 5.75);
  cover(nodes.smokeNear, 5.4, 5.8);
  timeline.to(
    nodes.space.fade,
    { opacity: 1, duration: motion(2.6, 0.3), ease: 'power1.inOut' },
    5.8,
  );

  timeline.call(
    () => {
      if (disposed || completed) {
        return;
      }
      completed = true;
      options.onComplete();
    },
    [],
    8.7,
  );
  phase('done', 8.9);

  return {
    labels: timeline.labels as Record<string, number>,
    play: (time = 0) => {
      if (!disposed) {
        timeline.play(time);
      }
    },
    pause: () => {
      if (!disposed) {
        timeline.pause();
      }
    },
    resume: () => {
      if (!disposed) {
        timeline.resume();
      }
    },
    seek: (time, suppressEvents = false) => {
      if (!disposed) {
        timeline.seek(time, suppressEvents);
      }
    },
    paused: () => disposed || timeline.paused(),
    isRunning: () => !disposed && !timeline.paused() && timeline.progress() < 1,
    dispose: () => {
      disposed = true;
      timeline.kill();
    },
  };
}

/**
 * Idle loops (concept 4.3): separate yoyo tweens so each element breathes at
 * its own rhythm. Killed by the caller on unmount; skipped entirely under
 * reduced motion.
 */
export function createHomeIdleLoops(nodes: HomeNodes, reducedMotion: boolean): gsap.core.Tween[] {
  if (reducedMotion) {
    return [];
  }
  return [
    gsap.to(nodes.rocket.idle, { y: 4, duration: 1.9, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.smokeFar.idle, { scale: 1.02, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.smokeMid.idle, { scale: 1.02, duration: 2.1, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.4 }),
    gsap.to(nodes.smokeNear.idle, { scale: 1.02, duration: 1.8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.8 }),
    gsap.to(nodes.crowd.poseA, { opacity: 0, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.crowd.poseB, { opacity: 1, duration: 0.55, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.boat.idle, { y: -5, duration: 1.7, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.clouds[0].idle, { x: 9, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.clouds[1].idle, { x: -8, duration: 7, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 }),
    gsap.to(nodes.clouds[2].idle, { x: 7, duration: 5.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5 }),
  ];
}
