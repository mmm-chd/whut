import { describe, expect, it } from 'vitest';
import {
  canTurn,
  clampIndex,
  COMMIT_PROGRESS,
  COMMIT_VELOCITY,
  pageAnnouncement,
  shouldCommitTurn,
  spreadAnnouncement,
  turnAllowed,
} from './nav';

describe('book navigation', () => {
  it('clamps spread indexes to the book', () => {
    expect(clampIndex(-2, 2)).toBe(0);
    expect(clampIndex(0, 2)).toBe(0);
    expect(clampIndex(1, 2)).toBe(1);
    expect(clampIndex(9, 2)).toBe(1);
    expect(clampIndex(3, 0)).toBe(0);
  });

  it('only turns when another spread exists', () => {
    expect(canTurn(0, -1, 2)).toBe(false);
    expect(canTurn(0, 1, 2)).toBe(true);
    expect(canTurn(1, -1, 2)).toBe(true);
    expect(canTurn(1, 1, 2)).toBe(false);
  });

  it('ignores input while a leaf is already moving', () => {
    expect(turnAllowed(false)).toBe(true);
    expect(turnAllowed(true)).toBe(false);
  });

  it('commits a drag past the position threshold or on a quick flick', () => {
    expect(shouldCommitTurn(COMMIT_PROGRESS, 0)).toBe(true);
    expect(shouldCommitTurn(0.9, 0)).toBe(true);
    expect(shouldCommitTurn(0.1, COMMIT_VELOCITY)).toBe(true);
    expect(shouldCommitTurn(0.1, -0.9)).toBe(true);
    expect(shouldCommitTurn(0.2, 0.1)).toBe(false);
  });

  it('announces the settled spread or single page', () => {
    expect(spreadAnnouncement(0, 2, 'Percy, The Mars Rover')).toBe(
      'Spread 1 of 2: Percy, The Mars Rover',
    );
    expect(spreadAnnouncement(1, 2, 'Ginny, The Mars Helicopter')).toBe(
      'Spread 2 of 2: Ginny, The Mars Helicopter',
    );
    expect(pageAnnouncement(2, 4, 'left', 'Ginny, The Mars Helicopter')).toBe(
      'Page 3 of 4, left page: Ginny, The Mars Helicopter',
    );
  });
});
