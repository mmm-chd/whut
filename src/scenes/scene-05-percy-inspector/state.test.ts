import { describe, expect, it } from 'vitest';
import {
  canCompleteInspection,
  canExitInspection,
  createInspectorSceneState,
  inspectorInteractive,
  reduceInspectorScene,
  type InspectorSceneState,
} from './state';

const settle = (renderer: '3d' | '2d-fallback'): InspectorSceneState =>
  reduceInspectorScene(createInspectorSceneState(), { type: 'MODEL_SETTLED', renderer });

const ready = (): InspectorSceneState =>
  reduceInspectorScene(settle('3d'), { type: 'FIRST_FRAME' });

describe('loading', () => {
  it('starts loading with nothing settled', () => {
    const state = createInspectorSceneState();
    expect(state.phase).toBe('loading');
    expect(state.renderer).toBeNull();
    expect(inspectorInteractive(state)).toBe(false);
  });

  it('waits for the first painted frame before going ready', () => {
    const settled = settle('3d');
    expect(settled.phase).toBe('loading');
    expect(settled.renderer).toBe('3d');
    expect(reduceInspectorScene(settled, { type: 'FIRST_FRAME' }).phase).toBe('ready');
  });

  it('is ready as soon as the 2D fallback is settled', () => {
    const fallback = settle('2d-fallback');
    expect(fallback.phase).toBe('ready');
    expect(inspectorInteractive(fallback)).toBe(true);
    // A fallback never reports a frame; a stray one must not move the phase.
    expect(reduceInspectorScene(fallback, { type: 'FIRST_FRAME' }).phase).toBe('ready');
  });

  it('ignores a second settlement and a frame before settlement', () => {
    const settled = settle('3d');
    expect(reduceInspectorScene(settled, { type: 'MODEL_SETTLED', renderer: '2d-fallback' })).toBe(
      settled,
    );
    expect(reduceInspectorScene(createInspectorSceneState(), { type: 'FIRST_FRAME' }).phase).toBe(
      'loading',
    );
  });
});

describe('leaving', () => {
  it('never leaves while loading', () => {
    expect(reduceInspectorScene(createInspectorSceneState(), { type: 'EXIT_REQUESTED' }).phase).toBe(
      'loading',
    );
  });

  it('exits on request, then finishes once', () => {
    const exiting = reduceInspectorScene(ready(), { type: 'EXIT_REQUESTED' });
    expect(exiting.phase).toBe('exiting');
    // The reader keeps their view until the fade ends: still interactive.
    expect(inspectorInteractive(exiting)).toBe(true);
    const done = reduceInspectorScene(exiting, { type: 'EXIT_FINISHED' });
    expect(done.phase).toBe('done');
    expect(reduceInspectorScene(done, { type: 'EXIT_FINISHED' })).toBe(done);
    expect(inspectorInteractive(done)).toBe(false);
  });
});

describe('the exit control', () => {
  const base = {
    status: 'waiting' as const,
    sceneActive: true,
    paused: false,
    state: ready(),
    allPointsComplete: false,
  };

  it('stays disabled until every part is read', () => {
    expect(canExitInspection(base)).toBe(false);
    expect(canExitInspection({ ...base, allPointsComplete: true })).toBe(true);
  });

  it('is disabled while loading, while paused and while the scene is inactive', () => {
    expect(canExitInspection({ ...base, state: settle('3d'), allPointsComplete: true })).toBe(false);
    expect(canExitInspection({ ...base, paused: true, allPointsComplete: true })).toBe(false);
    expect(canExitInspection({ ...base, sceneActive: false, allPointsComplete: true })).toBe(false);
  });

  it('undeclares itself once the exit has started', () => {
    const exiting = reduceInspectorScene(ready(), { type: 'EXIT_REQUESTED' });
    expect(canExitInspection({ ...base, state: exiting, allPointsComplete: true })).toBe(false);
    expect(
      canCompleteInspection({
        ...base,
        state: exiting,
        allPointsComplete: true,
        fadeFinished: true,
      }),
    ).toBe(true);
  });

});

describe('the close-up opens with nothing selected', () => {
  it('shows four discoverable parts and no panel until one is chosen', async () => {
    // `perseverance-3d-inspection-interaction.md` 3.1: no component is selected
    // or highlighted on arrival, so the reader discovers a part themselves.
    const { createInspectionState, reduceInspection } = await import(
      '../scene-04-percy-inspection/inspectionState'
    );
    const idle = createInspectionState();
    expect(idle.activePoint).toBeNull();

    // The first choice is exactly a press on a chip, and the close returns to
    // the same idle state.
    const opened = reduceInspection(idle, { type: 'OPEN_POINT', point: 'cameras' });
    expect(opened.activePoint).toBe('cameras');
    expect(reduceInspection(opened, { type: 'CLOSE_POINT' }).activePoint).toBeNull();
  });
});

describe('startsTurn', () => {
  it('refuses a press that lands on a control, so its click is not swallowed', async () => {
    const { startsTurn } = await import('./state');
    const button = document.createElement('button');
    const chipLabel = document.createElement('span');
    button.append(chipLabel);
    const link = document.createElement('a');
    link.href = '#x';
    const roleButton = document.createElement('div');
    roleButton.setAttribute('role', 'button');
    const field = document.createElement('input');

    expect(startsTurn(chipLabel)).toBe(false);
    expect(startsTurn(button)).toBe(false);
    expect(startsTurn(link)).toBe(false);
    expect(startsTurn(roleButton)).toBe(false);
    expect(startsTurn(field)).toBe(false);
  });

  it('allows a press on the picture itself', async () => {
    const { startsTurn } = await import('./state');
    const canvas = document.createElement('canvas');
    const screen = document.createElement('div');
    screen.append(canvas);
    expect(startsTurn(canvas)).toBe(true);
    expect(startsTurn(screen)).toBe(true);
    expect(startsTurn(null)).toBe(true);
  });
});
