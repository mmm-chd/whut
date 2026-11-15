import gsap from 'gsap';
import type { PausableTimeline } from '../../engine/narrativeControllerContext';
import { P04_INVITATION_X } from './annotations';
import { findP04Line, P04_INVITATION_LINE_ID } from './dialogue';
import type { P04Nodes } from './nodes';
import type { P04Phase } from './state';
import { followPose, travelledDistance, travelDuration, P04_TRAVEL } from './travel';

/**
 * The P-04 composite driver.
 *
 * Two clocks, and only two:
 * - the narrative segment (cues, gates, annotation/camera beats, phases),
 * - the travel segment (Percy rolls; it keeps rolling under a dialogue hold,
 *   because a hold is story pacing, not a presentation pause).
 *
 * The hand-over is a third, shorter segment: Percy fades out of the ground
 * picture, the frame fades to black, and the scene completes. The close-up
 * itself is `scene-05-percy-inspector`.
 *
 * Guards are not enforced here. `useP04Scene` owns them, because a guard needs
 * the run, the scene, the status and the reducer together. The driver only
 * refuses the transition that would corrupt the picture (handing over twice),
 * and latches it.
 */
export type P04Gate = { kind: 'dialogue'; lineId: string };

export interface P04DriverOptions {
  readonly nodes: P04Nodes;
  readonly reducedMotion: boolean;
  readonly onPhase: (phase: P04Phase) => void;
  readonly onCue: (lineId: string) => void;
  readonly onGate: (gate: P04Gate) => void;
  readonly onExitFadeFinished: () => void;
  /** Lets an already-resolved line skip its gate without deadlocking. */
  readonly isDialogueResolved?: (lineId: string) => boolean;
}

export interface P04Driver extends PausableTimeline {
  play: () => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  isRunning: () => boolean;
  releaseDialogue: (lineId: string) => void;
  beginHandoff: () => boolean;
  setPresentationPaused: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  dispose: () => void;
  /** The phase the driver has reached; read-only for tests and chrome. */
  phase: () => P04Phase;
  labels: Record<string, number>;
}

/** A cue must reach the dialogue store before its gate pauses the story. */
const DIALOGUE_GATE_DELAY = 0.01;
/** First narration beat, after the picture settles. */
const FIRST_CUE_AT = 0.9;
/** Breath between the release of one gate and the cue of the next line. */
const BEAT_PAD = 0.35;

/**
 * The four beats, spaced by the gate — never by the recording length.
 *
 * A gate freezes this timeline at its cue, so the recording is "spent" in
 * frozen time. Adding its length to the *next* cue position counted it twice:
 * the story sat silent for another whole recording (14.7 s after the distance
 * line, 25 s after the dimensions line) before the next line was allowed to
 * speak. The gate already holds for as long as the voice runs; all the next
 * beat needs is a breath.
 *
 * The recordings are protected from the other side: each narrated line sets
 * `gateAfter` to its own length, so Continue cannot be pressed before the voice
 * has finished and the next cue cannot cut it off.
 */
const BEAT_1_AT = FIRST_CUE_AT;
const BEAT_2_AT = BEAT_1_AT + DIALOGUE_GATE_DELAY + BEAT_PAD;
const BEAT_3_AT = BEAT_2_AT + DIALOGUE_GATE_DELAY + BEAT_PAD;
const INVITATION_AT = BEAT_3_AT + DIALOGUE_GATE_DELAY + BEAT_PAD;
const AWAITING_AT = INVITATION_AT + DIALOGUE_GATE_DELAY + BEAT_PAD + 0.4;
const NARRATIVE_END = AWAITING_AT + 0.2;

/** The authored beats in seconds, exported so a test can hold the spacing. */
export const P04_BEAT_TIMES = {
  first: BEAT_1_AT,
  second: BEAT_2_AT,
  third: BEAT_3_AT,
  invitation: INVITATION_AT,
  awaiting: AWAITING_AT,
} as const;

export function createP04Driver(options: P04DriverOptions): P04Driver {
  const { nodes } = options;
  let disposed = false;
  let reducedMotion = options.reducedMotion;
  let presentationPaused = false;
  let phase: P04Phase = 'entry';
  let heldGate: P04Gate | null = null;
  let entered = false;
  let narrative: gsap.core.Timeline | null = null;
  let travel: gsap.core.Timeline | null = null;
  let transfer: gsap.core.Timeline | null = null;

  const motion = (normal: number, short: number) => (reducedMotion ? short : normal);
  const segments = () => [narrative, travel, transfer].filter((segment): segment is gsap.core.Timeline => segment !== null);

  const setPhase = (next: P04Phase) => {
    phase = next;
    nodes.annotation.value = next === 'distance' || next === 'dimensions' || next === 'wheels' ? next : 'none';
    options.onPhase(next);
  };

  /** Write the live frame from one travel progress value. */
  const applyTravel = (progress: number) => {
    const x = travelledDistance(progress);
    nodes.percy.body.x = x;
    const pose = followPose(x);
    nodes.camera.x = pose.x;
    nodes.camera.lift = pose.lift;
    nodes.camera.scale = pose.scale;
  };

  /**
   * Add the story-pacing pause for a line, 0.01 s after its cue so the cue
   * always reaches the dialogue store first. The gate belongs to whichever
   * timeline cued the line.
   */
  const addGate = (timeline: gsap.core.Timeline, lineId: string, at: number) => {
    timeline.addPause(at + DIALOGUE_GATE_DELAY, () => {
      if (disposed) {
        return;
      }
      if (options.isDialogueResolved?.(lineId)) {
        queueMicrotask(() => {
          if (!disposed && !heldGate && !presentationPaused) {
            timeline.resume();
          }
        });
        return;
      }
      heldGate = { kind: 'dialogue', lineId };
      options.onGate({ kind: 'dialogue', lineId });
    });
  };

  const cue = (timeline: gsap.core.Timeline, lineId: string, at: number) => {
    const line = findP04Line(lineId);
    if (!line) {
      return;
    }
    timeline.addLabel(line.timelineLabel, at);
    timeline.call(
      () => {
        if (!disposed) {
          options.onCue(lineId);
        }
      },
      [],
      at,
    );
    addGate(timeline, lineId, at);
  };

  const play: P04Driver['play'] = () => {
    if (disposed) {
      return;
    }
    narrative?.play(0);
    if (!presentationPaused) {
      travel?.play(0);
    }
  };

  const pauseAll = () => {
    for (const segment of segments()) {
      segment.pause();
    }
  };

  const resumeSegments = () => {
    if (disposed || presentationPaused) {
      return;
    }
    if (narrative && !heldGate && narrative.progress() < 1) {
      narrative.resume();
    }
    if (travel && travel.progress() < 1) {
      travel.resume();
    }
    transfer?.resume();
  };

  /**
   * End the walk. The rover lands on the invitation stop rather than wherever
   * the clock happened to be: a dialogue hold, a presentation pause or a seek
   * may all have left the travel clock short of its own end.
   */
  const stopTravel = () => {
    if (travel) {
      applyTravel(1);
      travel.kill();
      travel = null;
    }
  };

  /** Build both Part A timelines. Called on play-through and on restart. */
  const buildPartA = (): gsap.core.Timeline => {
    narrative = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });

    narrative.set(nodes.percy.body, { x: P04_TRAVEL.fromX, opacity: 1 }, 0);
    narrative.set(nodes.fade, { opacity: 0 }, 0);
    narrative.call(() => {
      if (!disposed) {
        setPhase('entry');
      }
    }, [], 0);

    // Four lines, as recorded: rolling, distance, dimensions with the wheels,
    // then the invitation. The annotation beats stay three, because the
    // dimensions line covers both the body and the wheels.
    cue(narrative, 'p04-narrator-01', BEAT_1_AT);
    narrative.call(() => !disposed && setPhase('distance'), [], BEAT_2_AT);
    cue(narrative, 'p04-narrator-02', BEAT_2_AT);
    narrative.call(() => !disposed && setPhase('dimensions'), [], BEAT_3_AT);
    cue(narrative, 'p04-narrator-03', BEAT_3_AT);
    narrative.call(() => !disposed && setPhase('wheels'), [], INVITATION_AT);
    narrative.call(
      () => {
        if (disposed) {
          return;
        }
        // The gentle stop: travel has already landed on the invitation stop, so
        // it is killed here rather than left as a hidden loop.
        stopTravel();
        setPhase('invitation');
      },
      [],
      INVITATION_AT,
    );
    cue(narrative, P04_INVITATION_LINE_ID, INVITATION_AT);
    narrative.call(() => !disposed && setPhase('awaiting-inspection'), [], AWAITING_AT);
    narrative.to({}, { duration: NARRATIVE_END - AWAITING_AT }, AWAITING_AT);

    // Travel is deliberately its own timeline: a dialogue gate pauses the
    // narrative, and the rover must keep rolling underneath it.
    const duration = travelDuration() || 1;
    const carrier = { progress: 0 };
    travel = gsap.timeline({ paused: true });
    travel.to(
      carrier,
      {
        progress: 1,
        duration,
        ease: 'sine.inOut',
        onUpdate: () => {
          if (!disposed) {
            applyTravel(carrier.progress);
          }
        },
      },
      0,
    );
    travel.eventCallback('onComplete', () => {
      if (!disposed) {
        applyTravel(1);
      }
    });
    return narrative;
  };

  const labelsOf = (timeline: gsap.core.Timeline): Record<string, number> =>
    timeline.labels as Record<string, number>;

  const firstNarrative = buildPartA();

  const driver: P04Driver = {
    labels: labelsOf(firstNarrative),
    phase: () => phase,

    play,

    pause: () => {
      pauseAll();
    },

    resume: () => {
      resumeSegments();
    },

    restart: () => {
      if (disposed) {
        return;
      }
      for (const segment of segments()) {
        segment.kill();
      }
      narrative = null;
      travel = null;
      transfer = null;
      heldGate = null;
      entered = false;
      presentationPaused = false;
      nodes.fade.opacity = 0;
      driver.labels = labelsOf(buildPartA());
      play();
    },

    isRunning: () => {
      if (disposed || presentationPaused) {
        return false;
      }
      return segments().some((segment) => segment.progress() < 1);
    },

    releaseDialogue: (lineId) => {
      if (disposed || heldGate?.lineId !== lineId) {
        return;
      }
      heldGate = null;
      if (!presentationPaused) {
        narrative?.resume();
        transfer?.resume();
      }
    },

    beginHandoff: () => {
      if (disposed || entered || phase !== 'awaiting-inspection') {
        return false;
      }
      entered = true;
      stopTravel();
      transfer?.kill();
      transfer = gsap.timeline();
      transfer.call(() => {
        if (!disposed) {
          setPhase('handoff');
        }
      }, [], 0);
      // Percy leaves the ground picture as the hand lifts him out of it.
      const lift = motion(0.45, 0.05);
      transfer.to(nodes.percy.body, { opacity: 0, duration: lift, ease: 'none' }, 0);
      transfer.call(() => {
        if (!disposed) {
          setPhase('exit');
        }
      }, [], lift);
      const fade = motion(0.6, 0.1);
      transfer.to(nodes.fade, { opacity: 1, duration: fade, ease: 'none' }, lift);
      transfer.call(
        () => {
          if (!disposed) {
            options.onExitFadeFinished();
          }
        },
        [],
        lift + fade,
      );
      if (!presentationPaused) {
        transfer.play(0);
      }
      return true;
    },

    setPresentationPaused: (value) => {
      presentationPaused = value;
      if (value) {
        pauseAll();
        return;
      }
      resumeSegments();
    },

    setReducedMotion: (value) => {
      reducedMotion = value;
      nodes.flags.reducedMotion = value;
    },

    dispose: () => {
      disposed = true;
      heldGate = null;
      for (const segment of segments()) {
        segment.kill();
      }
      narrative = null;
      travel = null;
      transfer = null;
    },
  };

  return driver;
}

/** Used by the scene chrome so the read-out matches the driver's own stop. */
export const P04_TRAVEL_END_X = P04_INVITATION_X;
