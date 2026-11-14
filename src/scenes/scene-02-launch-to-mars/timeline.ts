import gsap from 'gsap';
import type { PausableTimeline } from '../../engine/narrativeControllerContext';
import {
  P02_CAMERA,
  P02_LAND,
  P02_ROCKET_ESTABLISHING,
  cameraTransform,
  type P02CameraPose,
} from './camera';
import type { P02Nodes } from './nodes';
import type { P02Phase } from './state';

export type P02Gate = { kind: 'dialogue'; lineId: string } | { kind: 'launch' };

export interface P02TimelineOptions {
  /** Animation state the timeline drives; the WebGL world reads it. */
  nodes: P02Nodes;
  reducedMotion: boolean;
  holdLineIds: readonly string[];
  onPhase: (phase: P02Phase) => void;
  onLabel: (label: string) => void;
  onGate: (gate: P02Gate) => void;
  onCountdown: (value: 3 | 2 | 1 | 'GO!' | null) => void;
  isRocketOffscreen: () => boolean;
  onComplete: () => void;
  /** Lets an already-resolved line skip its gate without deadlocking. */
  isDialogueResolved?: (lineId: string) => boolean;
}

export interface P02Timeline extends PausableTimeline {
  /** The base contract keeps these optional; a real driver always has them. */
  play: (time?: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  isRunning: () => boolean;
  /** Test/debug inspection of the built cue sheet. */
  labels: Record<string, number>;
  seek: (time: number, suppressEvents?: boolean) => void;
  paused: () => boolean;
  releaseDialogue: (lineId: string) => void;
  launch: () => boolean;
  /** External story pause; a released gate must not resume through it. */
  setPresentationPaused: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  dispose: () => void;
}

const DIALOGUE_GATE_DELAY = 0.01;

/**
 * P-02 timeline.
 *
 * The driver starts paused. Dialogue gates pause the playhead and report the
 * owning line; only `releaseDialogue` (after the dialogue store resolves) or
 * the guarded `launch` method may continue past a gate. Generic `resume()`
 * deliberately cannot bypass a gate.
 */
export function createP02Timeline(options: P02TimelineOptions): P02Timeline {
  const { nodes } = options;
  const { camera, shake, rocket, vibration, exhaust, closeup, land, windowGinny, smoke } = nodes;
  const percy = nodes.closeupPercy;
  const ginny = nodes.closeupGinny;

  let disposed = false;
  let completed = false;
  let heldGate: P02Gate | null = null;
  let launchGate: P02Gate | null = null;
  let reducedMotion = options.reducedMotion;
  let presentationPaused = false;

  const timeline = gsap.timeline({
    paused: true,
    defaults: { ease: 'power2.out' },
  });

  const isReduced = () => reducedMotion;
  const motion = (normal: number, reduced = 0.01) => (isReduced() ? reduced : normal);

  const applyPose = (
    pose: P02CameraPose,
    position: number,
    duration: number,
    ease = 'power2.inOut',
  ) => {
    const transform = cameraTransform(pose);
    if (duration <= 0) {
      timeline.set(camera, transform, position);
      return;
    }
    timeline.to(camera, { ...transform, duration, ease }, position);
  };

  const phase = (value: P02Phase, position: number) => {
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

  const label = (name: string, position: number) => {
    timeline.addLabel(name, position);
    timeline.call(
      () => {
        if (!disposed) {
          options.onLabel(name);
        }
      },
      [],
      position,
    );
  };

  const countdown = (value: 3 | 2 | 1 | 'GO!' | null, position: number) => {
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

  const rawResume = () => {
    if (!disposed) {
      timeline.resume();
    }
  };

  const dialogueGate = (lineId: string, position: number) => {
    timeline.addPause(position, () => {
      if (disposed) {
        return;
      }
      if (options.isDialogueResolved?.(lineId)) {
        // The player was faster than the playhead. Release on the next
        // microtask so the pause has fully settled before resuming.
        queueMicrotask(rawResume);
        return;
      }
      const gate: P02Gate = { kind: 'dialogue', lineId };
      heldGate = gate;
      options.onGate(gate);
    });
  };

  const holdingIds = new Set(options.holdLineIds);

  // --- Opening flashback and establishing shot -----------------------------
  applyPose(P02_CAMERA.establishing, 0, 0);
  if (rocket) {
    timeline.set(
      rocket,
      {
        x: 0,
        y: P02_ROCKET_ESTABLISHING.offsetY,
        scale: P02_ROCKET_ESTABLISHING.scale,
        opacity: 1,
      },
      0,
    );
  }
  if (land) {
    // Establishing framing: horizon at y~1000, as in the reference.
    timeline.set(land, { y: P02_LAND.establishingOffsetY }, 0);
  }
  if (closeup) {
    timeline.set(
      closeup,
      {
        opacity: 0,
        scale: isReduced() ? 1 : 1.04,
      },
      0,
    );
  }
  if (exhaust) {
    timeline.set(exhaust, { opacity: 0, scaleY: 0.4 }, 0);
  }
  for (const node of smoke) {
    timeline.set(node, { opacity: 0, scale: 0.6, y: 0 }, 0);
  }
  if (percy) {
    timeline.set(percy, { opacity: 0, y: 60 }, 0);
  }
  if (ginny) {
    timeline.set(ginny, { opacity: 0, y: 60 }, 0);
  }
  timeline.set(nodes.skyCap, { opacity: 0 }, 0);
  if (windowGinny) {
    // Reference P-02-00 shows only Percy; Ginny joins after her close-up.
    timeline.set(windowGinny, { opacity: 0 }, 0);
  }

  phase('flashback', 0);
  phase('establishing', 2.4);
  applyPose({ ...P02_CAMERA.establishing, scale: 1.04 }, 2.4, motion(2.6, 0.3), 'power1.inOut');

  label('rocket-establishing-shot', 2.4);
  if (holdingIds.has('p02-narrator-01')) {
    dialogueGate('p02-narrator-01', 2.4 + DIALOGUE_GATE_DELAY);
  }

  // --- Window close-up ------------------------------------------------------
  // A dedicated 1:1 composition replaces the old 3.25x camera zoom. The
  // establishing world stays underneath and is revealed again at countdown.
  if (closeup) {
    timeline.to(
      closeup,
      { opacity: 1, scale: 1, duration: motion(1.8, 0.3), ease: 'power2.inOut' },
      5,
    );
  }
  phase('window', 6.8);

  // --- Percy ----------------------------------------------------------------
  phase('percy', 7.2);
  if (percy) {
    timeline.to(
      percy,
      { opacity: 1, y: 0, duration: motion(0.7, 0.15), ease: isReduced() ? 'none' : 'back.out(1.6)' },
      7.2,
    );
    if (!isReduced()) {
      timeline.to(
        percy,
        { y: -6, duration: 0.45, yoyo: true, repeat: 1, ease: 'sine.inOut' },
        8.2,
      );
    }
  }

  label('percy-dialogue', 8);
  if (holdingIds.has('p02-narrator-02')) {
    dialogueGate('p02-narrator-02', 8 + DIALOGUE_GATE_DELAY);
  }

  // --- Ginny ----------------------------------------------------------------
  phase('ginny', 10);
  if (ginny) {
    timeline.to(
      ginny,
      { opacity: 1, y: 0, duration: motion(0.7, 0.15), ease: isReduced() ? 'none' : 'back.out(1.6)' },
      10,
    );
    if (!isReduced()) {
      timeline.to(
        ginny,
        { y: -5, duration: 0.4, yoyo: true, repeat: 1, ease: 'sine.inOut' },
        10.8,
      );
    }
  }

  label('ginny-dialogue', 10.8);
  if (holdingIds.has('p02-narrator-03')) {
    dialogueGate('p02-narrator-03', 10.8 + DIALOGUE_GATE_DELAY);
  }

  // --- Invitation and launch gate ------------------------------------------
  phase('invitation', 12.8);
  label('launch-invitation', 12.8);
  if (holdingIds.has('p02-narrator-04')) {
    dialogueGate('p02-narrator-04', 12.8 + DIALOGUE_GATE_DELAY);
  }

  phase('awaiting-launch', 13.4);
  timeline.addPause(13.41, () => {
    if (disposed) {
      return;
    }
    const gate: P02Gate = { kind: 'launch' };
    heldGate = gate;
    launchGate = gate;
    options.onGate(gate);
  });

  // --- Countdown and ascent -------------------------------------------------
  phase('countdown', 13.5);
  if (closeup) {
    timeline.to(
      closeup,
      { opacity: 0, duration: motion(0.7, 0.1), ease: 'power1.in' },
      13.5,
    );
  }
  if (rocket) {
    timeline.to(
      rocket,
      { y: 0, scale: 1, duration: motion(1.2, 0.2), ease: 'power2.inOut' },
      13.5,
    );
  }
  if (windowGinny) {
    timeline.set(windowGinny, { opacity: 1 }, 13.5);
  }
  if (land) {
    // Wide launch framing: the land rises so the full rocket stands on the pad.
    timeline.to(
      land,
      { y: 0, duration: motion(1.2, 0.2), ease: 'power2.inOut' },
      13.5,
    );
  }
  applyPose(P02_CAMERA.launch, 13.5, motion(1.2, 0.2));

  if (vibration && !isReduced()) {
    timeline.to(
      vibration,
      { x: 1.5, duration: 0.04, repeat: 30, yoyo: true, ease: 'none' },
      13.5,
    );
    timeline.set(vibration, { x: 0 }, 16.7);
  }

  countdown(3, 14.2);
  countdown(2, 15);
  countdown(1, 15.8);
  countdown('GO!', 16.6);
  // GO! stays on screen for about a second, then clears so the ascent is clean.
  countdown(null, 17.6);
  timeline.call(
    () => {
      if (!disposed) {
        nodes.flags.launching = true;
      }
    },
    [],
    16.6,
  );
  if (exhaust) {
    timeline.set(exhaust, { opacity: 1 }, 16.6);
    timeline.to(exhaust, { scaleY: 1.2, duration: motion(1, 0.2), ease: 'power1.out' }, 16.6);
  }
  for (const [index, node] of smoke.entries()) {
    timeline.to(
      node,
      {
        opacity: 0.85,
        scale: motion(1.15, 1),
        y: motion(-30, 0),
        duration: motion(2.5, 0.3),
        ease: 'power1.out',
      },
      16.6 + index * 0.06,
    );
  }

  phase('ascent', 16.8);
  // The cap blends the flat top of the opening clouds into clear sky once the
  // camera climbs; the opening frames never show it.
  timeline.to(
    nodes.skyCap,
    { opacity: 1, duration: motion(1.4, 0.01), ease: 'power1.inOut' },
    16.8,
  );
  if (rocket) {
    timeline.to(
      rocket,
      {
        y: -2680,
        scale: 0.75,
        duration: motion(4.5, 1.2),
        ease: isReduced() ? 'none' : 'power2.in',
      },
      16.8,
    );
  }
  applyPose(P02_CAMERA.ascent, 16.8, motion(4.5, 1.2), isReduced() ? 'none' : 'power2.inOut');

  if (shake && !isReduced()) {
    timeline.to(
      shake,
      { x: 3, y: -2, duration: 0.05, repeat: 80, yoyo: true, ease: 'none' },
      16.8,
    );
    timeline.set(shake, { x: 0, y: 0 }, 21.3);
  }

  phase('exit', 21.3);
  if (exhaust) {
    timeline.to(exhaust, { opacity: 0, duration: motion(0.3, 0.05) }, 21);
  }

  timeline.call(
    () => {
      if (disposed || completed) {
        return;
      }
      if (!options.isRocketOffscreen()) {
        return;
      }
      completed = true;
      options.onComplete();
    },
    [],
    22.1,
  );

  const resume = () => {
    if (disposed || heldGate || presentationPaused) {
      return;
    }
    timeline.resume();
  };

  return {
    labels: timeline.labels as Record<string, number>,
    seek: (time, suppressEvents = false) => {
      if (!disposed) {
        timeline.seek(time, suppressEvents);
      }
    },
    paused: () => disposed || timeline.paused(),
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
    resume,
    restart: () => {
      if (disposed) {
        return;
      }
      heldGate = null;
      launchGate = null;
      completed = false;
      presentationPaused = false;
      timeline.restart();
    },
    isRunning: () =>
      !disposed && !presentationPaused && !timeline.paused() && timeline.progress() < 1,
    releaseDialogue: (lineId) => {
      if (
        disposed ||
        heldGate?.kind !== 'dialogue' ||
        heldGate.lineId !== lineId
      ) {
        return;
      }
      heldGate = null;
      if (!presentationPaused) {
        timeline.resume();
      }
    },
    launch: () => {
      if (disposed || !launchGate || heldGate !== launchGate) {
        return false;
      }
      launchGate = null;
      heldGate = null;
      if (!presentationPaused) {
        timeline.resume();
      }
      return true;
    },
    setPresentationPaused: (value) => {
      presentationPaused = value;
    },
    setReducedMotion: (value) => {
      reducedMotion = value;
      nodes.flags.reducedMotion = value;
    },
    dispose: () => {
      disposed = true;
      heldGate = null;
      launchGate = null;
      timeline.kill();
    },
  };
}
