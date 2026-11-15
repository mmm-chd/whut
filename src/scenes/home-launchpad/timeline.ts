import gsap from 'gsap';
import { DEPTHS, LIFTOFF_SHIFT, SMOKE_EDGE_OFFSET } from './layers';
import { WEDGE, WEDGE_TAKEOFF_AT } from './wedge';
import type { HomeNodes } from './nodes';
import type { HomePhase } from './state';

export interface HomeTimelineOptions {
  nodes: HomeNodes;
  reducedMotion: boolean;
  onPhase: (phase: HomePhase) => void;
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
 * Launch cue sheet (concept 4.4 + 4.7, plan §6.2): ignition, liftoff with a
 * depth-scaled downward shift per layer, then the smoke transition that covers
 * the frame while the sky turns deep space. There is no count-down — pressing
 * Play simply goes (L9). Starts paused; the guarded Play action plays it.
 *
 * Beats: ignition 0, liftoff 0.9, exit 3.0, done 4.6 — the prototype's cue
 * sheet (plan §6.2).
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

  // --- Phase 1: engine ignition --------------------------------------------
  timeline.addLabel('ignition', 0);
  phase('ignition', 0);
  // A cold engine starts rough: two short coughs of flame before the plume
  // settles (plan T5b). Idle shows nothing burning at all.
  timeline.to(
    nodes.rocket.exhaust,
    { opacity: 0.6, duration: motion(0.14, 0.02), repeat: motion(2, 0), yoyo: true, ease: 'none' },
    0,
  );
  timeline.to(
    nodes.rocket.exhaust,
    { opacity: 1, scaleY: 0.95, duration: motion(0.4, 0.05), ease: 'power1.out' },
    0.42,
  );
  if (!isReduced()) {
    timeline.to(
      nodes.rocket.vibration,
      { x: 1.4, duration: 0.04, repeat: 20, yoyo: true, ease: 'none' },
      0.06,
    );
  }

  // The plume builds while the engine settles — no count-down to fill.
  timeline.to(
    nodes.rocket.exhaust,
    { scaleY: 1.2, duration: motion(0.35, 0.05), ease: 'power1.out' },
    0.5,
  );
  timeline.set(nodes.rocket.vibration, { x: 0 }, 0.9);
  // The apex rises out of frame to the lift-off height in three quarters of a
  // second (the prototype's ease-out cubic), then climbs with the rocket.
  timeline.to(
    nodes.wedge.motion,
    { y: WEDGE.apexTakeoff - WEDGE.apexRest, duration: motion(0.9, 0.05), ease: 'power3.out' },
    0,
  );
  timeline.to(
    nodes.wedge.motion,
    { y: WEDGE.apexTakeoff - WEDGE.apexRest - WEDGE.climb, duration: motion(2.7, 1), ease: isReduced() ? 'none' : 'power2.in' },
    0.9,
  );

  // --- Phase 2: liftoff ------------------------------------------------------
  timeline.addLabel('liftoff', 0.9);
  phase('liftoff', 0.9);
  // Climb 0.9 → 3.6, accelerating (power2.in): the rocket leaves slowly and is
  // gone by the time the exit cover takes over (plan §6.2).
  timeline.to(
    rocket.motion,
    { y: -LIFTOFF_SHIFT - 200, duration: motion(2.7, 1), ease: isReduced() ? 'none' : 'power2.in' },
    0.9,
  );
  // Camera tilt: every layer slides down at a speed proportional to its depth,
  // so the foreground leaves the frame first (concept 4.7).
  timeline.to(
    nodes.sky.motion,
    { y: DEPTHS.sky * LIFTOFF_SHIFT, duration: motion(2.0, 0.3), ease: 'power2.in' },
    0.9,
  );
  timeline.to(
    nodes.moon.motion,
    { y: DEPTHS.moon * LIFTOFF_SHIFT, duration: motion(2.0, 0.3), ease: 'power2.in' },
    0.9,
  );
  timeline.to(
    nodes.ground.motion,
    { y: DEPTHS.ground * LIFTOFF_SHIFT, duration: motion(2.0, 0.3), ease: 'power2.in' },
    0.9,
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
    { y: DEPTHS.towers * LIFTOFF_SHIFT, duration: motion(2.0, 0.3), ease: 'power2.in' },
    0.9,
  );
  timeline.to(
    nodes.crowd.motion,
    { y: DEPTHS.crowd * LIFTOFF_SHIFT, duration: motion(2.0, 0.3), ease: 'power2.in' },
    0.9,
  );

  // Sand appears with the ignition, as it does in the prototype: half a second
  // from nothing to full, both banks together (T7b), and no third layer.
  timeline.to(nodes.smokeBack.motion, { opacity: 1, duration: motion(0.5, 0.05) }, 0);
  timeline.to(nodes.smokeFront.motion, { opacity: 1, duration: motion(0.5, 0.05) }, 0);

  // The two banks are **welded to the wedge's edge**: their y is the apex's own
  // travel plus a fixed offset, so the seam between space and sky is always
  // under sand and there is nothing left to scale.
  const smoke = [
    { node: nodes.smokeBack.motion, offset: SMOKE_EDGE_OFFSET.back },
    { node: nodes.smokeFront.motion, offset: SMOKE_EDGE_OFFSET.front },
  ] as const;
  for (const bank of smoke) {
    // Resting: the edge is parked below the frame, so the sand starts there too.
    timeline.set(bank.node, { y: WEDGE.apexRest - WEDGE.apexTakeoff + bank.offset }, 0);
    timeline.to(
      bank.node,
      { y: bank.offset, duration: motion(0.9, 0.05), ease: 'power3.out' },
      0,
    );
    timeline.to(
      bank.node,
      { y: -WEDGE.climb + bank.offset, duration: motion(2.7, 1), ease: isReduced() ? 'none' : 'power2.in' },
      WEDGE_TAKEOFF_AT,
    );
  }

  // --- Phase 3: the space wedge is the cover ---------------------------------
  timeline.addLabel('exit', 3);
  phase('exit', 3);
  // The wedge, not the smoke, fills the frame: it rises with the rocket and is
  // past the top by the exit beat, so the swap cannot show a gap (T8b). The
  // space gradient behind it comes up in step, for the frame edges the wedge
  // no longer reaches.
  timeline.to(
    nodes.space.fade,
    { opacity: 1, duration: motion(1.3, 0.3), ease: 'power1.inOut' },
    3.05,
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
    4.6,
  );
  phase('done', 4.6);

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
    gsap.to(nodes.clouds[0].idle, { x: 9, duration: 6, yoyo: true, repeat: -1, ease: 'sine.inOut' }),
    gsap.to(nodes.clouds[1].idle, { x: -8, duration: 7, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 1 }),
    gsap.to(nodes.clouds[2].idle, { x: 7, duration: 5.5, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: 0.5 }),
  ];
}
