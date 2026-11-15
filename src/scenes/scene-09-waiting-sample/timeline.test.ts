import { describe, expect, it } from 'vitest';
import type { FrameEnv } from '../shared/frameEnv';
import { percyExitedRight } from './exitGeometry';
import { DEPARTURE_UNITS_PER_SECOND, TRAVEL_UNITS_PER_SECOND, layoutP08 } from './layout';
import { createP08Nodes } from './nodes';
import {
  CLOSEUP_MS,
  FADE_MS,
  REACTION_PAUSE_MS,
  STOP_MS,
  TRACKS_HOLD_MS,
  createP08Driver,
  type DriverCallbacks,
} from './timeline';
import { TRACK_COUNT } from './tracks';

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

function setup(reduced = false) {
  const layout = layoutP08(1280, 720, 30_000)!;
  const nodes = createP08Nodes(layout, reduced);
  const log: string[] = [];
  const callbacks: DriverCallbacks = {
    onEntryFinished: () => log.push('entry'),
    onHopeTransitionFinished: () => log.push('transition'),
    onPercyStopped: () => log.push('stopped'),
    onDingSettled: () => log.push('ding'),
    onCloseupFinished: () => log.push('closeup'),
    onReactionPauseFinished: () => log.push('pause'),
    onPercyExited: () => log.push('exited'),
    onTracksSettled: () => log.push('tracks'),
    onFadeFinished: () => log.push('fade'),
  };
  const clock = fakeEnv();
  const driver = createP08Driver({ nodes, layout, callbacks, reducedMotion: reduced, env: clock.env });
  return { layout, nodes, log, clock, driver };
}

describe('entry and transition', () => {
  it('reveals the samples, then swaps to the side view', () => {
    const { nodes, log, clock, driver } = setup();
    driver.beginEntry();
    clock.advance(2000);
    expect(log).toEqual(['entry']);
    expect(nodes.sampleReveal.opacity).toBe(1);
    driver.beginHopeTransition();
    clock.advance(2000);
    expect(log).toEqual(['entry', 'transition']);
    expect(nodes.sampleReveal.opacity).toBe(0);
    expect(nodes.world.opacity).toBe(1);
  });
});

describe('travel and stop', () => {
  it('rolls at travel speed with the camera following, then eases to a stop', () => {
    const { nodes, layout, log, clock, driver } = setup();
    driver.beginHopeTransition();
    clock.advance(1000);
    driver.beginTravel();
    clock.advance(2000);
    const rolled = nodes.percy.body.x;
    expect(rolled).toBeGreaterThan(TRAVEL_UNITS_PER_SECOND * 1.7);
    expect(rolled).toBeLessThan(TRAVEL_UNITS_PER_SECOND * 2.3);
    expect(nodes.camera.x).toBeCloseTo(layout.followX(rolled), 5);
    driver.beginStop();
    clock.advance(STOP_MS + 200);
    expect(log.filter((entry) => entry === 'stopped')).toHaveLength(1);
    const stoppedAt = nodes.percy.body.x;
    expect(stoppedAt).toBeGreaterThan(rolled);
    // It stays put afterwards.
    clock.advance(1000);
    expect(nodes.percy.body.x).toBe(stoppedAt);
  });

  it('never rolls past the finite landscape budget', () => {
    const layout = layoutP08(1280, 720, 1000)!;
    const nodes = createP08Nodes(layout);
    const clock = fakeEnv();
    const driver = createP08Driver({
      nodes,
      layout,
      callbacks: {
        onEntryFinished: () => {},
        onHopeTransitionFinished: () => {},
        onPercyStopped: () => {},
        onDingSettled: () => {},
        onCloseupFinished: () => {},
        onReactionPauseFinished: () => {},
        onPercyExited: () => {},
        onTracksSettled: () => {},
        onFadeFinished: () => {},
      },
      reducedMotion: false,
      env: clock.env,
    });
    driver.beginTravel();
    clock.advance(120_000);
    expect(nodes.percy.body.x).toBeLessThanOrEqual(layout.maxCameraX - 400 + 1e-6);
  });

  it('in reduced motion Percy stays and the stop is immediate', () => {
    const { nodes, log, clock, driver } = setup(true);
    driver.beginTravel();
    clock.advance(3000);
    expect(nodes.percy.body.x).toBe(0);
    driver.beginStop();
    expect(log).toEqual(['stopped']);
  });
});

describe('the Ding', () => {
  it('settles after its beat and keeps Percy where he stopped', () => {
    const { nodes, log, clock, driver } = setup();
    driver.beginDing();
    clock.advance(300);
    expect(log).toEqual([]);
    clock.advance(600);
    expect(log).toEqual(['ding']);
    expect(nodes.percy.body.x).toBe(0);
  });
});

describe('close-up and the quiet pause', () => {
  it('frames Percy in the middle before anything else is said', () => {
    const { nodes, layout, log, clock, driver } = setup();
    driver.beginCloseup();
    clock.advance(CLOSEUP_MS - 300);
    expect(log).toEqual([]);
    clock.advance(600);
    expect(log).toEqual(['closeup']);
    expect(nodes.camera.scale).toBeCloseTo(layout.closeupScale, 5);
    expect(nodes.camera.x).toBeCloseTo(nodes.percy.body.x, 5);
  });

  it('holds the full pause in active time, and ten paused seconds add nothing', () => {
    const { log, clock, driver } = setup();
    driver.beginReactionPause();
    clock.advance(1500);
    driver.setPaused(true);
    clock.jump(10_000);
    clock.advance(500);
    expect(log).toEqual([]);
    expect(clock.pending()).toBe(0);
    driver.setPaused(false);
    clock.advance(400);
    expect(log).toEqual([]);
    clock.advance(REACTION_PAUSE_MS);
    expect(log).toEqual(['pause']);
  });

  it('keeps the pause in reduced motion', () => {
    const { log, clock, driver } = setup(true);
    driver.beginReactionPause();
    clock.advance(REACTION_PAUSE_MS - 400);
    expect(log).toEqual([]);
    clock.advance(800);
    expect(log).toEqual(['pause']);
  });
});

describe('departure', () => {
  function atCloseup() {
    const ctx = setup();
    ctx.driver.beginCloseup();
    ctx.clock.advance(CLOSEUP_MS + 200);
    ctx.log.length = 0;
    return ctx;
  }

  it('rests the rig, rolls away from a fixed camera and reports exit only when the whole rig has left', () => {
    const { nodes, log, clock, driver } = atCloseup();
    const cameraX = nodes.camera.x;
    nodes.percy.mast.tilt = 0.4;
    nodes.percy.arm.angle = 20;
    nodes.percy.glow.opacity = 0.5;
    driver.beginDeparture();
    clock.advance(400);
    expect(log).toEqual([]);
    clock.advance(30_000);
    expect(log.indexOf('exited')).toBeGreaterThanOrEqual(0);
    expect(log.filter((entry) => entry === 'exited')).toHaveLength(1);
    expect(nodes.camera.x).toBe(cameraX);
    expect(nodes.percy.glow.opacity).toBe(0);
    expect(nodes.percy.mast.tilt).toBeCloseTo(0, 3);
    expect(nodes.percy.arm.angle).toBeCloseTo(0, 3);
  });

  it('never lets the departure outrun its leg: speed is the departure speed', () => {
    const { nodes, clock, driver } = atCloseup();
    driver.beginDeparture();
    clock.advance(700);
    const start = nodes.percy.body.x;
    clock.advance(1000);
    const gained = nodes.percy.body.x - start;
    expect(gained).toBeGreaterThan(DEPARTURE_UNITS_PER_SECOND * 0.8);
    expect(gained).toBeLessThan(DEPARTURE_UNITS_PER_SECOND * 1.2);
  });

  it('shows at most twelve tracks and only after Percy has passed them', () => {
    const { nodes, clock, driver } = atCloseup();
    driver.beginDeparture();
    clock.advance(800);
    expect([...nodes.trackOpacity].filter((value) => value > 0).length).toBe(0);
    clock.advance(30_000);
    expect(nodes.trackOpacity).toHaveLength(TRACK_COUNT);
    expect([...nodes.trackOpacity].filter((value) => value > 0).length).toBeLessThanOrEqual(12);
  });

  it('settles the tracks only after the focus move and the hold', () => {
    const { nodes, layout, log, clock, driver } = atCloseup();
    driver.beginDeparture();
    clock.advance(30_000);
    expect(log).toContain('exited');
    expect(log).toContain('tracks');
    expect(nodes.camera.scale).toBeCloseTo(layout.tracksScale, 3);
    const exitedAt = log.indexOf('exited');
    expect(log.indexOf('tracks')).toBeGreaterThan(exitedAt);
  });

  it('after the exit the picture cannot show Percy again', () => {
    const { nodes, layout, clock, driver } = atCloseup();
    driver.beginDeparture();
    clock.advance(30_000);
    expect(
      percyExitedRight({
        width: layout.width,
        unit: layout.unit,
        cameraX: nodes.camera.x,
        cameraScale: nodes.camera.scale,
        bodyX: nodes.percy.body.x,
      }),
    ).toBe(true);
  });

  it('in reduced motion still validates the exit and keeps the hold', () => {
    const ctx = setup(true);
    ctx.driver.beginCloseup();
    ctx.log.length = 0;
    ctx.driver.beginDeparture();
    ctx.clock.advance(200);
    expect(ctx.log).toContain('exited');
    expect(ctx.log).not.toContain('tracks');
    ctx.clock.advance(TRACKS_HOLD_MS + 300);
    expect(ctx.log).toContain('tracks');
  });

  it('a change of host size mid-exit is picked up from live geometry', () => {
    const { nodes, layout, clock, driver, log } = atCloseup();
    driver.beginDeparture();
    clock.advance(900);
    driver.setLayout(layoutP08(2560, 1440, 30_000)!);
    clock.advance(40_000);
    expect(log).toContain('exited');
    expect(layout.width).toBe(1280);
    expect(nodes.percy.body.x).toBeGreaterThan(0);
  });
});

describe('fade and teardown', () => {
  it('fades to black over its time and reports once', () => {
    const { nodes, log, clock, driver } = setup();
    driver.beginFade();
    clock.advance(FADE_MS - 400);
    expect(log).toEqual([]);
    expect(nodes.cover.opacity).toBeGreaterThan(0);
    expect(nodes.cover.opacity).toBeLessThan(1);
    clock.advance(800);
    expect(log).toEqual(['fade']);
    expect(nodes.cover.opacity).toBe(1);
  });

  it('a paused fade stops where it is', () => {
    const { nodes, clock, driver } = setup();
    driver.beginFade();
    clock.advance(700);
    driver.setPaused(true);
    const at = nodes.cover.opacity;
    clock.jump(5000);
    clock.advance(500);
    expect(nodes.cover.opacity).toBe(at);
  });

  it('dispose cancels the frame and ignores later calls', () => {
    const { log, clock, driver } = setup();
    driver.beginFade();
    driver.dispose();
    driver.dispose();
    driver.beginFade();
    clock.advance(5000);
    expect(log).toEqual([]);
    expect(clock.pending()).toBe(0);
    expect(driver.isRunning()).toBe(false);
  });
});
