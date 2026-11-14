import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getP03Line, lineDisplaySeconds, p03StoryHoldingLineIds } from './dialogue';
import { DOOR, layoutP03 } from './layout';
import { createP03Nodes, resetP03Nodes, type P03Nodes } from './nodes';
import { createP03Timeline, type P03Timeline } from './timeline';

const layout = layoutP03(1920, 1080);
let nodes: P03Nodes;

function make(overrides: Partial<Parameters<typeof createP03Timeline>[0]> = {}) {
  return createP03Timeline({
    nodes,
    layout,
    reducedMotion: false,
    holdLineIds: p03StoryHoldingLineIds,
    onPhase: vi.fn(),
    onLabel: vi.fn(),
    onGate: vi.fn(),
    onCards: vi.fn(),
    onPercyExit: vi.fn(),
    onExcited: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  });
}

const labelOf = (id: string) => getP03Line(id).timelineLabel;

/** Walk the whole cue sheet, releasing every gate as the reader would. */
function runThrough(timeline: P03Timeline) {
  timeline.pause();
  const gates = p03StoryHoldingLineIds
    .map((id) => ({ id, at: timeline.labels[labelOf(id)] }))
    .sort((a, b) => a.at - b.at);
  for (const gate of gates) {
    timeline.pause();
    timeline.seek(gate.at + 0.02, false);
    timeline.releaseDialogue(gate.id);
  }
  timeline.pause();
  timeline.seek(10_000, false);
}

beforeEach(() => {
  nodes = createP03Nodes();
  resetP03Nodes(nodes, layout);
});

describe('createP03Timeline', () => {
  it('lays the fourteen cues out in story order', () => {
    const timeline = make();
    timeline.pause();
    const order = [
      'p03-narrator-01', 'p03-narrator-02', 'p03-narrator-03', 'p03-narrator-04',
      'p03-percy-01', 'p03-percy-02', 'p03-narrator-05', 'p03-narrator-06',
      'p03-narrator-07', 'p03-narrator-08', 'p03-narrator-09', 'p03-narrator-10',
      'p03-narrator-11', 'p03-narrator-12',
    ];
    const times = order.map((id) => timeline.labels[labelOf(id)]);
    expect(times.every((time) => typeof time === 'number')).toBe(true);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    timeline.dispose();
  });

  it('spaces auto narration by its real display time, so no beat describes a past action', () => {
    const timeline = make();
    timeline.pause();
    const pairs: Array<[string, string]> = [
      ['p03-narrator-01', 'p03-narrator-02'],
      ['p03-narrator-02', 'p03-narrator-03'],
      ['p03-narrator-03', 'p03-narrator-04'],
    ];
    for (const [from, to] of pairs) {
      const gap = timeline.labels[labelOf(to)] - timeline.labels[labelOf(from)];
      expect(gap).toBeGreaterThanOrEqual(lineDisplaySeconds(getP03Line(from), false));
    }
    timeline.dispose();
  });

  it('cues a line before its gate pauses the story', () => {
    const order: string[] = [];
    const timeline = make({
      onLabel: (label) => order.push(`label:${label}`),
      onGate: (gate) => order.push(`gate:${gate.lineId}`),
    });
    timeline.pause();
    runThrough(timeline);
    const first = order.indexOf('label:confused-percy-1');
    expect(first).toBeGreaterThanOrEqual(0);
    expect(order[first + 1]).toBe('gate:p03-percy-01');
    timeline.dispose();
  });

  it('opens gates only for holding lines, never for walk narration', () => {
    const gates: string[] = [];
    const timeline = make({ onGate: (gate) => gates.push(gate.lineId) });
    runThrough(timeline);
    expect(gates).toEqual([...p03StoryHoldingLineIds]);
    for (const id of ['p03-narrator-01', 'p03-narrator-02', 'p03-narrator-03', 'p03-narrator-04']) {
      expect(gates).not.toContain(id);
    }
    timeline.dispose();
  });

  it('does not let generic resume bypass a gate', () => {
    const timeline = make();
    timeline.pause();
    timeline.seek(timeline.labels[labelOf('p03-percy-01')] + 0.02, false);
    timeline.resume();
    expect(timeline.paused()).toBe(true);
    timeline.releaseDialogue('p03-percy-01');
    expect(timeline.paused()).toBe(false);
    timeline.dispose();
  });

  it('never rolls Percy backwards, so text can never stop or reverse the walk', () => {
    const timeline = make();
    timeline.pause();
    let previous = -Infinity;
    for (let time = 0; time <= 120; time += 0.5) {
      timeline.seek(time, true);
      expect(nodes.percy.body.x).toBeGreaterThanOrEqual(previous - 1e-6);
      previous = nodes.percy.body.x;
    }
    timeline.dispose();
  });

  it('runs the whole scene once: phases, exit, four cards, excited beat, completion', () => {
    const onPhase = vi.fn();
    const onCards = vi.fn();
    const onPercyExit = vi.fn();
    const onExcited = vi.fn();
    const onComplete = vi.fn();
    const timeline = make({ onPhase, onCards, onPercyExit, onExcited, onComplete });
    runThrough(timeline);

    expect(onPhase.mock.calls.map(([phase]) => phase)).toEqual([
      'landing', 'door', 'exit', 'reveal', 'walk', 'look-around', 'inspect', 'confused',
      'rovers', 'mission', 'excited', 'final-quote', 'transition',
    ]);
    expect(onPercyExit).toHaveBeenCalledTimes(1);
    expect(onCards.mock.calls.map(([shown]) => shown)).toEqual([1, 2, 3, 4]);
    expect(onExcited).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(nodes.percy.body.y).toBeCloseTo(0);
    timeline.dispose();
  });

  it('opens the door, fades Percy in at the sill, and has him jump down to the ground', () => {
    const timeline = make();
    timeline.pause();
    timeline.seek(0.1, true);
    expect(nodes.percy.body.opacity).toBe(0);
    expect(nodes.percy.body.y).toBe(-DOOR.sill);

    // After touchdown the door is still closed and Percy is still unseen.
    timeline.seek(5.6, true);
    expect(nodes.door.open).toBe(0);
    expect(nodes.percy.body.opacity).toBe(0);

    // The door has slid open before he appears.
    timeline.seek(8.2, true);
    expect(nodes.door.open).toBe(1);
    expect(nodes.percy.body.opacity).toBe(0);

    // He fades in at the sill and is airborne above the ground, then lands.
    let highest = 0;
    let lowest = -DOOR.sill;
    for (let time = 8.2; time <= 14; time += 0.05) {
      timeline.seek(time, true);
      highest = Math.max(highest, nodes.percy.body.opacity);
      lowest = Math.max(lowest, nodes.percy.body.y);
    }
    expect(highest).toBe(1);
    expect(lowest).toBeCloseTo(0, 0);
    expect(nodes.percy.body.y).toBeCloseTo(0);
    expect(nodes.percy.body.x).toBeGreaterThan(layout.landX - 1);
    timeline.dispose();
  });

  it('starts the excited beat only after the last mission line resolves', () => {
    const onExcited = vi.fn();
    const onGate = vi.fn();
    const timeline = make({ onExcited, onGate });
    timeline.pause();
    const lastMission = timeline.labels[labelOf('p03-narrator-10')];

    timeline.seek(lastMission + 0.02, false);
    expect(onGate).toHaveBeenLastCalledWith({ kind: 'dialogue', lineId: 'p03-narrator-10' });
    expect(onExcited).not.toHaveBeenCalled();
    expect(nodes.percy.body.y).toBe(0);
    timeline.dispose();
  });

  it('completes with reduced motion, keeps every beat, and never hops above the sill', () => {
    nodes = createP03Nodes(true);
    resetP03Nodes(nodes, layout, true);
    const onPhase = vi.fn();
    const onExcited = vi.fn();
    const onComplete = vi.fn();
    // Pass 1: sweep the sheet without events and track the lowest body.y.
    const sweep = make({ reducedMotion: true });
    sweep.pause();
    let lowest = 0;
    for (let time = 0; time <= 200; time += 0.1) {
      sweep.seek(time, true);
      lowest = Math.min(lowest, nodes.percy.body.y);
    }
    sweep.dispose();

    // Pass 2: run it through with every gate released.
    resetP03Nodes(nodes, layout, true);
    const timeline = make({ reducedMotion: true, onPhase, onExcited, onComplete });
    runThrough(timeline);

    // Never above the sill: no hop up in reduced motion, only the move down.
    expect(lowest).toBeGreaterThanOrEqual(-DOOR.sill);
    expect(nodes.percy.body.y).toBeCloseTo(0);
    expect(onExcited).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onPhase.mock.calls.map(([phase]) => phase)).toContain('transition');

    const normal = make();
    normal.pause();
    expect(timeline.labels['final-quote']).toBeLessThan(normal.labels['final-quote']);
    normal.dispose();
    timeline.dispose();
  });

  it('dispose prevents later callbacks', () => {
    const onLabel = vi.fn();
    const timeline = make({ onLabel });
    timeline.pause();
    timeline.dispose();
    timeline.seek(60, false);
    expect(onLabel).not.toHaveBeenCalled();
  });
});
