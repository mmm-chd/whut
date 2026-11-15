import gsap from 'gsap';
import {
  addConfused,
  addExcited,
  addInspect,
  addLookAround,
  addPointMast,
  addRelax,
} from '../../characters/percy/percyClips';
import type { PausableTimeline } from '../../engine/narrativeControllerContext';
import { getP03Line, lineDisplaySeconds } from './dialogue';
import { DOOR, ROCKET, type CameraPose, type P03Layout } from './layout';
import { isPercyOffscreen, type P03Nodes } from './nodes';
import type { P03Phase } from './state';

export type P03Gate = { kind: 'dialogue'; lineId: string } | { kind: 'game' };

export interface P03TimelineOptions {
  nodes: P03Nodes;
  layout: P03Layout;
  reducedMotion: boolean;
  holdLineIds: readonly string[];
  onPhase: (phase: P03Phase) => void;
  onLabel: (label: string) => void;
  onGate: (gate: P03Gate) => void;
  /** The time-slider game opens; the story waits until `releaseGame`. */
  onGame: () => void;
  /** Reports how many rover cards are shown. */
  onCards: (shown: number) => void;
  /** Percy's whole visible width is past the picture edge after the exit. */
  onPercyExit: () => void;
  /** The excited beat (hop, or the reduced-motion pose) has finished. */
  onExcited: () => void;
  onComplete: () => void;
  /** Lets an already-resolved line skip its gate without deadlocking. */
  isDialogueResolved?: (lineId: string) => boolean;
}

export interface P03Timeline extends PausableTimeline {
  play: (time?: number) => void;
  pause: () => void;
  resume: () => void;
  restart: () => void;
  isRunning: () => boolean;
  labels: Record<string, number>;
  seek: (time: number, suppressEvents?: boolean) => void;
  paused: () => boolean;
  releaseDialogue: (lineId: string) => void;
  releaseGame: () => void;
  setPresentationPaused: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  dispose: () => void;
}

/** A cue must reach the dialogue store before its gate pauses the story. */
const DIALOGUE_GATE_DELAY = 0.01;
/** Pause between one narration beat and the next. */
const LINE_GAP = 1;
/** Seconds after a rover-line label when each card appears (normal / reduced motion). */
const CARD_OFFSETS = [1.8, 3, 4.2, 5.4] as const;
const CARD_OFFSETS_REDUCED = [0.2, 0.4, 0.6, 0.8] as const;

/**
 * P-03 timeline.
 *
 * Narration over the walk is auto and never holds the story, so cues are
 * placed from each line's real display time (typing plus hold) rather than
 * from a fixed slot, and no beat talks about something already gone.
 * Lines at stops hold the story through their gate.
 *
 * The driver starts paused. Only `releaseDialogue` continues past a gate;
 * generic `resume()` cannot bypass one.
 */
export function createP03Timeline(options: P03TimelineOptions): P03Timeline {
  const { nodes, layout } = options;
  const { percy, camera, rocket, door, dust, scan, cards } = nodes;

  let disposed = false;
  let completed = false;
  let heldGate: P03Gate | null = null;
  let reducedMotion = options.reducedMotion;
  let presentationPaused = false;

  const timeline = gsap.timeline({ paused: true, defaults: { ease: 'power2.out' } });
  const reduced = () => reducedMotion;
  const motion = (normal: number, short = 0.01) => (reduced() ? short : normal);
  const holdingIds = new Set(options.holdLineIds);
  const shown = (id: string) => lineDisplaySeconds(getP03Line(id), reduced());

  const call = (fn: () => void, at: number) => {
    timeline.call(
      () => {
        if (!disposed) {
          fn();
        }
      },
      [],
      at,
    );
  };
  const phase = (value: P03Phase, at: number) => call(() => options.onPhase(value), at);
  const rawResume = () => {
    if (!disposed) {
      timeline.resume();
    }
  };

  /** Cue a line at `at`; a holding line also pauses the story 0.01 s later. */
  const cue = (lineId: string, at: number) => {
    const label = getP03Line(lineId).timelineLabel;
    timeline.addLabel(label, at);
    call(() => options.onLabel(label), at);
    if (!holdingIds.has(lineId)) {
      return;
    }
    timeline.addPause(at + DIALOGUE_GATE_DELAY, () => {
      if (disposed) {
        return;
      }
      if (options.isDialogueResolved?.(lineId)) {
        queueMicrotask(rawResume);
        return;
      }
      const gate: P03Gate = { kind: 'dialogue', lineId };
      heldGate = gate;
      options.onGate(gate);
    });
  };

  const toPose = (pose: CameraPose, at: number, duration: number, ease = 'power2.inOut') => {
    timeline.to(
      camera,
      { x: pose.x, lift: pose.lift, scale: pose.scale, duration, ease },
      at,
    );
  };

  /** Roll Percy to `x`; with `follow` the camera tracks him on the same ease. */
  const rollTo = (x: number, at: number, duration: number, follow: boolean, ease = 'power1.inOut') => {
    timeline.to(percy.body, { x, duration, ease }, at);
    if (follow) {
      timeline.to(
        camera,
        { x: layout.followX(x), scale: layout.followScale, lift: layout.followLift, duration, ease },
        at,
      );
    }
  };

  const puff = (index: number, at: number) => {
    const node = dust[index];
    timeline.set(node, { opacity: 0.8, scale: 0.6 }, at);
    timeline.to(node, { scale: 1.9, opacity: 0, duration: motion(1.4, 0.05), ease: 'power1.out' }, at);
  };

  // --- First frame ---------------------------------------------------------------
  timeline.set(camera, { ...layout.poses.landing }, 0);
  timeline.set(rocket, { y: -ROCKET.dropHeight }, 0);
  timeline.set(percy.body, { x: layout.jumpFromX, y: -DOOR.sill, opacity: 0 }, 0);
  timeline.set(door, { open: 0 }, 0);
  timeline.set(cards, { shown: 0, visible: 0 }, 0);
  timeline.set(scan, { opacity: 0 }, 0);

  // --- Landing: the rocket comes down and dust rings the pad ------------------------
  phase('landing', 0);
  const descent = motion(4, 0.3);
  timeline.to(rocket, { y: 0, duration: descent, ease: 'power2.out' }, 0.4);
  const touchdown = 0.4 + descent;
  if (!reduced()) {
    [0, 1, 2].forEach((index) => puff(index, touchdown + index * 0.12));
  }

  // --- Door: zoom in, slide open -------------------------------------------------------
  let t = touchdown + 0.8;
  phase('door', t);
  toPose(layout.poses.door, t, motion(1.6, 0.2));
  timeline.to(door, { open: 1, duration: motion(1.4, 0.2), ease: 'power2.inOut' }, t + motion(1.2, 0.1));

  // --- Exit: Percy appears at the sill, jumps down, rolls away ------------------------
  t += motion(3, 0.5);
  phase('exit', t);
  timeline.to(percy.body, { opacity: 1, duration: motion(0.35, 0.05), ease: 'none' }, t);
  const fall = motion(0.9, 0.2);
  const jumpAt = t + motion(0.25, 0);
  if (reduced()) {
    timeline.to(percy.body, { x: layout.landX, y: 0, duration: fall, ease: 'none' }, jumpAt);
  } else {
    // A short hop up, then the fall: forward speed eases out, the drop eases in.
    timeline.to(percy.body, { y: -DOOR.sill - 28, duration: 0.18, ease: 'power2.out' }, jumpAt);
    timeline.to(percy.body, { y: 0, duration: fall - 0.18, ease: 'power2.in' }, jumpAt + 0.18);
    timeline.to(percy.body, { x: layout.landX, duration: fall, ease: 'power1.out' }, jumpAt);
    timeline.to(percy.body, { rotation: 7, duration: fall * 0.7, ease: 'sine.in' }, jumpAt + 0.1);
    timeline.to(percy.body, { rotation: 0, duration: 0.35, ease: 'back.out(2)' }, jumpAt + fall);
    [3, 4, 5].forEach((index) => puff(index, jumpAt + fall + (index - 3) * 0.12));
  }
  t = jumpAt + fall + (reduced() ? 0 : 0.35);

  const exitRoll = motion(3.4, 0.5);
  rollTo(layout.exitOffX, t, exitRoll, false);
  t += exitRoll;
  call(() => {
    if (isPercyOffscreen(nodes, layout)) {
      options.onPercyExit();
    }
  }, t);

  // --- Reveal: zoom out and catch up with Percy --------------------------------------
  phase('reveal', t);
  const revealDuration = motion(4, 0.6);
  rollTo(layout.stopA, t, revealDuration, true);
  t += revealDuration;

  // --- Walk: auto narration, Percy never stops for text -----------------------------
  phase('walk', t);
  let cursor = t + 0.5;

  cue('p03-narrator-01', cursor);
  rollTo(layout.stopA2, cursor, shown('p03-narrator-01'), true);
  cursor += shown('p03-narrator-01') + LINE_GAP;

  phase('look-around', cursor);
  cue('p03-narrator-02', cursor);
  addLookAround(timeline, percy, cursor + 0.3, reduced());
  cursor += shown('p03-narrator-02') + LINE_GAP;

  cue('p03-narrator-03', cursor);
  const wheelsLine = shown('p03-narrator-03');
  rollTo(layout.stopB - 200, cursor, wheelsLine, true);
  addInspect(timeline, percy, cursor + wheelsLine * 0.5, reduced());
  addRelax(timeline, percy, cursor + wheelsLine - 0.7, reduced());
  cursor += wheelsLine + LINE_GAP;

  // --- Inspect: close-up on the rock, scan ring ----------------------------------------
  phase('inspect', cursor);
  cue('p03-narrator-04', cursor);
  const approach = motion(1.4, 0.2);
  toPose(layout.poses.inspect, cursor, approach);
  timeline.to(percy.body, { x: layout.stopB, duration: approach, ease: 'power1.inOut' }, cursor);
  addInspect(timeline, percy, cursor + approach, reduced());
  timeline.to(scan, { opacity: 1, duration: 0.3, ease: 'none' }, cursor + approach + 0.2);
  timeline.to(scan, { opacity: 0, duration: 0.5, ease: 'none' }, cursor + approach + 2.6);
  cursor += Math.max(shown('p03-narrator-04'), approach + 3.2) + LINE_GAP;

  // --- Confused: two Percy lines hold the story ---------------------------------------
  phase('confused', cursor);
  addRelax(timeline, percy, cursor, reduced());
  toPose(layout.poses.confused, cursor, motion(1.8, 0.2));
  const toC = motion(3, 0.5);
  timeline.to(percy.body, { x: layout.stopC, duration: toC, ease: 'power1.inOut' }, cursor);
  cursor += toC + 0.3;
  addConfused(timeline, percy, cursor, reduced());
  cue('p03-percy-01', cursor + 0.2);
  cue('p03-percy-02', cursor + 1.2);
  cue('p03-narrator-05', cursor + 2.2);
  const mission = cursor + 2.2 + shown('p03-narrator-05') + 0.6;
  cue('p03-narrator-06', mission);
  cursor = mission + 0.5;

  // --- Rovers: four cards follow the names in the narration ---------------------------
  phase('rovers', cursor);
  toPose(layout.poses.rovers, cursor, motion(1.8, 0.2));
  const roversStart = cursor + 0.3;
  cue('p03-narrator-07', roversStart);
  timeline.set(cards, { visible: 1 }, roversStart);
  const offsets = reduced() ? CARD_OFFSETS_REDUCED : CARD_OFFSETS;
  offsets.forEach((offset, index) => {
    timeline.set(cards, { shown: index + 1 }, roversStart + offset);
    call(() => options.onCards(index + 1), roversStart + offset);
  });
  const roversEnd = roversStart + Math.max(shown('p03-narrator-07'), offsets[3] + 1);
  timeline.set(cards, { visible: 0 }, roversEnd);
  cursor = roversEnd + LINE_GAP;

  // --- Mission: three lines, then the excited beat -------------------------------------
  phase('mission', cursor);
  toPose(layout.poses.mission, cursor, motion(1.6, 0.2));
  addPointMast(timeline, percy, cursor + 0.4, reduced());
  cue('p03-narrator-08', cursor + 0.6);
  cue('p03-narrator-09', cursor + 1.6);
  cue('p03-narrator-10', cursor + 2.6);
  cursor += 3.2;

  phase('excited', cursor);
  const hop = addExcited(timeline, percy, cursor, reduced());
  call(() => options.onExcited(), cursor + hop);
  cursor += hop + 0.2;

  // --- Time slider: pull back, say why, then the reader plays ---------------------------
  phase('timeline', cursor);
  addPointMast(timeline, percy, cursor, reduced());
  toPose(layout.poses.final, cursor, motion(3, 0.3));
  const quoteAt = cursor + 1;
  // The transition quote leaves on its own (it holds the story until it does).
  cue('p03-narrator-11', quoteAt);
  const gameAt = quoteAt + 0.6;
  timeline.addLabel('time-game', gameAt);
  timeline.addPause(gameAt, () => {
    if (disposed) {
      return;
    }
    heldGate = { kind: 'game' };
    options.onGame();
  });

  // --- Final quote: one Continue, anywhere on the screen --------------------------------
  const finalPhaseAt = gameAt + 0.05;
  phase('final-quote', finalPhaseAt);
  const finalAt = finalPhaseAt + 0.5;
  cue('p03-narrator-12', finalAt);

  const transitionAt = finalAt + 0.5;
  phase('transition', transitionAt);
  call(() => {
    if (completed) {
      return;
    }
    completed = true;
    options.onComplete();
  }, transitionAt + motion(1, 0.1));

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
      completed = false;
      presentationPaused = false;
      timeline.restart();
    },
    isRunning: () =>
      !disposed && !presentationPaused && !timeline.paused() && timeline.progress() < 1,
    releaseGame: () => {
      if (disposed || heldGate?.kind !== 'game') {
        return;
      }
      heldGate = null;
      if (!presentationPaused) {
        timeline.resume();
      }
    },
    releaseDialogue: (lineId) => {
      if (disposed || heldGate?.kind !== 'dialogue' || heldGate.lineId !== lineId) {
        return;
      }
      heldGate = null;
      if (!presentationPaused) {
        timeline.resume();
      }
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
      timeline.kill();
    },
  };
}
