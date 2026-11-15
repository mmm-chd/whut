import { browserFrameEnv, type FrameEnv } from '../shared/frameEnv';
import { exitTargetX, percyExitedRight } from './exitGeometry';
import { DEPARTURE_UNITS_PER_SECOND, TRAVEL_UNITS_PER_SECOND, type P08Layout } from './layout';
import type { P08Nodes } from './nodes';
import { TRACK_COUNT, revealedTracks, trackPositions, updateTrackOpacity } from './tracks';

/**
 * The ending's one active-time driver.
 *
 * Entry, the move to the side view, Percy's roll and stop, the close-up, the
 * quiet pause, the departure, the tracks focus and the final fade all advance by
 * measured active time: a paused or hidden scene adds nothing, and the clock
 * anchor is dropped on resume so a long pause cannot become one big step. The
 * driver owns transforms and delays only; the hook decides what each milestone
 * means. Percy is never moved by anything else.
 */
export const ENTRY_MS = 700;
export const HOPE_TRANSITION_MS = 650;
export const STOP_MS = 450;
export const CLOSEUP_MS = 800;
/** The Ding's visual beat. A recording, if one is added, plays through it. */
export const DING_MS = 600;
/** The quiet beat after the news. Kept in reduced motion too. */
export const REACTION_PAUSE_MS = 2200;
export const MAST_RELAX_MS = 550;
export const TRACKS_MOVE_MS = 700;
export const TRACKS_HOLD_MS = 1200;
export const FADE_MS = 1600;
export const MAX_DELTA_MS = 100;

export interface DriverCallbacks {
  onEntryFinished: () => void;
  onHopeTransitionFinished: () => void;
  onPercyStopped: () => void;
  onDingSettled: () => void;
  onCloseupFinished: () => void;
  onReactionPauseFinished: () => void;
  onPercyExited: () => void;
  onTracksSettled: () => void;
  onFadeFinished: () => void;
  /** Called after every frame that changed a node, for DOM that follows them. */
  onFrame?: () => void;
}

export interface P08Driver {
  beginEntry: () => void;
  beginHopeTransition: () => void;
  /** Rolls Percy right at travel speed, the camera following, until stopped. */
  beginTravel: () => void;
  /** Eases Percy to a stop; `onPercyStopped` fires when he has. */
  beginStop: () => void;
  /** The message-arrived beat; Percy has stopped, nothing else moves. */
  beginDing: () => void;
  beginCloseup: () => void;
  beginReactionPause: () => void;
  /** A gentle forward look after the quiet pause. */
  liftMast: () => void;
  beginDeparture: () => void;
  beginFade: () => void;
  setPaused: (paused: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setLayout: (layout: P08Layout) => void;
  isRunning: () => boolean;
  dispose: () => void;
}

interface Pose {
  readonly pan: number;
  readonly tilt: number;
  readonly arm: number;
}

type Job =
  | { readonly type: 'idle' }
  | { readonly type: 'timed'; readonly kind: 'entry' | 'transition' | 'closeup' | 'pause' | 'fade' | 'hold' | 'ding'; elapsed: number; readonly total: number; readonly from: CameraFrom | null }
  | { readonly type: 'travel' }
  | { readonly type: 'stop'; elapsed: number; readonly speed: number }
  | { readonly type: 'depart'; stage: 'relax' | 'roll' | 'focus' | 'hold'; elapsed: number; readonly positions: readonly number[]; from: CameraFrom | null };

interface CameraFrom {
  readonly x: number;
  readonly lift: number;
  readonly scale: number;
}

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface DriverOptions {
  readonly nodes: P08Nodes;
  readonly layout: P08Layout;
  readonly callbacks: DriverCallbacks;
  readonly reducedMotion: boolean;
  readonly env?: FrameEnv;
}

export function createP08Driver(options: DriverOptions): P08Driver {
  const { nodes, callbacks } = options;
  const env = options.env ?? browserFrameEnv;
  let layout = options.layout;
  let reduced = options.reducedMotion;
  let paused = false;
  let disposed = false;
  let job: Job = { type: 'idle' };
  let frame: number | null = null;
  let last: number | null = null;
  let poseTween: { from: Pose; to: Pose; elapsed: number; total: number } | null = null;

  const schedule = () => {
    if (disposed || frame !== null || paused || (job.type === 'idle' && poseTween === null)) {
      return;
    }
    frame = env.request(tick);
  };

  const setJob = (next: Job) => {
    job = next;
    last = null;
    schedule();
  };

  const readPose = (): Pose => ({
    pan: nodes.percy.mast.pan,
    tilt: nodes.percy.mast.tilt,
    arm: nodes.percy.arm.angle,
  });

  const tweenPose = (to: Pose, totalMs: number) => {
    if (reduced || totalMs <= 0) {
      nodes.percy.mast.pan = to.pan;
      nodes.percy.mast.tilt = to.tilt;
      nodes.percy.arm.angle = to.arm;
      poseTween = null;
      return;
    }
    poseTween = { from: readPose(), to, elapsed: 0, total: totalMs };
    schedule();
  };

  const cameraNow = (): CameraFrom => ({ x: nodes.camera.x, lift: nodes.camera.lift, scale: nodes.camera.scale });

  const setCamera = (from: CameraFrom, to: CameraFrom, t: number) => {
    nodes.camera.x = lerp(from.x, to.x, t);
    nodes.camera.lift = lerp(from.lift, to.lift, t);
    nodes.camera.scale = lerp(from.scale, to.scale, t);
  };

  const closeupPose = (): CameraFrom => ({
    x: nodes.percy.body.x,
    lift: layout.liftForGround(0.8, layout.closeupScale),
    scale: layout.closeupScale,
  });

  const tracksPose = (): CameraFrom => ({
    x: nodes.camera.x,
    lift: layout.liftForGround(0.55, layout.tracksScale),
    scale: layout.tracksScale,
  });

  const exitView = () => ({
    width: layout.width,
    unit: layout.unit,
    cameraX: nodes.camera.x,
    cameraScale: nodes.camera.scale,
  });

  const showTracks = (bodyX: number, positions: readonly number[]) => {
    updateTrackOpacity(nodes.trackOpacity, revealedTracks(bodyX, positions));
  };

  function finishTimed(kind: 'entry' | 'transition' | 'closeup' | 'pause' | 'fade' | 'hold' | 'ding') {
    switch (kind) {
      case 'entry':
        callbacks.onEntryFinished();
        break;
      case 'transition':
        callbacks.onHopeTransitionFinished();
        break;
      case 'closeup':
        callbacks.onCloseupFinished();
        break;
      case 'pause':
        callbacks.onReactionPauseFinished();
        break;
      case 'fade':
        callbacks.onFadeFinished();
        break;
      case 'ding':
        callbacks.onDingSettled();
        break;
      case 'hold':
        break;
    }
  }

  function tick() {
    frame = null;
    if (disposed || paused) {
      return;
    }
    const now = env.now();
    const delta = last === null ? 0 : Math.min(Math.max(now - last, 0), MAX_DELTA_MS);
    last = now;

    if (poseTween) {
      poseTween.elapsed = Math.min(poseTween.elapsed + delta, poseTween.total);
      const t = ease(poseTween.elapsed / poseTween.total);
      nodes.percy.mast.pan = lerp(poseTween.from.pan, poseTween.to.pan, t);
      nodes.percy.mast.tilt = lerp(poseTween.from.tilt, poseTween.to.tilt, t);
      nodes.percy.arm.angle = lerp(poseTween.from.arm, poseTween.to.arm, t);
      if (poseTween.elapsed >= poseTween.total) {
        poseTween = null;
      }
    }

    const current = job;
    if (current.type === 'timed') {
      current.elapsed = Math.min(current.elapsed + delta, current.total);
      const t = current.total > 0 ? current.elapsed / current.total : 1;
      if (current.kind === 'entry') {
        nodes.sampleReveal.opacity = ease(t);
      } else if (current.kind === 'transition') {
        nodes.sampleReveal.opacity = 1 - ease(t);
        nodes.world.opacity = ease(t);
      } else if (current.kind === 'closeup' && current.from) {
        setCamera(current.from, closeupPose(), ease(t));
      } else if (current.kind === 'fade') {
        nodes.cover.opacity = ease(t);
      }
      if (current.elapsed >= current.total) {
        job = { type: 'idle' };
        finishTimed(current.kind);
      }
    } else if (current.type === 'travel') {
      const next = nodes.percy.body.x + (TRAVEL_UNITS_PER_SECOND * delta) / 1000;
      // The ring of landscape is finite: Percy never rolls beyond what it covers.
      nodes.percy.body.x = Math.min(next, layout.maxCameraX - 400);
      nodes.camera.x = layout.followX(nodes.percy.body.x);
    } else if (current.type === 'stop') {
      current.elapsed = Math.min(current.elapsed + delta, STOP_MS);
      // Speed falls linearly to zero; the distance is the area under that line.
      const before = current.elapsed - delta;
      const slow = (t: number) => current.speed * (1 - t / STOP_MS);
      const travelled = ((slow(Math.max(0, before)) + slow(current.elapsed)) / 2) * (delta / 1000);
      nodes.percy.body.x += Math.max(0, travelled);
      nodes.camera.x = layout.followX(nodes.percy.body.x);
      if (current.elapsed >= STOP_MS) {
        job = { type: 'idle' };
        callbacks.onPercyStopped();
      }
    } else if (current.type === 'depart') {
      stepDeparture(current, delta);
    }

    callbacks.onFrame?.();
    schedule();
  }

  function stepDeparture(current: Extract<Job, { type: 'depart' }>, delta: number) {
    if (current.stage === 'relax') {
      current.elapsed += delta;
      if (current.elapsed >= (reduced ? 0 : MAST_RELAX_MS)) {
        current.stage = 'roll';
        current.elapsed = 0;
      }
      return;
    }
    if (current.stage === 'roll') {
      // The tracks focus zooms out, which brings the edge of the frame closer to
      // Percy in design units. He must be gone for both framings, or the final
      // picture would show him again.
      const view = exitView();
      const farView = { ...view, cameraScale: Math.min(view.cameraScale, layout.tracksScale) };
      const near = exitTargetX(view);
      const far = exitTargetX(farView);
      if (near === null || far === null) {
        return;
      }
      const target = Math.max(near, far);
      const speed = DEPARTURE_UNITS_PER_SECOND;
      nodes.percy.body.x = reduced ? target : Math.min(target, nodes.percy.body.x + (speed * delta) / 1000);
      showTracks(nodes.percy.body.x, current.positions);
      // Gone only when the whole rig envelope is past the live right edge.
      if (
        percyExitedRight({ ...view, bodyX: nodes.percy.body.x }) &&
        percyExitedRight({ ...farView, bodyX: nodes.percy.body.x })
      ) {
        current.stage = 'focus';
        current.elapsed = 0;
        current.from = cameraNow();
        callbacks.onPercyExited();
      }
      return;
    }
    if (current.stage === 'focus') {
      current.elapsed = Math.min(current.elapsed + delta, reduced ? 0 : TRACKS_MOVE_MS);
      const total = reduced ? 0 : TRACKS_MOVE_MS;
      const t = total > 0 ? current.elapsed / total : 1;
      if (current.from) {
        setCamera(current.from, tracksPose(), ease(t));
      }
      // The picture shows the full row by now, whatever pose it was drawn from.
      updateTrackOpacity(nodes.trackOpacity, TRACK_COUNT);
      if (current.elapsed >= total) {
        current.stage = 'hold';
        current.elapsed = 0;
      }
      return;
    }
    current.elapsed += delta;
    if (current.elapsed >= TRACKS_HOLD_MS) {
      job = { type: 'idle' };
      callbacks.onTracksSettled();
    }
  }

  return {
    beginEntry() {
      if (disposed) {
        return;
      }
      if (reduced) {
        nodes.sampleReveal.opacity = 1;
        callbacks.onEntryFinished();
        return;
      }
      setJob({ type: 'timed', kind: 'entry', elapsed: 0, total: ENTRY_MS, from: null });
    },
    beginHopeTransition() {
      if (disposed) {
        return;
      }
      nodes.percy.body.x = layout.hopeStartX;
      nodes.camera.x = layout.followX(layout.hopeStartX);
      nodes.camera.lift = 0;
      nodes.camera.scale = 1;
      if (reduced) {
        nodes.sampleReveal.opacity = 0;
        nodes.world.opacity = 1;
        callbacks.onHopeTransitionFinished();
        return;
      }
      setJob({ type: 'timed', kind: 'transition', elapsed: 0, total: HOPE_TRANSITION_MS, from: null });
    },
    beginTravel() {
      if (disposed) {
        return;
      }
      if (reduced) {
        // A stationary composition: Percy waits where he is.
        job = { type: 'idle' };
        return;
      }
      setJob({ type: 'travel' });
    },
    beginStop() {
      if (disposed) {
        return;
      }
      if (reduced || job.type !== 'travel') {
        job = { type: 'idle' };
        callbacks.onPercyStopped();
        return;
      }
      setJob({ type: 'stop', elapsed: 0, speed: TRAVEL_UNITS_PER_SECOND });
    },
    beginDing() {
      if (disposed) {
        return;
      }
      setJob({ type: 'timed', kind: 'ding', elapsed: 0, total: reduced ? 200 : DING_MS, from: null });
    },
    beginCloseup() {
      if (disposed) {
        return;
      }
      const from = cameraNow();
      if (reduced) {
        setCamera(from, closeupPose(), 1);
        callbacks.onCloseupFinished();
        return;
      }
      tweenPose({ pan: 0, tilt: 0, arm: 0 }, CLOSEUP_MS);
      setJob({ type: 'timed', kind: 'closeup', elapsed: 0, total: CLOSEUP_MS, from });
    },
    beginReactionPause() {
      if (disposed) {
        return;
      }
      // Quiet and honest: the mast sinks a little, and nothing else moves.
      tweenPose({ pan: -0.15, tilt: -0.35, arm: 0 }, 900);
      setJob({ type: 'timed', kind: 'pause', elapsed: 0, total: REACTION_PAUSE_MS, from: null });
    },
    liftMast() {
      if (disposed) {
        return;
      }
      tweenPose({ pan: 0.5, tilt: 0.35, arm: 0 }, 700);
    },
    beginDeparture() {
      if (disposed) {
        return;
      }
      // Rest pose first, no hop and no glow, then roll away from a fixed camera.
      nodes.percy.glow.opacity = 0;
      nodes.percy.body.y = 0;
      tweenPose({ pan: 0, tilt: 0, arm: 0 }, MAST_RELAX_MS);
      nodes.trackOrigin.x = nodes.percy.body.x;
      setJob({
        type: 'depart',
        stage: 'relax',
        elapsed: 0,
        positions: trackPositions(nodes.percy.body.x),
        from: null,
      });
    },
    beginFade() {
      if (disposed) {
        return;
      }
      if (reduced) {
        nodes.cover.opacity = 1;
        callbacks.onFadeFinished();
        return;
      }
      setJob({ type: 'timed', kind: 'fade', elapsed: 0, total: FADE_MS, from: null });
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
      nodes.flags.reducedMotion = next;
    },
    setLayout(next) {
      layout = next;
    },
    isRunning: () => !disposed && !paused && (job.type !== 'idle' || poseTween !== null),
    dispose() {
      disposed = true;
      job = { type: 'idle' };
      poseTween = null;
      if (frame !== null) {
        env.cancel(frame);
        frame = null;
      }
    },
  };
}
