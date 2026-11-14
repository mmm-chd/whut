import { beforeEach, describe, expect, it, vi } from 'vitest';
import { P02_CAMERA, P02_LAND, P02_ROCKET_ESTABLISHING, isP02RocketOffscreen } from './camera';
import { createP02Nodes, getP02NodeBounds, p02CameraPose, type P02Nodes } from './nodes';
import { createP02Timeline } from './timeline';

const FRAME = { left: 0, top: 0, right: 1920, bottom: 1080 };

const HOLD_IDS = [
  'p02-narrator-01',
  'p02-narrator-02',
  'p02-narrator-03',
  'p02-narrator-04',
];

let nodes: P02Nodes;

function makeTimeline(overrides: Partial<Parameters<typeof createP02Timeline>[0]> = {}) {
  return createP02Timeline({
    nodes,
    reducedMotion: false,
    holdLineIds: HOLD_IDS,
    onPhase: vi.fn(),
    onLabel: vi.fn(),
    onGate: vi.fn(),
    onCountdown: vi.fn(),
    isRocketOffscreen: () => true,
    onComplete: vi.fn(),
    ...overrides,
  });
}

function releaseDialogueGates(timeline: ReturnType<typeof createP02Timeline>) {
  const gates: Array<[string, number]> = [
    ['p02-narrator-01', 2.42],
    ['p02-narrator-02', 8.02],
    ['p02-narrator-03', 10.82],
    ['p02-narrator-04', 12.82],
  ];

  for (const [lineId, position] of gates) {
    timeline.pause();
    timeline.seek(position, false);
    timeline.releaseDialogue(lineId);
  }
}

describe('createP02Timeline', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    nodes = createP02Nodes();
  });

  it('exposes the four dialogue labels in presentation order', () => {
    const timeline = makeTimeline();
    timeline.pause();

    expect(timeline.labels).toMatchObject({
      'rocket-establishing-shot': 2.4,
      'percy-dialogue': 8,
      'ginny-dialogue': 10.8,
      'launch-invitation': 12.8,
    });

    timeline.dispose();
  });

  it('cues the line before its dialogue gate pauses the story', () => {
    const order: string[] = [];
    const timeline = makeTimeline({
      onLabel: (label) => order.push(`label:${label}`),
      onGate: (gate) => order.push(`gate:${gate.kind === 'dialogue' ? gate.lineId : 'launch'}`),
    });

    timeline.pause();
    timeline.seek(2.42, false);

    expect(order).toEqual([
      'label:rocket-establishing-shot',
      'gate:p02-narrator-01',
    ]);
    expect(timeline.paused()).toBe(true);

    timeline.dispose();
  });

  it('does not let generic resume bypass the launch gate', () => {
    const onGate = vi.fn();
    const timeline = makeTimeline({ onGate });

    timeline.pause();
    releaseDialogueGates(timeline);
    timeline.pause();
    timeline.seek(13.42, false);

    expect(onGate).toHaveBeenCalledWith({ kind: 'launch' });
    expect(timeline.paused()).toBe(true);

    timeline.resume();
    expect(timeline.paused()).toBe(true);

    expect(timeline.launch()).toBe(true);
    expect(timeline.paused()).toBe(false);
    expect(timeline.launch()).toBe(false);

    timeline.dispose();
  });

  it('emits the ordered countdown once', () => {
    const onCountdown = vi.fn();
    const onPhase = vi.fn();
    const timeline = makeTimeline({ onCountdown, onPhase });

    timeline.pause();
    releaseDialogueGates(timeline);
    timeline.seek(13.42, false);
    timeline.launch();
    timeline.seek(16.85, false);

    expect(onCountdown.mock.calls.map(([value]) => value)).toEqual([3, 2, 1, 'GO!']);
    expect(onPhase).toHaveBeenCalledWith('countdown');
    expect(onPhase).toHaveBeenCalledWith('ascent');

    timeline.dispose();
  });

  it('clears GO! after about a second so the ascent has no text over it', () => {
    const onCountdown = vi.fn();
    const timeline = makeTimeline({ onCountdown });

    timeline.pause();
    releaseDialogueGates(timeline);
    timeline.seek(13.42, false);
    timeline.launch();
    timeline.seek(17.2, false);
    expect(onCountdown).toHaveBeenLastCalledWith('GO!');

    timeline.seek(17.7, false);
    expect(onCountdown).toHaveBeenLastCalledWith(null);

    timeline.dispose();
  });

  it('blocks completion when the measured rocket is still visible', () => {
    const onComplete = vi.fn();
    const timeline = makeTimeline({
      isRocketOffscreen: () => false,
      onComplete,
    });

    timeline.pause();
    releaseDialogueGates(timeline);
    timeline.seek(13.42, false);
    timeline.launch();
    timeline.seek(22.2, false);

    expect(onComplete).not.toHaveBeenCalled();

    timeline.dispose();
  });

  it('completes once after the exit fade when the rocket is offscreen', () => {
    const onComplete = vi.fn();
    const timeline = makeTimeline({ onComplete });

    timeline.pause();
    releaseDialogueGates(timeline);
    timeline.seek(13.42, false);
    timeline.launch();
    timeline.seek(22.2, false);

    expect(onComplete).toHaveBeenCalledTimes(1);

    timeline.dispose();
  });

  it('dispose prevents later callbacks', () => {
    const onLabel = vi.fn();
    const timeline = makeTimeline({ onLabel });

    timeline.pause();
    timeline.dispose();
    timeline.seek(3, false);

    expect(onLabel).not.toHaveBeenCalled();
  });

  describe('node state', () => {
    function launchTo(timeline: ReturnType<typeof createP02Timeline>, time: number) {
      timeline.pause();
      releaseDialogueGates(timeline);
      timeline.seek(13.42, false);
      timeline.launch();
      timeline.seek(time, false);
    }

    it('starts on the establishing frame', () => {
      const timeline = makeTimeline();
      timeline.pause();
      timeline.seek(0.1, true);

      expect(nodes.rocket.y).toBe(P02_ROCKET_ESTABLISHING.offsetY);
      expect(nodes.rocket.scale).toBe(P02_ROCKET_ESTABLISHING.scale);
      expect(nodes.land.y).toBe(P02_LAND.establishingOffsetY);
      expect(nodes.closeup.opacity).toBe(0);
      expect(p02CameraPose(nodes)).toMatchObject(P02_CAMERA.establishing);

      timeline.dispose();
    });

    it('fades the close-up in, shows Percy then Ginny, then fades out at countdown', () => {
      const timeline = makeTimeline();
      timeline.pause();

      timeline.seek(7, false);
      expect(nodes.closeup.opacity).toBe(1);
      expect(nodes.closeup.scale).toBe(1);
      expect(nodes.closeupPercy.opacity).toBe(0);
      expect(nodes.closeupGinny.opacity).toBe(0);

      timeline.seek(9, false);
      expect(nodes.closeupPercy.opacity).toBe(1);
      expect(nodes.closeupGinny.opacity).toBe(0);

      timeline.seek(11.5, false);
      expect(nodes.closeupGinny.opacity).toBe(1);

      launchTo(timeline, 14.5);
      expect(nodes.closeup.opacity).toBe(0);
      expect(nodes.windowGinny.opacity).toBe(1);

      timeline.dispose();
    });

    it('keeps the rocket on screen until the ascent and clears the frame after it', () => {
      const timeline = makeTimeline();

      launchTo(timeline, 13.45);
      expect(isP02RocketOffscreen(getP02NodeBounds(nodes), FRAME, 24)).toBe(false);

      timeline.seek(16.5, false);
      expect(nodes.flags.launching).toBe(false);
      expect(isP02RocketOffscreen(getP02NodeBounds(nodes), FRAME, 24)).toBe(false);

      timeline.seek(22.2, false);
      expect(nodes.flags.launching).toBe(true);
      expect(isP02RocketOffscreen(getP02NodeBounds(nodes), FRAME, 24)).toBe(true);
      expect(nodes.skyCap.opacity).toBe(1);

      timeline.dispose();
    });

    it('lights the exhaust only from GO!', () => {
      const timeline = makeTimeline();

      launchTo(timeline, 16.5);
      expect(nodes.exhaust.opacity).toBe(0);

      timeline.seek(17.2, false);
      expect(nodes.exhaust.opacity).toBe(1);
      expect(nodes.smoke[0].opacity).toBeGreaterThan(0);

      timeline.dispose();
    });

    it('reduced motion skips shake and still clears the frame', () => {
      nodes = createP02Nodes(true);
      const timeline = makeTimeline({ reducedMotion: true });

      launchTo(timeline, 22.2);
      expect(nodes.shake.x).toBe(0);
      expect(nodes.vibration.x).toBe(0);
      expect(isP02RocketOffscreen(getP02NodeBounds(nodes), FRAME, 24)).toBe(true);

      timeline.dispose();
    });
  });
});
