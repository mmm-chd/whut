import { describe, expect, it } from 'vitest';
import type { Cell } from './grid';
import { defaultMap, knownGridWith } from './map';
import { findGridPath } from './pathfinding';
import {
  canAcceptArrived,
  canCompleteP07,
  canSelectDestination,
  canSendCommand,
  createP07State,
  reduceP07,
  type P07Context,
  type P07Event,
  type P07State,
  type RoutePlan,
  type CommandSnapshot,
} from './state';

const RUN = 1;
const map = defaultMap;
type Body<T> = T extends unknown ? Omit<T, 'runId'> : never;

function send(state: P07State, ...events: Body<P07Event>[]): P07State {
  return events.reduce((s, e) => reduceP07(s, { runId: RUN, ...e } as P07Event, map), state);
}

function ctx(overrides: Partial<P07Context> = {}): P07Context {
  return { runId: RUN, sceneActive: true, paused: false, visible: true, status: 'waiting', ...overrides };
}

function atChoosing(): P07State {
  return send(
    createP07State(RUN, map.start),
    { type: 'SCENE_READY' },
    { type: 'OPENING_STOPPED', cell: map.start },
    { type: 'INTRO_RESOLVED' },
    { type: 'MAP_READY' },
  );
}

function routeFor(goal: Cell, commandId = 1, revision = 0, from: Cell = map.start, grid = map.known): RoutePlan {
  const found = findGridPath(grid, from, goal);
  if (found.kind !== 'found') {
    throw new Error('no route');
  }
  return { commandId, revision, cells: found.cells };
}

function sent(goal: Cell): P07State {
  let state = send(atChoosing(), { type: 'DESTINATION_SELECTED', cell: goal });
  const command: CommandSnapshot = { runId: RUN, commandId: 1, start: map.start, goal };
  state = send(state, { type: 'COMMAND_ACCEPTED', command, route: routeFor(goal) });
  return state;
}

/** Walk the planned route one waypoint at a time. */
function walk(state: P07State, to?: number): P07State {
  const route = state.route!;
  let next = state;
  const last = to ?? route.cells.length - 1;
  for (let i = next.waypointIndex + 1; i <= last; i += 1) {
    next = send(next, {
      type: 'WAYPOINT_REACHED',
      commandId: route.commandId,
      revision: route.revision,
      index: i,
    });
  }
  return next;
}

const east = map.presets[1].cell;
const north = map.presets[0].cell;

describe('opening', () => {
  it('goes loading to choosing only through its gates', () => {
    let state = createP07State(RUN, map.start);
    state = send(state, { type: 'INTRO_RESOLVED' });
    expect(state.phase).toBe('loading');
    state = send(createP07State(RUN, map.start), { type: 'OPENING_STOPPED', cell: map.start });
    expect(state.phase).toBe('loading');
  });

  it('starts moving only from the intro-moving phase', () => {
    const start = send(createP07State(RUN, map.start), { type: 'SCENE_READY' });
    expect(start.phase).toBe('intro-moving');
    const stopped = send(start, { type: 'OPENING_STOPPED', cell: map.start });
    expect(stopped.phase).toBe('intro-speaking');
    expect(send(stopped, { type: 'MAP_READY' }).phase).toBe('intro-speaking');
    expect(atChoosing().phase).toBe('choosing');
  });
});

describe('destination and command', () => {
  it('accepts safe ground and rejects blockers, the rover cell and the edge', () => {
    let state = send(atChoosing(), { type: 'DESTINATION_SELECTED', cell: east });
    expect(state.selectedCell).toEqual(east);
    state = send(state, { type: 'DESTINATION_SELECTED', cell: { col: 7, row: 8 } });
    expect(state.selectedCell).toEqual(east);
    expect(state.notice).toMatch(/clear patch/i);
    state = send(state, { type: 'DESTINATION_SELECTED', cell: map.start });
    expect(state.selectedCell).toEqual(east);
    state = send(state, { type: 'DESTINATION_SELECTED', cell: { col: 0, row: 0 } });
    expect(state.selectedCell).toEqual(east);
  });

  it('copies the command and ignores a second one', () => {
    const state = sent(east);
    expect(state.phase).toBe('signal');
    expect(state.command?.goal).toEqual(east);
    const again = send(state, {
      type: 'COMMAND_ACCEPTED',
      command: { runId: RUN, commandId: 2, start: map.start, goal: north },
      route: routeFor(north, 2),
    });
    expect(again).toBe(state);
  });

  it('rejects a route that does not match the chosen goal or is not valid', () => {
    const chosen = send(atChoosing(), { type: 'DESTINATION_SELECTED', cell: east });
    const command: CommandSnapshot = { runId: RUN, commandId: 1, start: map.start, goal: east };
    const wrongGoal = send(chosen, { type: 'COMMAND_ACCEPTED', command, route: routeFor(north) });
    expect(wrongGoal.phase).toBe('choosing');
    const broken = send(chosen, {
      type: 'COMMAND_ACCEPTED',
      command,
      route: { commandId: 1, revision: 0, cells: [map.start, east] },
    });
    expect(broken.phase).toBe('choosing');
  });

  it('locks the destination during the signal', () => {
    const state = send(sent(east), { type: 'DESTINATION_SELECTED', cell: north });
    expect(state.selectedCell).toEqual(east);
  });

  it('only a matching signal starts the route', () => {
    const state = sent(east);
    expect(send(state, { type: 'SIGNAL_FINISHED', commandId: 99 }).phase).toBe('signal');
    const received = send(state, { type: 'SIGNAL_FINISHED', commandId: 1 });
    expect(received.phase).toBe('navigating');
    expect(received.signalReceived).toBe(true);
  });
});

describe('guards', () => {
  it('select and send need a live waiting scene in the choosing phase', () => {
    const chosen = send(atChoosing(), { type: 'DESTINATION_SELECTED', cell: east });
    expect(canSelectDestination(chosen, ctx())).toBe(true);
    expect(canSendCommand(chosen, ctx(), map)).toBe(true);
    expect(canSendCommand(chosen, ctx({ paused: true }), map)).toBe(false);
    expect(canSendCommand(chosen, ctx({ visible: false }), map)).toBe(false);
    expect(canSendCommand(chosen, ctx({ status: 'playing' }), map)).toBe(false);
    expect(canSendCommand(chosen, ctx({ runId: 2 }), map)).toBe(false);
    expect(canSendCommand(atChoosing(), ctx(), map)).toBe(false);
    expect(canSendCommand(sent(east), ctx(), map)).toBe(false);
  });
});

describe('navigation', () => {
  it('ignores a waypoint that skips ahead, repeats, or carries an old token', () => {
    let state = send(sent(east), { type: 'SIGNAL_FINISHED', commandId: 1 });
    const route = state.route!;
    const skip = send(state, { type: 'WAYPOINT_REACHED', commandId: 1, revision: 0, index: 3 });
    expect(skip.waypointIndex).toBe(0);
    state = send(state, { type: 'WAYPOINT_REACHED', commandId: 1, revision: 0, index: 1 });
    expect(state.currentCell).toEqual(route.cells[1]);
    const repeat = send(state, { type: 'WAYPOINT_REACHED', commandId: 1, revision: 0, index: 1 });
    expect(repeat.waypointIndex).toBe(1);
    const stale = send(state, { type: 'WAYPOINT_REACHED', commandId: 1, revision: 7, index: 2 });
    expect(stale.waypointIndex).toBe(1);
  });

  it('only a physical last waypoint on the goal can reach the goal', () => {
    let state = send(sent(east), { type: 'SIGNAL_FINISHED', commandId: 1 });
    const early = send(state, { type: 'GOAL_REACHED', commandId: 1, revision: 0 });
    expect(early.phase).toBe('navigating');
    state = walk(state);
    state = send(state, { type: 'GOAL_REACHED', commandId: 1, revision: 0 });
    expect(state.phase).toBe('arrived');
    expect(state.goalReached).toBe(true);
    expect(state.currentCell).toEqual(east);
  });

  it('detects the patch once, assesses, replans to the same goal and arrives', () => {
    let state = send(sent(north), { type: 'SIGNAL_FINISHED', commandId: 1 });
    const route = state.route!;
    const stopIndex = route.cells.findIndex((c) => c.col === 16 && c.row === 15);
    expect(stopIndex).toBeGreaterThan(0);
    state = walk(state, stopIndex);
    state = send(state, { type: 'OBSTACLE_DETECTED', commandId: 1, revision: 0, hazardId: 'rough-patch' });
    expect(state.phase).toBe('assessing');
    expect(state.currentCell).toEqual({ col: 16, row: 15 });

    // A second sighting of the same patch changes nothing.
    expect(
      send(state, { type: 'OBSTACLE_DETECTED', commandId: 1, revision: 0, hazardId: 'rough-patch' }),
    ).toBe(state);

    state = send(state, { type: 'ASSESSMENT_FINISHED', commandId: 1, revision: 0 });
    expect(state.phase).toBe('replanning');
    const grid = knownGridWith(map, state.discoveredHazards);
    const replacement = routeFor(north, 1, 1, state.currentCell, grid);
    state = send(state, { type: 'ROUTE_REPLACED', commandId: 1, route: replacement });
    expect(state.phase).toBe('navigating');
    expect(state.route?.revision).toBe(1);
    expect(state.command?.goal).toEqual(north);

    // The old revision can no longer move Percy.
    expect(
      send(state, { type: 'WAYPOINT_REACHED', commandId: 1, revision: 0, index: 1 }).waypointIndex,
    ).toBe(0);

    state = walk(state);
    state = send(state, { type: 'GOAL_REACHED', commandId: 1, revision: 1 });
    expect(state.phase).toBe('arrived');
  });

  it('refuses a replacement route that crosses the discovered patch', () => {
    let state = send(sent(north), { type: 'SIGNAL_FINISHED', commandId: 1 });
    const stopIndex = state.route!.cells.findIndex((c) => c.col === 16 && c.row === 15);
    state = walk(state, stopIndex);
    state = send(
      state,
      { type: 'OBSTACLE_DETECTED', commandId: 1, revision: 0, hazardId: 'rough-patch' },
      { type: 'ASSESSMENT_FINISHED', commandId: 1, revision: 0 },
    );
    const straight = routeFor(north, 1, 1, state.currentCell, map.known);
    const after = send(state, { type: 'ROUTE_REPLACED', commandId: 1, route: straight });
    expect(after.phase).toBe('replanning');
  });
});

describe('recovery', () => {
  it('stops on a route error and lets the reader choose again without moving the goal', () => {
    let state = send(sent(east), { type: 'SIGNAL_FINISHED', commandId: 1 });
    state = send(state, { type: 'ROUTE_ERROR', commandId: 1, reason: 'unreachable' });
    expect(state.phase).toBe('route-error');
    state = send(state, { type: 'RECOVERY_REQUESTED' });
    expect(state.phase).toBe('choosing');
    expect(state.selectedCell).toBeNull();
    expect(state.command).toBeNull();
    expect(state.currentCell).toEqual(map.start);
    // A new command gets a new id.
    state = send(state, { type: 'DESTINATION_SELECTED', cell: north });
    const command: CommandSnapshot = { runId: RUN, commandId: 2, start: map.start, goal: north };
    state = send(state, { type: 'COMMAND_ACCEPTED', command, route: routeFor(north, 2) });
    expect(state.phase).toBe('signal');
  });
});

describe('arrival and completion', () => {
  function arrived(): P07State {
    let state = send(sent(east), { type: 'SIGNAL_FINISHED', commandId: 1 });
    state = walk(state);
    return send(state, { type: 'GOAL_REACHED', commandId: 1, revision: 0 });
  }

  it('Arrived! needs both facts read', () => {
    let state = arrived();
    expect(canAcceptArrived(state, ctx())).toBe(false);
    state = send(state, { type: 'FACT_RESOLVED', factId: 'signal-latency' });
    expect(canAcceptArrived(state, ctx())).toBe(false);
    state = send(state, { type: 'FACT_RESOLVED', factId: 'autonav' });
    expect(canAcceptArrived(state, ctx())).toBe(true);
    expect(canAcceptArrived(state, ctx({ paused: true }))).toBe(false);
  });

  it('accepting does not complete; completion also needs the fade, once', () => {
    let state = arrived();
    state = send(state, { type: 'FACT_RESOLVED', factId: 'signal-latency' }, { type: 'FACT_RESOLVED', factId: 'autonav' });
    state = send(state, { type: 'ARRIVED_ACCEPTED', commandId: 1 });
    expect(state.phase).toBe('exit');
    expect(state.arrivalAccepted).toBe(true);
    expect(canCompleteP07(state, ctx())).toBe(false);
    state = send(state, { type: 'EXIT_FINISHED', commandId: 1 });
    expect(canCompleteP07(state, ctx())).toBe(true);
    expect(canCompleteP07(state, ctx({ paused: true }))).toBe(false);
    state = send(state, { type: 'SCENE_COMPLETED', commandId: 1 });
    expect(state.phase).toBe('done');
    expect(canCompleteP07(state, ctx())).toBe(false);
  });

  it('cannot accept arrival twice or without a goal', () => {
    const early = send(sent(east), { type: 'ARRIVED_ACCEPTED', commandId: 1 });
    expect(early.phase).toBe('signal');
    let state = arrived();
    state = send(state, { type: 'FACT_RESOLVED', factId: 'signal-latency' }, { type: 'FACT_RESOLVED', factId: 'autonav' });
    state = send(state, { type: 'ARRIVED_ACCEPTED', commandId: 1 });
    expect(send(state, { type: 'ARRIVED_ACCEPTED', commandId: 1 })).toBe(state);
  });

  it('facts before the signal do not count', () => {
    const state = send(atChoosing(), { type: 'FACT_RESOLVED', factId: 'autonav' });
    expect(state.resolvedFacts).toEqual([]);
  });

  it('an event from another run changes nothing', () => {
    const state = atChoosing();
    const other = reduceP07(state, { runId: 99, type: 'DESTINATION_SELECTED', cell: east }, map);
    expect(other).toBe(state);
  });
});
