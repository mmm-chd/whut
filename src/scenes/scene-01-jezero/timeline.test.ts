import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { createSceneTimeline } from './timeline';

function resetStore() {
  useStoryStore.setState({
    activeSceneId: 'p01-jezero',
    status: 'playing',
    isPaused: false,
    completedInteractions: [],
  });
}

beforeEach(resetStore);

function buildStage() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div data-stage-world>
      <div data-sky-scroll>
        <img class="sky-scroll__image" />
      </div>
      <div data-sky-events></div>
      <div data-clouds></div>
      <div data-title></div>
      <div data-layer="far"></div>
      <div data-layer="far-dup"></div>
      <div data-layer="mid"></div>
      <div data-layer="mid-dup"></div>
      <div data-layer="fore"></div>
      <div data-layer="fore-dup"></div>
      <div data-fg="v1"></div>
      <div data-fg="v2"></div>
      <div data-percy>
        <div data-percy-glow></div>
      </div>
      <div data-rock="rock-a"></div>
      <div data-rock="rock-b"></div>
      <div data-rock="rock-c"></div>
    </div>
  `;
  return root;
}

describe('createSceneTimeline', () => {
  // The timeline no longer reads dialogue config: story-holding lines are
  // supplied by the scene (dialogue.storyHoldingLineIds).
  const HOLDING_IDS = ['narrator-01', 'narrator-02', 'percy-01', 'percy-03'];

  it('exposes the opening labels and legacy aliases', () => {
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
    });

    timeline.pause();

    expect(timeline.labels).toMatchObject({
      space: 0,
      sky: 0,
      title: 0.3,
      titleOut: 3.31,
      gateTitle: 3.3,
      descend: 3.31,
      land: 7,
      percyEnter: 7,
      zoomIn: 9,
      narrator1: 10.4,
      lookAround: 10.4,
      percyIntro: 14,
      panStart: 18,
      percyLine: 18.78,
      panEnd: 20.6,
      rocksReveal: 20.6,
      prompt: 20.7,
      waiting: 22.74,
    });

    timeline.kill();
  });

  it('pauses at the title gate and reports it', () => {
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onGate,
    });

    timeline.pause();
    timeline.seek(3.4, false);

    expect(onGate).toHaveBeenCalledWith('title');
    expect(timeline.paused()).toBe(true);

    timeline.kill();
  });

  it('pauses manual narrator-01 only after the camera finishes descending', () => {
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onGate,
      holdLineIds: HOLDING_IDS,
    });

    timeline.pause();
    timeline.seek(6.99, true);

    expect(onGate).not.toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'narrator-01' });

    timeline.seek(7.1, false);
    expect(onGate).toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'narrator-01' });
    expect(timeline.paused()).toBe(true);

    timeline.kill();
  });

  it('reports the story-holding narrator-02 and percy-01 dialogue gates', () => {
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onGate,
      holdLineIds: HOLDING_IDS,
    });

    timeline.pause();
    // Move past the title and narrator-01's post-descent hold without firing callbacks.
    timeline.seek(7.1, true);
    timeline.seek(10.5, false);
    expect(onGate).toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'narrator-02' });
    expect(timeline.paused()).toBe(true);

    timeline.seek(14.1, false);
    expect(onGate).toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'percy-01' });

    timeline.kill();
  });

  it('fires narrator-02 before its dialogue gate pauses the timeline', () => {
    const onLabel = vi.fn();
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onLabel,
      onGate,
      holdLineIds: HOLDING_IDS,
    });

    timeline.pause();
    // The label starts the React dialogue render; the pause must happen only
    // after it, even if one animation frame crosses both positions.
    timeline.seek(10.5, false);

    expect(onLabel).toHaveBeenCalledWith('narrator1');
    expect(onGate).toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'narrator-02' });

    timeline.kill();
  });

  it('reports the prompt dialogue gate before the rocks finish revealing', () => {
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onGate,
      holdLineIds: HOLDING_IDS,
    });

    timeline.pause();
    timeline.seek(20.69, true);
    timeline.seek(20.8, false);

    expect(onGate).toHaveBeenCalledWith({ kind: 'dialogue', lineId: 'percy-03' });
    expect(timeline.paused()).toBe(true);

    timeline.kill();
  });

  it('never pauses for dialogue lines when no story-holding ids are supplied', () => {
    const onGate = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      onGate,
    });

    timeline.pause();
    timeline.seek(20.8, false);

    expect(onGate).not.toHaveBeenCalledWith(expect.objectContaining({ kind: 'dialogue' }));

    timeline.kill();
  });

  it('marks the sky phase space at the start and sky once the camera lands', () => {
    const root = buildStage();
    const world = root.querySelector('[data-stage-world]')!;
    const timeline = createSceneTimeline({
      root,
      onComplete: vi.fn(),
    });

    timeline.pause();
    timeline.seek(3.4);
    expect(world.getAttribute('data-sky-phase')).toBe('space');

    // The phase flips at land (7.0): comets stop spawning from then on.
    timeline.seek(7.1);
    expect(world.getAttribute('data-sky-phase')).toBe('sky');

    timeline.kill();
  });

  it('never completes the scene while the opening plays', () => {
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: () => useStoryStore.getState().setStatus('waiting'),
    });

    timeline.pause();
    timeline.seek(3.4, false);
    expect(useStoryStore.getState().status).toBe('playing');

    timeline.seek(14.9, false);
    expect(useStoryStore.getState().status).toBe('playing');

    timeline.kill();
  });

  it('pans to the rocks without completing the scene', () => {
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: () => useStoryStore.getState().setStatus('waiting'),
    });

    timeline.pause();
    // Suppress the intro gate so the seek can pass through the pan.
    timeline.seek(15.6, true);
    expect(useStoryStore.getState().status).toBe('playing');

    timeline.seek(17.4, true);
    expect(useStoryStore.getState().status).toBe('playing');

    timeline.kill();
  });

  it('marks the scene waiting, never completed, when the timeline ends', () => {
    // Mirrors Scene.tsx: the timeline end only marks the scene waiting.
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete: () => useStoryStore.getState().setStatus('waiting'),
    });

    timeline.pause();
    timeline.progress(1);

    expect(useStoryStore.getState().status).toBe('waiting');
    expect(useStoryStore.getState().status).not.toBe('completed');

    timeline.kill();
  });

  it('calls onComplete at the end', () => {
    const onComplete = vi.fn();
    const timeline = createSceneTimeline({
      root: buildStage(),
      onComplete,
    });

    timeline.pause();
    timeline.progress(1);

    expect(onComplete).toHaveBeenCalledTimes(1);

    timeline.kill();
  });

  it('accepts reducedMotion and keeps the opening labels in place', () => {
    const normal = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      reducedMotion: false,
    });
    normal.pause();

    const reduced = createSceneTimeline({
      root: buildStage(),
      onComplete: vi.fn(),
      reducedMotion: true,
    });
    reduced.pause();

    // The opening is identical; only the pan is shortened.
    expect(reduced.labels).toMatchObject({
      space: 0,
      title: 0.3,
      gateTitle: 3.3,
      descend: 3.31,
      land: 7,
      zoomIn: 9,
      narrator1: 10.4,
      panStart: 18,
    });
    expect(reduced.labels.panEnd).toBeLessThan(normal.labels.panEnd);
    expect(reduced.labels.waiting).toBeLessThan(normal.labels.waiting);

    normal.kill();
    reduced.kill();
  });
});
