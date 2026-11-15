import { describe, expect, it } from 'vitest';
import type { Cell } from './grid';
import { defaultMap } from './map';
import { createRunnerNodes } from './nodes';
import { findGridPath } from './pathfinding';
import { SIGNAL_MS, createRunnerDriver, type DriverCallbacks, type FrameEnv } from './timeline';
import { cellCenter } from './mapInput';

/** A manual clock and frame queue: the test decides when time passes. */
function fakeEnv() {
  let time = 0;
  let next = 1;
  const queue = new Map<number, () => void>();
  const env: FrameEnv = {
    now: () => time,
    request: (callback) => {
      const id = next++;
      queue.set(id, callback);
      return id;
    },
    cancel: (id) => {
      queue.delete(id);
    },
  };
  return {
    env,
    /** Run frames of 16 ms until `ms` of time has passed or no frame is queued. */
    advance(ms: number) {
      const end = time + ms;
      while (time < end && queue.size > 0) {
        time += 16;
        const [id, callback] = [...queue.entries()][0];
        queue.delete(id);
        callback();
      }
    },
    jump(ms: number) {
      time += ms;
    },
    pending: () => queue.size,
  };
}

function setup(reducedMotion = false) {
  const log: string[] = [];
  const nodes = createRunnerNodes(defaultMap.start, reducedMotion);
  const callbacks: DriverCallbacks = {
    onOpeningArrived: () => log.push('opening-arrived'),
    onSignalFinished: (id) => log.push(`signal:${id}`),
    onWaypoint: (id, rev, index) => log.push(`wp:${id}.${rev}.${index}`),
    onBlocked: (id, rev, cell) => log.push(`blocked:${id}.${rev}@${cell.col},${cell.row}`),
    onGoal: (id, rev) => log.push(`goal:${id}.${rev}`),
    onAssessmentFinished: (id, rev) => log.push(`assessed:${id}.${rev}`),
    onExitFinished: (id) => log.push(`exit:${id}`),
  };
  const clock = fakeEnv();
  const driver = createRunnerDriver({ nodes, map: defaultMap, callbacks, reducedMotion, env: clock.env });
  return { log, nodes, clock, driver };
}

function route(goal: Cell, from: Cell = defaultMap.start, grid = defaultMap.known): Cell[] {
  const result = findGridPath(grid, from, goal);
  if (result.kind !== 'found') {
    throw new Error('no route');
  }
  return [...result.cells];
}

describe('signal', () => {
  it('finishes after exactly its active time, not before', () => {
    const { log, clock, driver } = setup();
    driver.beginSignal(1);
    clock.advance(SIGNAL_MS - 200);
    expect(log).toEqual([]);
    clock.advance(600);
    expect(log).toEqual(['signal:1']);
  });

  it('ten seconds paused adds nothing and a resume does not jump', () => {
    const { log, clock, driver } = setup();
    driver.beginSignal(1);
    clock.advance(800);
    driver.setPaused(true);
    clock.jump(10_000);
    clock.advance(500);
    expect(log).toEqual([]);
    expect(clock.pending()).toBe(0);
    driver.setPaused(false);
    clock.advance(1000);
    expect(log).toEqual([]);
    clock.advance(1200);
    expect(log).toEqual(['signal:1']);
  });
});

describe('route', () => {
  it('walks to the goal in order and reports it once, at the goal centre', () => {
    const { log, clock, driver, nodes } = setup();
    const east = defaultMap.presets[1].cell;
    const cells = route(east);
    driver.beginRoute(1, 0, cells);
    clock.advance(60_000);
    const waypoints = log.filter((entry) => entry.startsWith('wp:'));
    expect(waypoints).toHaveLength(cells.length - 1);
    expect(waypoints[0]).toBe('wp:1.0.1');
    expect(log.filter((entry) => entry.startsWith('goal:'))).toEqual(['goal:1.0']);
    const centre = cellCenter(east);
    expect(nodes.percy.x).toBeCloseTo(centre.x, 5);
    expect(nodes.percy.y).toBeCloseTo(centre.y, 5);
    expect(driver.isRunning()).toBe(false);
  });

  it('stops at the safe cell before the unseen patch and reports it', () => {
    const { log, clock, driver, nodes } = setup();
    const north = defaultMap.presets[0].cell;
    driver.beginRoute(1, 0, route(north));
    clock.advance(60_000);
    expect(log.some((entry) => entry.startsWith('blocked:1.0@16,14'))).toBe(true);
    expect(log.some((entry) => entry.startsWith('goal:'))).toBe(false);
    const stop = cellCenter({ col: 16, row: 15 });
    expect(nodes.percy.x).toBeCloseTo(stop.x, 5);
    expect(nodes.percy.y).toBeCloseTo(stop.y, 5);
    expect(driver.isRunning()).toBe(false);
  });

  it('keeps going to the same goal on a replacement route', () => {
    const { log, clock, driver } = setup();
    const north = defaultMap.presets[0].cell;
    driver.beginRoute(1, 0, route(north));
    clock.advance(60_000);
    driver.beginAssessment(1, 0);
    clock.advance(1000);
    expect(log).toContain('assessed:1.0');
    const stop: Cell = { col: 16, row: 15 };
    driver.beginRoute(1, 1, route(north, stop, defaultMap.safety));
    clock.advance(60_000);
    expect(log.filter((entry) => entry.startsWith('goal:'))).toEqual(['goal:1.1']);
  });

  it('pausing mid-route holds Percy still', () => {
    const { clock, driver, nodes } = setup();
    driver.beginRoute(1, 0, route(defaultMap.presets[1].cell));
    clock.advance(600);
    driver.setPaused(true);
    const at = { x: nodes.percy.x, y: nodes.percy.y };
    clock.jump(5000);
    clock.advance(500);
    expect({ x: nodes.percy.x, y: nodes.percy.y }).toEqual(at);
  });

  it('reduced motion steps one cell at a time and still checks the ground', () => {
    const { log, clock, driver } = setup(true);
    driver.beginRoute(1, 0, route(defaultMap.presets[0].cell));
    clock.advance(60_000);
    expect(log.filter((entry) => entry.startsWith('wp:')).length).toBeGreaterThan(3);
    expect(log.some((entry) => entry.startsWith('blocked:'))).toBe(true);
    expect(log.some((entry) => entry.startsWith('goal:'))).toBe(false);
  });
});

describe('opening and exit', () => {
  it('drives the opening path and reports arrival once', () => {
    const { log, clock, driver, nodes } = setup();
    driver.startOpening([{ col: 16, row: 24 }, { col: 16, row: 20 }], 3000);
    expect(nodes.percy.opacity).toBe(1);
    clock.advance(10_000);
    expect(log).toEqual(['opening-arrived']);
    expect(nodes.percy.y).toBeCloseTo(cellCenter({ col: 16, row: 20 }).y, 5);
  });

  it('finishes the exit fade after its time', () => {
    const { log, clock, driver } = setup();
    driver.beginExit(3);
    clock.advance(200);
    expect(log).toEqual([]);
    clock.advance(600);
    expect(log).toEqual(['exit:3']);
  });
});

describe('dispose', () => {
  it('cancels the frame and ignores later calls', () => {
    const { log, clock, driver } = setup();
    driver.beginSignal(1);
    driver.dispose();
    driver.dispose();
    driver.beginSignal(2);
    clock.advance(5000);
    expect(log).toEqual([]);
    expect(clock.pending()).toBe(0);
  });
});
