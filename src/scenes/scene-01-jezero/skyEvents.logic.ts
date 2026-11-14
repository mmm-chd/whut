/**
 * Sky streak spawning rules for P-01 (meteors and comets), kept free of any
 * renderer so they stay unit-testable. `SkyStreaks.tsx` draws them.
 */
export type SkyEventKind = 'meteor' | 'comet';
/** Which world band a streak lives in. */
export type SkyEventBand = 'space' | 'mars';

/** Comet share of spawns; the rest are meteors. */
export const COMET_PROBABILITY = 0.22;
/** A comet is forced when none has appeared for this long. */
export const COMET_MAX_GAP_MS = 26_000;
/** Cap on streaks alive at once. */
export const MAX_CONCURRENT = 6;
/** Delay between spawns, in milliseconds. */
export const SPAWN_DELAY_MS = { min: 2800, max: 8200 } as const;

export interface SkyEventSpec {
  id: number;
  kind: SkyEventKind;
  band: SkyEventBand;
  /** Start position: x as a fraction of the host width, y of the band height. */
  x: number;
  y: number;
  /** Degrees, clockwise on screen. */
  angle: number;
  length: number;
  thickness: number;
  head: number;
  /** Travel along the axis as a fraction of the host width. */
  travel: number;
  /** Arc drop as a fraction of the host height. */
  drop: number;
  /** Comets sink with an ease-in; meteors fly straight. */
  dropEase: 'linear' | 'ease-in';
  durationMs: number;
}

export type Random = () => number;

const between = (random: Random, min: number, max: number) => min + random() * (max - min);

/**
 * Meteors: small, fast, warm cream, steep diagonal. Comets: large, slow,
 * icy cyan with a coma glow, shallow angle plus a sinking arc.
 */
export function createSkyEvent(
  id: number,
  kind: SkyEventKind,
  band: SkyEventBand,
  random: Random = Math.random,
): SkyEventSpec {
  const goingRight = random() < 0.5;
  const angle =
    kind === 'meteor'
      ? goingRight
        ? between(random, 18, 52)
        : between(random, 128, 162)
      : goingRight
        ? between(random, 5, 18)
        : between(random, 162, 175);
  const head = kind === 'meteor' ? between(random, 4, 6) : between(random, 10, 14);

  return {
    id,
    kind,
    band,
    x: (goingRight ? between(random, 0, 55) : between(random, 40, 92)) / 100,
    y: between(random, 2, 30) / 100,
    angle,
    length: kind === 'meteor' ? between(random, 60, 140) : between(random, 220, 380),
    thickness: kind === 'meteor' ? 2 : head,
    head,
    travel: (kind === 'meteor' ? between(random, 40, 68) : between(random, 55, 85)) / 100,
    drop: kind === 'meteor' ? 0 : between(random, 4, 10) / 100,
    dropEase: kind === 'meteor' ? 'linear' : 'ease-in',
    durationMs: kind === 'meteor' ? between(random, 700, 1200) : between(random, 4000, 7000),
  };
}

/**
 * Picks what to spawn next. Comets belong to space: once the camera has
 * reached the Mars sky only meteors spawn.
 */
export function chooseSpawn(
  skyPhase: 'space' | 'sky',
  now: number,
  lastCometAt: number,
  random: Random = Math.random,
): { kind: SkyEventKind; band: SkyEventBand } {
  const inSky = skyPhase === 'sky';
  const band: SkyEventBand = inSky ? 'mars' : 'space';
  const forceComet = !inSky && now - lastCometAt >= COMET_MAX_GAP_MS;
  const comet = !inSky && (forceComet || random() < COMET_PROBABILITY);
  return { kind: comet ? 'comet' : 'meteor', band };
}

/** Streak opacity over its life: 0 -> 1 by 12 %, hold to 78 %, then fade out. */
export function streakOpacity(progress: number): number {
  if (progress <= 0 || progress >= 1) {
    return 0;
  }
  if (progress < 0.12) {
    return progress / 0.12;
  }
  if (progress <= 0.78) {
    return 1;
  }
  return (1 - progress) / 0.22;
}

export interface StreakPose {
  /** Shell centre in container pixels. */
  x: number;
  y: number;
  /** Rotation in degrees, clockwise. */
  angle: number;
  opacity: number;
}

/**
 * Where a streak is at `progress` (0..1). The shell slides along its own axis
 * from one length behind its start to `travel`, and a comet's body also sinks
 * across the axis (the CSS body `translateY`).
 */
export function streakPose(
  spec: SkyEventSpec,
  progress: number,
  host: { width: number; height: number },
  bandTop: number,
  bandHeight: number,
): StreakPose {
  const axis = (spec.angle * Math.PI) / 180;
  const along = -spec.length + (spec.travel * host.width + spec.length) * progress;
  const eased = spec.dropEase === 'ease-in' ? progress * progress : progress;
  const across = spec.drop * host.height * eased;

  const startX = spec.x * host.width + spec.length / 2;
  const startY = bandTop + spec.y * bandHeight + spec.thickness / 2;
  return {
    x: startX + Math.cos(axis) * along - Math.sin(axis) * across,
    y: startY + Math.sin(axis) * along + Math.cos(axis) * across,
    angle: spec.angle,
    opacity: streakOpacity(progress),
  };
}
