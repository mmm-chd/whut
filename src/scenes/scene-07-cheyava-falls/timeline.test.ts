import { beforeEach, describe, expect, it } from 'vitest';
import { isPercyOutsideViewport, layoutP06, type P06Layout } from './layout';
import { createP06Nodes, resetP06Nodes, type P06Nodes } from './nodes';
import { createP06Intro, type P06IntroEvent } from './timeline';

const layout = layoutP06(1280, 720);
let nodes: P06Nodes;

interface Seen {
  readonly event: P06IntroEvent;
  readonly percyX: number;
  readonly cameraX: number;
  readonly outside: boolean;
}

function run(reducedMotion = false) {
  const seen: Seen[] = [];
  const intro = createP06Intro({
    nodes,
    layout,
    reducedMotion,
    onEvent: (event) => {
      seen.push({
        event,
        percyX: nodes.percy.body.x,
        cameraX: nodes.camera.x,
        outside: isPercyOutsideViewport(nodes.percy.body.x, nodes.camera, layout),
      });
    },
  });
  return { intro, seen };
}

beforeEach(() => {
  nodes = createP06Nodes();
  resetP06Nodes(nodes, layout);
});

describe('the P-06 intro', () => {
  it('reports its beats in story order, once each', () => {
    const { intro, seen } = run();
    intro.seek(intro.duration + 1);
    expect(seen.map((entry) => entry.event)).toEqual([
      'journey',
      'exited',
      'faded-out',
      'skip-shown',
      'skip-cleared',
      'valley',
      'intro-done',
    ]);
  });

  it('only fades to black after Percy is really outside the picture', () => {
    const { intro, seen } = run();
    intro.seek(intro.duration + 1);
    const faded = seen.findIndex((entry) => entry.event === 'faded-out');
    expect(faded).toBeGreaterThan(0);
    // Both at the moment the fade completes and just before it began.
    expect(seen[faded].outside).toBe(true);
    expect(seen[faded - 1].outside).toBe(true);
  });

  it('moves the world on behind the black, not in front of the reader', () => {
    const { intro, seen } = run();
    intro.seek(intro.duration + 1);
    const atSkip = seen.find((entry) => entry.event === 'skip-shown');
    const atValley = seen.find((entry) => entry.event === 'valley');
    expect(atSkip).toBeDefined();
    expect(atValley).toBeDefined();
    // Black is still opaque while the camera jump happens.
    expect(atSkip!.cameraX).toBeLessThan(layout.valley.x);
    expect(nodes.camera.x).toBeCloseTo(layout.valley.x, 5);
  });

  it('ends with the valley, the marker and Percy beside the rock', () => {
    const { intro } = run();
    intro.seek(intro.duration + 1);
    expect(nodes.valley.opacity).toBe(1);
    expect(nodes.marker.opacity).toBe(1);
    expect(nodes.fade.opacity).toBe(0);
    expect(nodes.camera.scale).toBeCloseTo(layout.valley.scale, 5);
    expect(Math.abs(nodes.percy.body.x - (layout.rockX - 340))).toBeLessThan(1);
  });

  it('keeps the full story when motion is reduced, and only shortens it', () => {
    const { intro: full } = run(false);
    const { intro: short } = run(true);
    expect(short.duration).toBeLessThan(full.duration);
    expect(short.duration).toBeGreaterThan(0);
  });

  it('stops when paused, so the beats cannot outrun the screen', () => {
    const { intro } = run();
    intro.play(0);
    intro.pause();
    expect(intro.isRunning()).toBe(false);
  });

  it('props the camera on the follow line, never ahead of Percy', () => {
    const { intro } = run();
    intro.seek(1.6);
    expect(nodes.camera.x).toBeLessThanOrEqual(layout.followX(nodes.percy.body.x) + 1e-6);
  });
});

describe('the layout the intro is built on', () => {
  it('has a valley to the right of the exit, out of the journey camera', () => {
    const wide: P06Layout = layoutP06(1920, 1080);
    expect(wide.valley.x).toBeGreaterThan(wide.exitX);
    expect(wide.rockX).toBeGreaterThan(wide.valley.x);
  });
});
