import type { SceneStatus } from '../../engine/types';
import {
  P05_SAMPLE_ROCKS,
  P05_SAMPLE_SESSION,
  findRock,
  findSite,
  outcomeForRock,
  validateRocks,
  validateSessionConfig,
  type RockId,
  type SampleKind,
  type SessionConfig,
} from './content';

/**
 * The sampling game's semantic state.
 *
 * Everything the player can finish (a brushed site, an accepted rock, a drilled
 * core, a stored tube) is a typed event with run, attempt and site tokens, so a
 * late callback from an earlier attempt can never change the ledger. The engine
 * never sees these phases: it stays `waiting` from the intro to the choice.
 */
export type SamplingPhase =
  | 'loading'
  | 'opening'
  | 'intro'
  | 'brush'
  | 'inspect'
  | 'drill-ready'
  | 'drilling'
  | 'result-core'
  | 'result-atmosphere'
  | 'transfer'
  | 'seal'
  | 'store'
  | 'cycle-complete'
  | 'mission-complete'
  | 'achievement'
  | 'choice'
  | 'exiting';

export type CycleStage = 'brush' | 'inspect' | 'drill' | 'transfer' | 'seal' | 'store' | 'done';

export interface StoredSample {
  readonly id: string;
  readonly attemptId: number;
  readonly rockId: RockId;
  readonly siteId: string;
  readonly kind: SampleKind;
  readonly backupOf: string | null;
}

export interface SamplingCycle {
  readonly attemptId: number;
  readonly rockId: RockId;
  readonly siteId: string;
  readonly backupOf: string | null;
  readonly brushComplete: boolean;
  readonly inspectionAccepted: boolean;
  readonly drillOutcome: SampleKind | null;
  readonly stage: CycleStage;
}

export interface SiteRecord {
  readonly cleaned: boolean;
  readonly depleted: boolean;
}

export interface SamplingState {
  readonly runId: number;
  readonly config: SessionConfig;
  /** A recoverable setup problem; the game does not start while this is set. */
  readonly setupError: string | null;
  readonly phase: SamplingPhase;
  readonly cycle: SamplingCycle | null;
  readonly attemptCounter: number;
  readonly sites: Readonly<Record<string, SiteRecord>>;
  readonly stored: readonly StoredSample[];
  readonly factsSeen: readonly string[];
  /** A message explaining why the last request was declined. */
  readonly notice: string | null;
}

export type SamplingEvent =
  | { readonly type: 'SCENE_READY' }
  | { readonly type: 'OPENING_READ' }
  | { readonly type: 'START' }
  | { readonly type: 'CHOOSE_ROCK'; readonly rockId: RockId }
  | { readonly type: 'BRUSH_COMPLETE'; readonly attemptId: number; readonly siteId: string }
  | { readonly type: 'ACCEPT_SITE'; readonly attemptId: number; readonly siteId: string }
  | { readonly type: 'DRILL_STARTED'; readonly attemptId: number }
  | { readonly type: 'DRILL_RELEASED'; readonly attemptId: number }
  | { readonly type: 'DRILL_FINISHED'; readonly attemptId: number; readonly siteId: string }
  | { readonly type: 'SEAL_STORE_REQUESTED'; readonly attemptId: number }
  | { readonly type: 'TRANSFER_FINISHED'; readonly attemptId: number }
  | { readonly type: 'SEAL_FINISHED'; readonly attemptId: number }
  | { readonly type: 'STORE_FINISHED'; readonly attemptId: number }
  | { readonly type: 'NEXT_SITE'; readonly rockId?: RockId }
  | { readonly type: 'COLLECT_BACKUP' }
  | { readonly type: 'FACT_SEEN'; readonly factId: string }
  | { readonly type: 'ENDING_READ' }
  | { readonly type: 'ACHIEVEMENT_SEEN' }
  | { readonly type: 'NEXT_CHOSEN' };

export function createSamplingState(
  runId: number,
  config: SessionConfig = P05_SAMPLE_SESSION,
): SamplingState {
  const setupError = validateSessionConfig(config) ?? validateRocks(P05_SAMPLE_ROCKS, config);
  const sites: Record<string, SiteRecord> = {};
  for (const rock of P05_SAMPLE_ROCKS) {
    for (const site of rock.sites) {
      sites[site.id] = { cleaned: false, depleted: false };
    }
  }
  return {
    runId,
    config,
    setupError,
    phase: 'loading',
    cycle: null,
    attemptCounter: 0,
    sites,
    stored: [],
    factsSeen: [],
    notice: null,
  };
}

// ----- derived facts -------------------------------------------------------

export function storedCount(state: SamplingState, kind: SampleKind): number {
  return state.stored.filter((sample) => sample.kind === kind).length;
}

export function remainingSlots(state: SamplingState): number {
  return state.config.targetTubeCount - state.stored.length;
}

/** True when every tube is filled with the cores the session needs. */
export function isMissionComplete(state: SamplingState): boolean {
  return isMissionCompleteLedger(state) && !hasPendingSample(state);
}

export function hasPendingSample(state: SamplingState): boolean {
  const phase = state.phase;
  return (
    phase === 'result-core' ||
    phase === 'result-atmosphere' ||
    phase === 'transfer' ||
    phase === 'seal' ||
    phase === 'store'
  );
}

/**
 * Whether a site may be chosen for drilling. A fragile site is refused when
 * taking it would leave too few tubes for the cores the session still needs,
 * or when the atmosphere allowance is spent, so a drill attempt can never
 * break a site and then find nowhere to put the result.
 */
export function canSelectForDrill(
  state: SamplingState,
  siteId: string,
): { readonly ok: boolean; readonly reason: string | null } {
  const site = findSite(siteId);
  const record = state.sites[siteId];
  if (!site || !record || record.depleted) {
    return { ok: false, reason: 'That spot has already been drilled.' };
  }
  if (remainingSlots(state) <= 0) {
    return { ok: false, reason: 'All the tubes are full.' };
  }
  if (outcomeForRock(site.rockId) === 'atmosphere') {
    const coresStillNeeded = Math.max(0, state.config.minimumCoreCount - storedCount(state, 'core'));
    if (
      remainingSlots(state) - 1 < coresStillNeeded ||
      storedCount(state, 'atmosphere') >= state.config.maximumAtmosphereCount
    ) {
      return { ok: false, reason: "Let's save this tube for a rock core. Choose a solid rock." };
    }
  }
  return { ok: true, reason: null };
}

export function canStartDrill(state: SamplingState): boolean {
  const cycle = state.cycle;
  return (
    state.phase === 'drill-ready' &&
    cycle !== null &&
    cycle.brushComplete &&
    cycle.inspectionAccepted &&
    cycle.drillOutcome === null &&
    !state.sites[cycle.siteId]?.depleted
  );
}

export function canSealSample(state: SamplingState): boolean {
  return (state.phase === 'result-core' || state.phase === 'result-atmosphere') && state.cycle !== null;
}

export function canStoreSample(state: SamplingState): boolean {
  return state.phase === 'store' && state.cycle !== null && state.cycle.drillOutcome !== null;
}

/** First non-depleted site on a rock, or null. */
export function firstOpenSite(state: SamplingState, rockId: RockId): string | null {
  for (const site of findRock(rockId).sites) {
    if (!state.sites[site.id]?.depleted) {
      return site.id;
    }
  }
  return null;
}

/** The rock the game suggests next: solid rock first, never a depleted one. */
export function suggestedRock(state: SamplingState): RockId | null {
  const order: RockId[] = ['layered-rock', 'dusty-rock', 'fragile-rock'];
  for (const rockId of order) {
    const site = firstOpenSite(state, rockId);
    if (site && canSelectForDrill(state, site).ok) {
      return rockId;
    }
  }
  return null;
}

/** An adjacent fresh site on the rock of the most recent stored core. */
export function backupSite(state: SamplingState): { readonly siteId: string; readonly of: string } | null {
  const last = state.stored[state.stored.length - 1];
  if (!last || last.kind !== 'core' || remainingSlots(state) <= 0) {
    return null;
  }
  const siteId = firstOpenSite(state, last.rockId);
  if (!siteId || !canSelectForDrill(state, siteId).ok) {
    return null;
  }
  return { siteId, of: last.id };
}

export interface ChoiceGuardInput {
  readonly status: SceneStatus;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  readonly state: SamplingState;
  readonly gameplayCompleteMarked: boolean;
  readonly endingReadMarked: boolean;
}

/** The "next experience" choice is only enabled after the reward is read. */
export function canAcceptNextChoice(input: ChoiceGuardInput): boolean {
  return (
    input.sceneActive &&
    !input.paused &&
    input.status === 'waiting' &&
    input.state.phase === 'choice' &&
    input.gameplayCompleteMarked &&
    input.endingReadMarked &&
    isMissionComplete(input.state)
  );
}

// ----- reducer ------------------------------------------------------------

function startCycle(
  state: SamplingState,
  siteId: string,
  backupOf: string | null,
): SamplingState {
  const site = findSite(siteId);
  if (!site) {
    return state;
  }
  const attemptId = state.attemptCounter + 1;
  const cleaned = state.sites[siteId]?.cleaned ?? false;
  return {
    ...state,
    attemptCounter: attemptId,
    phase: cleaned ? 'inspect' : 'brush',
    notice: null,
    cycle: {
      attemptId,
      rockId: site.rockId,
      siteId,
      backupOf,
      brushComplete: cleaned,
      inspectionAccepted: false,
      drillOutcome: null,
      stage: cleaned ? 'inspect' : 'brush',
    },
  };
}

function withFact(state: SamplingState, factId: string): SamplingState {
  return state.factsSeen.includes(factId) ? state : { ...state, factsSeen: [...state.factsSeen, factId] };
}

function matches(state: SamplingState, attemptId: number, siteId?: string): boolean {
  const cycle = state.cycle;
  return cycle !== null && cycle.attemptId === attemptId && (siteId === undefined || cycle.siteId === siteId);
}

export function reduceSampling(state: SamplingState, event: SamplingEvent): SamplingState {
  if (state.setupError !== null) {
    return state;
  }

  switch (event.type) {
    case 'SCENE_READY':
      return state.phase === 'loading' ? { ...state, phase: 'opening' } : state;

    case 'OPENING_READ':
      return state.phase === 'opening' ? { ...state, phase: 'intro' } : state;

    case 'START': {
      if (state.phase !== 'intro') {
        return state;
      }
      const siteId = firstOpenSite(state, 'layered-rock');
      return siteId ? startCycle(state, siteId, null) : state;
    }

    case 'CHOOSE_ROCK': {
      const phase = state.phase;
      if (phase !== 'brush' && phase !== 'inspect' && phase !== 'drill-ready') {
        return state;
      }
      const siteId = firstOpenSite(state, event.rockId);
      if (!siteId) {
        return { ...state, notice: 'That rock has no fresh spots left.' };
      }
      return startCycle(state, siteId, state.cycle?.backupOf ?? null);
    }

    case 'BRUSH_COMPLETE': {
      const cycle = state.cycle;
      if (state.phase !== 'brush' || !cycle || !matches(state, event.attemptId, event.siteId)) {
        return state;
      }
      return {
        ...state,
        phase: 'inspect',
        sites: { ...state.sites, [cycle.siteId]: { ...state.sites[cycle.siteId]!, cleaned: true } },
        cycle: { ...cycle, brushComplete: true, stage: 'inspect' },
      };
    }

    case 'ACCEPT_SITE': {
      const cycle = state.cycle;
      if (state.phase !== 'inspect' || !cycle?.brushComplete || !matches(state, event.attemptId, event.siteId)) {
        return state;
      }
      const verdict = canSelectForDrill(state, cycle.siteId);
      if (!verdict.ok) {
        return { ...state, notice: verdict.reason };
      }
      const next: SamplingState = {
        ...state,
        phase: 'drill-ready',
        notice: null,
        cycle: { ...cycle, inspectionAccepted: true, stage: 'drill' },
      };
      return cycle.backupOf ? withFact(next, 'fact-16') : next;
    }

    case 'DRILL_STARTED':
      return state.phase === 'drill-ready' && canStartDrill(state) && matches(state, event.attemptId)
        ? { ...state, phase: 'drilling' }
        : state;

    case 'DRILL_RELEASED':
      return state.phase === 'drilling' && matches(state, event.attemptId)
        ? { ...state, phase: 'drill-ready' }
        : state;

    case 'DRILL_FINISHED': {
      const cycle = state.cycle;
      if (state.phase !== 'drilling' || !cycle || !matches(state, event.attemptId, event.siteId)) {
        return state;
      }
      const kind = outcomeForRock(cycle.rockId);
      const finished: SamplingState = {
        ...state,
        phase: kind === 'core' ? 'result-core' : 'result-atmosphere',
        sites: { ...state.sites, [cycle.siteId]: { ...state.sites[cycle.siteId]!, depleted: true } },
        cycle: { ...cycle, drillOutcome: kind, stage: 'transfer' },
      };
      return kind === 'atmosphere' ? withFact(finished, 'fact-14') : finished;
    }

    case 'SEAL_STORE_REQUESTED':
      return canSealSample(state) && matches(state, event.attemptId) ? { ...state, phase: 'transfer' } : state;

    case 'TRANSFER_FINISHED':
      return state.phase === 'transfer' && matches(state, event.attemptId)
        ? { ...state, phase: 'seal', cycle: { ...state.cycle!, stage: 'seal' } }
        : state;

    case 'SEAL_FINISHED':
      return state.phase === 'seal' && matches(state, event.attemptId)
        ? { ...state, phase: 'store', cycle: { ...state.cycle!, stage: 'store' } }
        : state;

    case 'STORE_FINISHED': {
      const cycle = state.cycle;
      if (!canStoreSample(state) || !cycle || !matches(state, event.attemptId)) {
        return state;
      }
      // The same attempt or site can never be stored twice.
      if (state.stored.some((sample) => sample.attemptId === cycle.attemptId || sample.siteId === cycle.siteId)) {
        return state;
      }
      const sample: StoredSample = {
        id: `tube-${state.stored.length + 1}`,
        attemptId: cycle.attemptId,
        rockId: cycle.rockId,
        siteId: cycle.siteId,
        kind: cycle.drillOutcome!,
        backupOf: cycle.backupOf,
      };
      const stored = [...state.stored, sample];
      const committed: SamplingState = withFact(
        { ...state, stored, cycle: { ...cycle, stage: 'done' } },
        'fact-15',
      );
      const complete =
        stored.length === state.config.targetTubeCount &&
        stored.filter((entry) => entry.kind === 'core').length >= state.config.minimumCoreCount;
      return { ...committed, phase: complete ? 'mission-complete' : 'cycle-complete' };
    }

    case 'NEXT_SITE': {
      if (state.phase !== 'cycle-complete') {
        return state;
      }
      const rockId = event.rockId ?? suggestedRock(state);
      if (!rockId) {
        return state;
      }
      const siteId = firstOpenSite(state, rockId);
      return siteId ? startCycle(state, siteId, null) : state;
    }

    case 'COLLECT_BACKUP': {
      if (state.phase !== 'cycle-complete') {
        return state;
      }
      const backup = backupSite(state);
      return backup ? startCycle(state, backup.siteId, backup.of) : state;
    }

    case 'FACT_SEEN':
      return withFact(state, event.factId);

    case 'ENDING_READ':
      return state.phase === 'mission-complete' && isMissionCompleteLedger(state)
        ? { ...state, phase: 'achievement' }
        : state;

    case 'ACHIEVEMENT_SEEN':
      return state.phase === 'achievement' ? { ...state, phase: 'choice' } : state;

    case 'NEXT_CHOSEN':
      return state.phase === 'choice' ? { ...state, phase: 'exiting' } : state;
  }
}

/** The ledger alone (used where the transient cycle phase no longer matters). */
function isMissionCompleteLedger(state: SamplingState): boolean {
  return (
    state.stored.length === state.config.targetTubeCount &&
    state.stored.filter((sample) => sample.kind === 'core').length >= state.config.minimumCoreCount
  );
}
