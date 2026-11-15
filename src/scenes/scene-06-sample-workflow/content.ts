/**
 * P-05 (story) / `scene-06-sample-workflow` (runtime): the sampling game.
 *
 * Targets, sites, the default session and the fact records live here as plain
 * data. Outcomes are derived from this data and never rolled: a fragile rock
 * always yields an atmosphere sample and a solid rock always yields a core.
 */
export type RockId = 'layered-rock' | 'fragile-rock' | 'dusty-rock';
export type RockCondition = 'solid-layered' | 'cracked-fragile' | 'lightly-dusty';
export type SampleKind = 'core' | 'atmosphere';
export type ToolMode = 'brush' | 'pan';

/** A site on a rock, in the rock's own 0..1 coordinates. */
export interface SampleSite {
  readonly id: string;
  readonly rockId: RockId;
  readonly u: number;
  readonly v: number;
}

/** The brushable face of a rock: an ellipse in 0..1 coordinates. */
export interface EligibleShape {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export interface RockTarget {
  readonly id: RockId;
  readonly label: string;
  readonly condition: RockCondition;
  readonly shape: EligibleShape;
  readonly description: string;
  readonly sites: readonly SampleSite[];
}

export interface SessionConfig {
  readonly targetTubeCount: number;
  readonly minimumCoreCount: number;
  readonly maximumAtmosphereCount: number;
  readonly brushThreshold: number;
  readonly stableDrillMs: number;
  readonly fragileDrillMs: number;
}

export const P05_SAMPLE_SESSION: SessionConfig = {
  targetTubeCount: 2,
  minimumCoreCount: 1,
  maximumAtmosphereCount: 1,
  brushThreshold: 0.85,
  stableDrillMs: 1800,
  fragileDrillMs: 900,
};

export const P05_SAMPLE_INTERACTION_IDS = [
  'p05-sample-gameplay-complete',
  'p05-sample-ending-read',
  'p05-sample-next-choice',
] as const;

export const P05_SAMPLE_ROCKS: readonly RockTarget[] = [
  {
    id: 'layered-rock',
    label: 'Layered rock',
    condition: 'solid-layered',
    shape: { cx: 0.5, cy: 0.52, rx: 0.4, ry: 0.36 },
    description: 'Solid and layered. This looks like a good place to collect a core.',
    sites: [
      { id: 'layered-a', rockId: 'layered-rock', u: 0.38, v: 0.5 },
      { id: 'layered-b', rockId: 'layered-rock', u: 0.64, v: 0.52 },
    ],
  },
  {
    id: 'fragile-rock',
    label: 'Cracked rock',
    condition: 'cracked-fragile',
    shape: { cx: 0.5, cy: 0.52, rx: 0.38, ry: 0.34 },
    description: 'Cracked and fragile. A core might break apart.',
    sites: [{ id: 'fragile-a', rockId: 'fragile-rock', u: 0.5, v: 0.5 }],
  },
  {
    id: 'dusty-rock',
    label: 'Dusty rock',
    condition: 'lightly-dusty',
    shape: { cx: 0.5, cy: 0.54, rx: 0.4, ry: 0.34 },
    description: 'A little dust remains, but the cleaned surface is firm.',
    sites: [
      { id: 'dusty-a', rockId: 'dusty-rock', u: 0.36, v: 0.52 },
      { id: 'dusty-b', rockId: 'dusty-rock', u: 0.66, v: 0.5 },
    ],
  },
];

export function findRock(id: RockId): RockTarget {
  const rock = P05_SAMPLE_ROCKS.find((candidate) => candidate.id === id);
  if (!rock) {
    throw new Error(`Unknown rock: ${id}`);
  }
  return rock;
}

export function findSite(siteId: string): SampleSite | null {
  for (const rock of P05_SAMPLE_ROCKS) {
    const site = rock.sites.find((candidate) => candidate.id === siteId);
    if (site) {
      return site;
    }
  }
  return null;
}

/** Which kind of sample a rock yields. Derived from the rock, never random. */
export function outcomeForRock(rockId: RockId): SampleKind {
  return findRock(rockId).condition === 'cracked-fragile' ? 'atmosphere' : 'core';
}

export function drillMsForRock(config: SessionConfig, rockId: RockId): number {
  return outcomeForRock(rockId) === 'atmosphere' ? config.fragileDrillMs : config.stableDrillMs;
}

/** A recoverable reason a config cannot be used, or null when it is valid. */
export function validateSessionConfig(config: SessionConfig): string | null {
  const counts = [config.targetTubeCount, config.minimumCoreCount, config.maximumAtmosphereCount];
  if (!counts.every((value) => Number.isInteger(value) && value >= 0)) {
    return 'Tube counts must be whole numbers.';
  }
  if (config.targetTubeCount < 1 || config.targetTubeCount > 3) {
    return 'A session holds between 1 and 3 tubes.';
  }
  if (config.minimumCoreCount < 1) {
    return 'A session needs at least one rock core.';
  }
  if (config.minimumCoreCount > config.targetTubeCount) {
    return 'There are fewer tubes than required cores.';
  }
  if (config.maximumAtmosphereCount > config.targetTubeCount - config.minimumCoreCount) {
    return 'Too many atmosphere tubes for the cores this session needs.';
  }
  if (!Number.isFinite(config.brushThreshold) || config.brushThreshold <= 0 || config.brushThreshold > 1) {
    return 'The brush threshold must be above 0 and at most 1.';
  }
  if (
    !Number.isFinite(config.stableDrillMs) ||
    !Number.isFinite(config.fragileDrillMs) ||
    config.stableDrillMs <= 0 ||
    config.fragileDrillMs <= 0
  ) {
    return 'Drill times must be positive numbers.';
  }
  return null;
}

/** Every rock and site must be usable before the game mounts. */
export function validateRocks(rocks: readonly RockTarget[], config: SessionConfig): string | null {
  const ids = new Set<string>();
  let coreSites = 0;
  for (const rock of rocks) {
    const { shape } = rock;
    const finite = [shape.cx, shape.cy, shape.rx, shape.ry].every(Number.isFinite);
    if (!finite || shape.rx <= 0 || shape.ry <= 0) {
      return `Rock ${rock.id} has no usable surface.`;
    }
    for (const site of rock.sites) {
      if (ids.has(site.id)) {
        return `Duplicate site id ${site.id}.`;
      }
      ids.add(site.id);
      if (![site.u, site.v].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) {
        return `Site ${site.id} is outside its rock.`;
      }
      if (rock.condition !== 'cracked-fragile') {
        coreSites += 1;
      }
    }
  }
  return coreSites >= config.targetTubeCount ? null : 'There are not enough solid sites to fill every tube.';
}

export type FactStatus = 'draft' | 'verified';

export interface FactRecord {
  readonly id: string;
  readonly code: string;
  readonly title: string;
  readonly summary: string;
  readonly source: string;
  readonly url: string | null;
  readonly retrieved: string | null;
  readonly status: FactStatus;
}

/**
 * Child-readable fact cards. Nothing here is marked `verified`: the sources
 * must be read on a NASA/JPL page before release, and the cards say so in the
 * data instead of pretending. FACT-12's number comes from the approved script.
 */
export const P05_SAMPLE_FACTS: readonly FactRecord[] = [
  {
    id: 'fact-12',
    code: 'P05-SAMPLE-TUBE-COUNT',
    title: 'A lot of tubes',
    summary:
      'Percy carries 43 sample tubes from Earth. This game uses only a few of them, so you can finish in one sitting.',
    source: 'Approved P-05 script (dialog-perseverance.pdf); NASA/JPL page still to be checked',
    url: null,
    retrieved: null,
    status: 'draft',
  },
  {
    id: 'fact-13',
    code: 'P05-SAMPLE-ABRASION',
    title: 'Why clean the rock?',
    summary:
      'Before looking closely at a rock, Percy can scrape off a thin layer of dust. The brush in this game is a simple way to show that idea. Cleaning does not promise a good core.',
    source: 'NASA/JPL abrasion tool page — to be checked',
    url: null,
    retrieved: null,
    status: 'draft',
  },
  {
    id: 'fact-14',
    code: 'P05-SAMPLE-ROUBION',
    title: 'When the rock crumbles',
    summary:
      'On its first try, Percy drilled a rock that crumbled, so no core was collected. The tube held Martian air instead. Air is not the same as a rock core.',
    source: 'NASA/JPL Roubion sampling attempt — to be checked',
    url: null,
    retrieved: null,
    status: 'draft',
  },
  {
    id: 'fact-15',
    code: 'P05-SAMPLE-HANDLING',
    title: 'Keeping a sample safe',
    summary:
      'A collected sample is moved into a tube and sealed. This game shortens those steps into one button.',
    source: 'NASA/JPL sample handling pages — to be checked',
    url: null,
    retrieved: null,
    status: 'draft',
  },
  {
    id: 'fact-16',
    code: 'P05-SAMPLE-BACKUPS',
    title: 'A backup next door',
    summary:
      'Scientists like having a second sample from a spot right beside the first one, in a fresh hole, in case something goes wrong.',
    source: 'NASA/JPL sample depot and paired samples — to be checked',
    url: null,
    retrieved: null,
    status: 'draft',
  },
];

export function findFact(id: string): FactRecord | null {
  return P05_SAMPLE_FACTS.find((fact) => fact.id === id) ?? null;
}
