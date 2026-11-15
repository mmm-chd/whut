import { describe, expect, it } from 'vitest';
import {
  canAcceptP03Continue,
  canCompleteP03,
  type P03GuardSnapshot,
} from './state';

const ready: P03GuardSnapshot = {
  phase: 'final-quote',
  status: 'waiting',
  paused: false,
  currentRun: true,
  sceneActive: true,
  precedingDialogueResolved: true,
  allDialogueResolved: false,
  percyExited: true,
  roversShown: 4,
  excitedPlayed: true,
  gameCompleted: true,
  continueAccepted: false,
  fadeFinished: false,
};

const finished: P03GuardSnapshot = {
  ...ready,
  phase: 'transition',
  allDialogueResolved: true,
  continueAccepted: true,
  fadeFinished: true,
};

describe('canAcceptP03Continue', () => {
  it('accepts before the last line resolves: it needs only the lines before it', () => {
    expect(ready.allDialogueResolved).toBe(false);
    expect(canAcceptP03Continue(ready)).toBe(true);
  });

  it.each([
    ['an old run', { currentRun: false }],
    ['another scene', { sceneActive: false }],
    ['a pause', { paused: true }],
    ['the wrong status', { status: 'playing' as const }],
    ['the wrong phase', { phase: 'mission' as const }],
    ['an earlier line still open', { precedingDialogueResolved: false }],
    ['a second input', { continueAccepted: true }],
  ])('rejects %s', (_name, patch) => {
    expect(canAcceptP03Continue({ ...ready, ...patch })).toBe(false);
  });
});

describe('canCompleteP03', () => {
  it('completes when every beat is done', () => {
    expect(canCompleteP03(finished)).toBe(true);
  });

  it.each([
    ['an old run', { currentRun: false }],
    ['another scene', { sceneActive: false }],
    ['a pause', { paused: true }],
    ['the wrong status', { status: 'playing' as const }],
    ['the wrong phase', { phase: 'final-quote' as const }],
    ['a line still open', { allDialogueResolved: false }],
    ['Percy not exited', { percyExited: false }],
    ['a missing rover card', { roversShown: 3 }],
    ['no excited beat', { excitedPlayed: false }],
    ['no accepted Continue', { continueAccepted: false }],
    ['an unfinished fade', { fadeFinished: false }],
  ])('rejects %s', (_name, patch) => {
    expect(canCompleteP03({ ...finished, ...patch })).toBe(false);
  });
});
