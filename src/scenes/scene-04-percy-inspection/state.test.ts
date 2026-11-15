import { describe, expect, it } from 'vitest';
import { canCompleteP04, canEnterP04, type P04GuardSnapshot } from './state';

/**
 * The two acceptance guards are the only doors P-04 has left: hand over, and
 * complete. Every truth table starts from a finished state and flips one field,
 * so a forgotten condition shows up as an accepted input.
 */

const ready = (overrides: Partial<P04GuardSnapshot> = {}): P04GuardSnapshot => ({
  phase: 'awaiting-inspection',
  status: 'waiting',
  currentRun: true,
  sceneActive: true,
  paused: false,
  introResolved: true,
  entryAccepted: false,
  fadeFinished: false,
  completionAccepted: false,
  ...overrides,
});

describe('hand-over guard', () => {
  it('accepts the scripted carry once the invitation is read', () => {
    expect(canEnterP04(ready())).toBe(true);
  });

  it('needs the intro resolved and the invitation phase', () => {
    expect(canEnterP04(ready({ introResolved: false }))).toBe(false);
    expect(canEnterP04(ready({ phase: 'invitation' }))).toBe(false);
    expect(canEnterP04(ready({ phase: 'handoff' }))).toBe(false);
  });

  it('belongs to a live run in the active scene that is waiting on the reader', () => {
    expect(canEnterP04(ready({ currentRun: false }))).toBe(false);
    expect(canEnterP04(ready({ sceneActive: false }))).toBe(false);
    expect(canEnterP04(ready({ status: 'playing' }))).toBe(false);
    expect(canEnterP04(ready({ status: 'completed' }))).toBe(false);
  });

  it('is refused while paused and after the carry has started', () => {
    expect(canEnterP04(ready({ paused: true }))).toBe(false);
    expect(canEnterP04(ready({ entryAccepted: true }))).toBe(false);
  });
});

describe('completion guard', () => {
  const exiting = (overrides: Partial<P04GuardSnapshot> = {}): P04GuardSnapshot =>
    ready({ phase: 'exit', entryAccepted: true, fadeFinished: true, ...overrides });

  it('completes on the finished fade of an accepted hand-over', () => {
    expect(canCompleteP04(exiting())).toBe(true);
  });

  it('waits for the fade, and only runs in `exit`', () => {
    expect(canCompleteP04(exiting({ fadeFinished: false }))).toBe(false);
    expect(canCompleteP04(exiting({ phase: 'handoff' }))).toBe(false);
    expect(canCompleteP04(exiting({ phase: 'done' }))).toBe(false);
  });

  it('never completes without a hand-over', () => {
    expect(canCompleteP04(ready({ phase: 'exit', fadeFinished: true }))).toBe(false);
  });

  it('is never accepted twice, nor while paused or inactive', () => {
    expect(canCompleteP04(exiting({ completionAccepted: true }))).toBe(false);
    expect(canCompleteP04(exiting({ paused: true }))).toBe(false);
    expect(canCompleteP04(exiting({ sceneActive: false }))).toBe(false);
    expect(canCompleteP04(exiting({ currentRun: false }))).toBe(false);
  });
});