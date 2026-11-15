import { cellIndex, COLUMNS, type Cell } from './grid';
import { positionOf, startMotion, stepDiscrete, stepMotion, DISCRETE_STEP_MS, MAX_DELTA_MS, type MotionEvent, type MotionState } from './movement';
import type { RunnerNodes } from './nodes';
import type { NavigationMap } from './map';
import { browserFrameEnv, type FrameEnv } from '../shared/frameEnv';

export type { FrameEnv };

/**
 * The Runner's one active-time driver.
 *
 * Opening drive, signal transit, route movement, obstacle assessment and the
 * exit fade all advance by measured active time: a paused or hidden scene adds
 * nothing, and the clock anchor is dropped on resume so a long pause cannot
 * become one huge step. The driver owns continuous position; it reports
 * milestones through callbacks that carry the command and route revision, and
 * the hook decides what they mean. It never picks a destination.
 */
export const SIGNAL_MS = 2500;
export const ASSESS_MS = 650;
export const EXIT_MS = 450;

export type DriverKind = 'signal' | 'assess' | 'exit';

export interface DriverCallbacks {
  onOpeningArrived: () => void;
  onSignalFinished: (commandId: number) => void;
  onWaypoint: (commandId: number, revision: number, index: number) => void;
  onBlocked: (commandId: number, revision: number, cell: Cell) => void;
  onGoal: (commandId: number, revision: number) => void;
  onAssessmentFinished: (commandId: number, revision: number) => void;
  onExitFinished: (commandId: number) => void;
  /** 0..1 progress of the current timed beat, for the status illustrations. */
  onProgress?: (kind: DriverKind, value: number) => void;
  /** Called after every frame that moved Percy, for overlays that follow him. */
  onFrame?: () => void;
}

type Job =
  | { readonly type: 'idle' }
  | { readonly type: 'opening'; motion: MotionState; cellsPerSecond: number; stepEvery: number; sinceStep: number }
  | { readonly type: 'route'; motion: MotionState; commandId: number; revision: number; sinceStep: number }
  | { readonly type: 'timed'; kind: DriverKind; elapsed: number; total: number; commandId: number; revision: number };

export interface RunnerDriver {
  startOpening: (route: readonly Cell[], durationMs: number) => void;
  beginSignal: (commandId: number) => void;
  beginRoute: (commandId: number, revision: number, cells: readonly Cell[]) => void;
  beginAssessment: (commandId: number, revision: number) => void;
  beginExit: (commandId: number) => void;
  setPaused: (paused: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  isRunning: () => boolean;
  /** Stops everything and cancels the frame; safe to call twice. */
  dispose: () => void;
}

export interface DriverOptions {
  nodes: RunnerNodes;
  map: NavigationMap;
  callbacks: DriverCallbacks;
  reducedMotion: boolean;
  env?: FrameEnv;
}

export function createRunnerDriver(options: DriverOptions): RunnerDriver {
  const { nodes, map, callbacks } = options;
  const env = options.env ?? browserFrameEnv;
  let reduced = options.reducedMotion;
  let paused = false;
  let disposed = false;
  let job: Job = { type: 'idle' };
  let frame: number | null = null;
  let last: number | null = null;

  /** The truth about the ground: only the full-safety grid says a cell is clear. */
  const canEnter = (cell: Cell) => !map.safety.blocked.has(cellIndex(COLUMNS, cell));

  const writeMotion = (motion: MotionState) => {
    const at = positionOf(motion);
    nodes.percy.x = at.x;
    nodes.percy.y = at.y;
    nodes.percy.rotation = motion.heading;
  };

  const schedule = () => {
    if (disposed || frame !== null || paused || job.type === 'idle') {
      return;
    }
    frame = env.request(tick);
  };

  const setJob = (next: Job) => {
    job = next;
    last = null;
    schedule();
  };

  const handleEvents = (events: readonly MotionEvent[], commandId: number, revision: number) => {
    for (const event of events) {
      if (event.type === 'waypoint') {
        callbacks.onWaypoint(commandId, revision, event.index);
      } else if (event.type === 'blocked') {
        callbacks.onBlocked(commandId, revision, event.cell);
      } else {
        callbacks.onGoal(commandId, revision);
      }
    }
  };

  function tick() {
    frame = null;
    if (disposed || paused) {
      return;
    }
    const now = env.now();
    const delta = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_DELTA_MS);
    last = now;
    const current = job;

    if (current.type === 'opening') {
      let motion = current.motion;
      let arrived = false;
      if (reduced) {
        const sinceStep = current.sinceStep + delta;
        if (sinceStep >= current.stepEvery) {
          const step = stepDiscrete(motion, () => true);
          motion = step.state;
          arrived = motion.done;
          job = { ...current, motion, sinceStep: sinceStep - current.stepEvery };
        } else {
          job = { ...current, sinceStep };
        }
      } else {
        const step = stepMotion(motion, delta, () => true, current.cellsPerSecond);
        motion = step.state;
        arrived = motion.done;
        job = { ...current, motion };
      }
      writeMotion(motion);
      if (arrived) {
        job = { type: 'idle' };
        callbacks.onOpeningArrived();
      }
    } else if (current.type === 'route') {
      let motion = current.motion;
      let events: readonly MotionEvent[];
      if (reduced) {
        const sinceStep = current.sinceStep + delta;
        if (sinceStep >= DISCRETE_STEP_MS) {
          const step = stepDiscrete(motion, canEnter);
          motion = step.state;
          events = step.events;
          job = { ...current, motion, sinceStep: sinceStep - DISCRETE_STEP_MS };
        } else {
          events = [];
          job = { ...current, sinceStep };
        }
      } else {
        const step = stepMotion(motion, delta, canEnter);
        motion = step.state;
        events = step.events;
        job = { ...current, motion };
      }
      writeMotion(motion);
      if (motion.done || motion.blockedBy) {
        job = { type: 'idle' };
      }
      handleEvents(events, current.commandId, current.revision);
    } else if (current.type === 'timed') {
      const elapsed = Math.min(current.elapsed + delta, current.total);
      const value = current.total > 0 ? elapsed / current.total : 1;
      callbacks.onProgress?.(current.kind, value);
      if (elapsed >= current.total) {
        job = { type: 'idle' };
        if (current.kind === 'signal') {
          callbacks.onSignalFinished(current.commandId);
        } else if (current.kind === 'assess') {
          callbacks.onAssessmentFinished(current.commandId, current.revision);
        } else {
          callbacks.onExitFinished(current.commandId);
        }
      } else {
        job = { ...current, elapsed };
      }
    }
    callbacks.onFrame?.();
    schedule();
  }

  return {
    startOpening(route, durationMs) {
      if (disposed || route.length < 2) {
        return;
      }
      const seconds = Math.max(1, durationMs / 1000);
      const cellsPerSecond = (route.length - 1) / seconds;
      const motion = startMotion(route, 0);
      nodes.percy.opacity = 1;
      writeMotion(motion);
      setJob({
        type: 'opening',
        motion,
        cellsPerSecond,
        stepEvery: Math.max(DISCRETE_STEP_MS, durationMs / (route.length - 1)),
        sinceStep: 0,
      });
    },
    beginSignal(commandId) {
      if (disposed) {
        return;
      }
      setJob({ type: 'timed', kind: 'signal', elapsed: 0, total: SIGNAL_MS, commandId, revision: 0 });
    },
    beginRoute(commandId, revision, cells) {
      if (disposed || cells.length < 2) {
        return;
      }
      const motion = startMotion(cells, nodes.percy.rotation);
      writeMotion(motion);
      setJob({ type: 'route', motion, commandId, revision, sinceStep: 0 });
    },
    beginAssessment(commandId, revision) {
      if (disposed) {
        return;
      }
      setJob({ type: 'timed', kind: 'assess', elapsed: 0, total: reduced ? 250 : ASSESS_MS, commandId, revision });
    },
    beginExit(commandId) {
      if (disposed) {
        return;
      }
      setJob({ type: 'timed', kind: 'exit', elapsed: 0, total: reduced ? 150 : EXIT_MS, commandId, revision: 0 });
    },
    setPaused(next) {
      paused = next;
      last = null;
      if (paused && frame !== null) {
        env.cancel(frame);
        frame = null;
      }
      schedule();
    },
    setReducedMotion(next) {
      reduced = next;
    },
    isRunning: () => !disposed && !paused && job.type !== 'idle',
    dispose() {
      disposed = true;
      job = { type: 'idle' };
      if (frame !== null) {
        env.cancel(frame);
        frame = null;
      }
    },
  };
}
