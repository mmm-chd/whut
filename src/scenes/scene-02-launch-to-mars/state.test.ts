import { describe, expect, it } from 'vitest';
import {
  canAcceptP02Launch,
  canCompleteP02,
  type P02GuardSnapshot,
} from './state';

const readyToLaunch: P02GuardSnapshot = {
  phase: 'awaiting-launch',
  status: 'waiting',
  paused: false,
  currentRun: true,
  sceneActive: true,
  dialogueResolved: true,
  launchAccepted: false,
  countdownFinished: false,
  rocketOffscreen: false,
};

const readyToComplete: P02GuardSnapshot = {
  ...readyToLaunch,
  phase: 'exit',
  launchAccepted: true,
  countdownFinished: true,
  rocketOffscreen: true,
};

describe('canAcceptP02Launch', () => {
  it('accepts the first launch only after every precondition passes', () => {
    expect(canAcceptP02Launch(readyToLaunch)).toBe(true);
  });

  it.each([
    ['an unresolved dialogue line', { dialogueResolved: false }],
    ['a paused scene', { paused: true }],
    ['the wrong phase', { phase: 'invitation' as const }],
    ['a non-waiting engine status', { status: 'playing' as const }],
    ['an old run token', { currentRun: false }],
    ['an inactive scene', { sceneActive: false }],
    ['an already accepted launch', { launchAccepted: true }],
  ])('rejects %s', (_label, override) => {
    expect(canAcceptP02Launch({ ...readyToLaunch, ...override })).toBe(false);
  });
});

describe('canCompleteP02', () => {
  it('accepts completion only after the verified exit predicates pass', () => {
    expect(canCompleteP02(readyToComplete)).toBe(true);
  });

  it.each([
    ['a missing dialogue resolution', { dialogueResolved: false }],
    ['an unaccepted launch', { launchAccepted: false }],
    ['an unfinished countdown', { countdownFinished: false }],
    ['a rocket that is still visible', { rocketOffscreen: false }],
    ['the wrong phase', { phase: 'ascent' as const }],
    ['a paused scene', { paused: true }],
    ['a non-waiting engine status', { status: 'playing' as const }],
    ['an old run token', { currentRun: false }],
    ['an inactive scene', { sceneActive: false }],
  ])('rejects %s', (_label, override) => {
    expect(canCompleteP02({ ...readyToComplete, ...override })).toBe(false);
  });
});
