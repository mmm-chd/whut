import type { SceneStatus } from '../../engine/types';
import { sameCell, type Cell } from './grid';
import { isSupportedDestination, knownGridWith, type NavigationMap } from './map';
import { validateRoute } from './pathfinding';

/**
 * The Runner's local state machine.
 *
 * The engine only ever sees `idle | playing | waiting | completed`. These
 * phases stay inside the scene. Every event carries the run, and command events
 * also carry the command (and route revision), so a late callback from an old
 * command or an old route can never change the current one. There is no event
 * that adds distance, teleports, or completes the scene on request.
 */
export type P07Phase =
  | 'loading'
  | 'intro-moving'
  | 'intro-speaking'
  | 'map-reveal'
  | 'choosing'
  | 'signal'
  | 'navigating'
  | 'assessing'
  | 'replanning'
  | 'route-error'
  | 'arrived'
  | 'exit'
  | 'done';

export type P07FactId = 'signal-latency' | 'autonav';
export const P07_FACT_IDS: readonly P07FactId[] = ['signal-latency', 'autonav'];

export interface CommandSnapshot {
  readonly runId: number;
  readonly commandId: number;
  readonly start: Cell;
  readonly goal: Cell;
}

export interface RoutePlan {
  readonly commandId: number;
  readonly revision: number;
  /** Includes the start and the goal. */
  readonly cells: readonly Cell[];
}

export interface P07State {
  readonly runId: number;
  readonly phase: P07Phase;
  readonly currentCell: Cell;
  readonly selectedCell: Cell | null;
  readonly command: CommandSnapshot | null;
  readonly commandCounter: number;
  readonly route: RoutePlan | null;
  readonly waypointIndex: number;
  readonly discoveredHazards: readonly string[];
  /** Replans used by the current command; bounded to one. */
  readonly replans: number;
  readonly introResolved: boolean;
  readonly signalReceived: boolean;
  readonly goalReached: boolean;
  readonly arrivalAccepted: boolean;
  readonly resolvedFacts: readonly P07FactId[];
  readonly exitFadeFinished: boolean;
  /** Why the last request was declined, in words for the reader. */
  readonly notice: string | null;
}

export interface P07Context {
  readonly runId: number;
  readonly sceneActive: boolean;
  readonly paused: boolean;
  readonly visible: boolean;
  readonly status: SceneStatus;
}

type CommandToken = { readonly commandId: number };
type RouteToken = CommandToken & { readonly revision: number };

export type P07Event = { readonly runId: number } & (
  | { readonly type: 'OPENING_STOPPED'; readonly cell: Cell }
  | { readonly type: 'SCENE_READY' | 'INTRO_RESOLVED' | 'MAP_READY' }
  | { readonly type: 'DESTINATION_SELECTED'; readonly cell: Cell }
  | { readonly type: 'COMMAND_ACCEPTED'; readonly command: CommandSnapshot; readonly route: RoutePlan }
  | ({ readonly type: 'SIGNAL_FINISHED' } & CommandToken)
  | ({ readonly type: 'WAYPOINT_REACHED'; readonly index: number } & RouteToken)
  | ({ readonly type: 'OBSTACLE_DETECTED'; readonly hazardId: string } & RouteToken)
  | ({ readonly type: 'ASSESSMENT_FINISHED' } & RouteToken)
  | ({ readonly type: 'ROUTE_REPLACED'; readonly route: RoutePlan } & CommandToken)
  | ({ readonly type: 'ROUTE_ERROR'; readonly reason: 'invalid' | 'unreachable' | 'budget-exceeded' } & CommandToken)
  | ({ readonly type: 'GOAL_REACHED' } & RouteToken)
  | { readonly type: 'FACT_RESOLVED'; readonly factId: P07FactId }
  | { readonly type: 'RECOVERY_REQUESTED' }
  | ({ readonly type: 'ARRIVED_ACCEPTED' | 'EXIT_FINISHED' | 'SCENE_COMPLETED' } & CommandToken)
);

export function createP07State(runId: number, start: Cell): P07State {
  return {
    runId,
    phase: 'loading',
    currentCell: start,
    selectedCell: null,
    command: null,
    commandCounter: 0,
    route: null,
    waypointIndex: 0,
    discoveredHazards: [],
    replans: 0,
    introResolved: false,
    signalReceived: false,
    goalReached: false,
    arrivalAccepted: false,
    resolvedFacts: [],
    exitFadeFinished: false,
    notice: null,
  };
}

const MAX_REPLANS = 1;

function matchesCommand(state: P07State, token: CommandToken): boolean {
  return state.command !== null && state.command.commandId === token.commandId;
}

function matchesRoute(state: P07State, token: RouteToken): boolean {
  return (
    matchesCommand(state, token) && state.route !== null && state.route.revision === token.revision
  );
}

export function reduceP07(state: P07State, event: P07Event, map: NavigationMap): P07State {
  if (event.runId !== state.runId) {
    return state;
  }

  switch (event.type) {
    case 'SCENE_READY':
      return state.phase === 'loading' ? { ...state, phase: 'intro-moving' } : state;

    case 'OPENING_STOPPED':
      if (state.phase !== 'intro-moving' || !sameCell(event.cell, map.start)) {
        return state;
      }
      return { ...state, phase: 'intro-speaking', currentCell: event.cell };

    case 'INTRO_RESOLVED':
      return state.phase === 'intro-speaking'
        ? { ...state, phase: 'map-reveal', introResolved: true }
        : state;

    case 'MAP_READY':
      return state.phase === 'map-reveal' && state.introResolved ? { ...state, phase: 'choosing' } : state;

    case 'DESTINATION_SELECTED': {
      if (state.phase !== 'choosing') {
        return state;
      }
      if (sameCell(event.cell, state.currentCell)) {
        return { ...state, notice: 'Percy is already here. Pick another spot.' };
      }
      if (!isSupportedDestination(map, event.cell, state.currentCell)) {
        return { ...state, notice: 'Choose a clear patch of ground.' };
      }
      return { ...state, selectedCell: event.cell, notice: null };
    }

    case 'COMMAND_ACCEPTED': {
      const { command, route } = event;
      if (
        state.phase !== 'choosing' ||
        state.selectedCell === null ||
        command.runId !== state.runId ||
        command.commandId !== state.commandCounter + 1 ||
        !sameCell(command.start, state.currentCell) ||
        !sameCell(command.goal, state.selectedCell) ||
        route.commandId !== command.commandId ||
        route.revision !== 0 ||
        !validateRoute(map.known, route.cells, command.start, command.goal)
      ) {
        return state;
      }
      return {
        ...state,
        phase: 'signal',
        command,
        commandCounter: command.commandId,
        route,
        waypointIndex: 0,
        replans: 0,
        signalReceived: false,
        goalReached: false,
        notice: null,
      };
    }

    case 'SIGNAL_FINISHED':
      return state.phase === 'signal' && matchesCommand(state, event)
        ? { ...state, phase: 'navigating', signalReceived: true }
        : state;

    case 'WAYPOINT_REACHED': {
      if (state.phase !== 'navigating' || !matchesRoute(state, event) || !state.route) {
        return state;
      }
      if (event.index !== state.waypointIndex + 1 || event.index >= state.route.cells.length) {
        return state;
      }
      return { ...state, waypointIndex: event.index, currentCell: state.route.cells[event.index] };
    }

    case 'OBSTACLE_DETECTED': {
      if (state.phase !== 'navigating' || !matchesRoute(state, event)) {
        return state;
      }
      const known = map.hazards.some((hazard) => hazard.id === event.hazardId);
      if (!known || state.discoveredHazards.includes(event.hazardId) || state.replans >= MAX_REPLANS) {
        return state;
      }
      return {
        ...state,
        phase: 'assessing',
        discoveredHazards: [...state.discoveredHazards, event.hazardId],
      };
    }

    case 'ASSESSMENT_FINISHED':
      return state.phase === 'assessing' && matchesRoute(state, event)
        ? { ...state, phase: 'replanning' }
        : state;

    case 'ROUTE_REPLACED': {
      const { command } = state;
      if (state.phase !== 'replanning' || !command || !matchesCommand(state, event) || !state.route) {
        return state;
      }
      const grid = knownGridWith(map, state.discoveredHazards);
      if (
        event.route.commandId !== command.commandId ||
        event.route.revision !== state.route.revision + 1 ||
        !validateRoute(grid, event.route.cells, state.currentCell, command.goal)
      ) {
        return state;
      }
      return {
        ...state,
        phase: 'navigating',
        route: event.route,
        waypointIndex: 0,
        replans: state.replans + 1,
      };
    }

    case 'ROUTE_ERROR':
      if (
        !matchesCommand(state, event) ||
        (state.phase !== 'signal' && state.phase !== 'navigating' && state.phase !== 'replanning')
      ) {
        return state;
      }
      return { ...state, phase: 'route-error', notice: 'Percy needs another safe destination.' };

    case 'GOAL_REACHED': {
      const { route, command } = state;
      if (state.phase !== 'navigating' || !matchesRoute(state, event) || !route || !command) {
        return state;
      }
      const last = route.cells.length - 1;
      if (state.waypointIndex !== last || !sameCell(route.cells[last], command.goal)) {
        return state;
      }
      return { ...state, phase: 'arrived', goalReached: true, currentCell: command.goal };
    }

    case 'FACT_RESOLVED':
      if (
        state.resolvedFacts.includes(event.factId) ||
        state.phase === 'loading' ||
        state.phase === 'intro-moving' ||
        state.phase === 'intro-speaking' ||
        state.phase === 'map-reveal' ||
        state.phase === 'choosing'
      ) {
        return state;
      }
      return { ...state, resolvedFacts: [...state.resolvedFacts, event.factId] };

    case 'RECOVERY_REQUESTED':
      if (state.phase !== 'route-error') {
        return state;
      }
      return {
        ...state,
        phase: 'choosing',
        selectedCell: null,
        command: null,
        route: null,
        waypointIndex: 0,
        replans: 0,
        signalReceived: false,
        goalReached: false,
        notice: null,
      };

    case 'ARRIVED_ACCEPTED': {
      if (
        state.phase !== 'arrived' ||
        !matchesCommand(state, event) ||
        !state.introResolved ||
        !state.signalReceived ||
        !state.goalReached ||
        !P07_FACT_IDS.every((id) => state.resolvedFacts.includes(id)) ||
        state.arrivalAccepted
      ) {
        return state;
      }
      return { ...state, phase: 'exit', arrivalAccepted: true };
    }

    case 'EXIT_FINISHED':
      return state.phase === 'exit' && state.arrivalAccepted && matchesCommand(state, event)
        ? { ...state, exitFadeFinished: true }
        : state;

    case 'SCENE_COMPLETED':
      return state.phase === 'exit' && state.exitFadeFinished && matchesCommand(state, event)
        ? { ...state, phase: 'done' }
        : state;
  }
}

// ----- guards ---------------------------------------------------------------

function live(state: P07State, ctx: P07Context): boolean {
  return state.runId === ctx.runId && ctx.sceneActive && !ctx.paused && ctx.visible;
}

export function canSelectDestination(state: P07State, ctx: P07Context): boolean {
  return live(state, ctx) && ctx.status === 'waiting' && state.phase === 'choosing';
}

export function canSendCommand(state: P07State, ctx: P07Context, map: NavigationMap): boolean {
  return (
    canSelectDestination(state, ctx) &&
    state.command === null &&
    state.selectedCell !== null &&
    !sameCell(state.selectedCell, state.currentCell) &&
    isSupportedDestination(map, state.selectedCell, state.currentCell)
  );
}

export function canAcceptArrived(state: P07State, ctx: P07Context): boolean {
  return (
    live(state, ctx) &&
    ctx.status === 'waiting' &&
    state.phase === 'arrived' &&
    state.introResolved &&
    state.signalReceived &&
    state.goalReached &&
    P07_FACT_IDS.every((id) => state.resolvedFacts.includes(id)) &&
    !state.arrivalAccepted
  );
}

/** Checked directly, not through the input guard whose phase only allows `arrived`. */
export function canCompleteP07(state: P07State, ctx: P07Context): boolean {
  return (
    live(state, ctx) &&
    ctx.status === 'waiting' &&
    state.phase === 'exit' &&
    state.introResolved &&
    state.signalReceived &&
    state.goalReached &&
    P07_FACT_IDS.every((id) => state.resolvedFacts.includes(id)) &&
    state.arrivalAccepted &&
    state.exitFadeFinished
  );
}

/** Whether the explanation for a disabled Arrived! button is "facts still reading". */
export function arrivalWaitingOnFacts(state: P07State): boolean {
  return (
    state.phase === 'arrived' && !P07_FACT_IDS.every((id) => state.resolvedFacts.includes(id))
  );
}

export const P07_INTERACTION_IDS = [
  'p07-command-sent',
  'p07-signal-received',
  'p07-fact-signal-read',
  'p07-fact-autonav-read',
  'p07-goal-reached',
  'p07-arrived-accepted',
] as const;
