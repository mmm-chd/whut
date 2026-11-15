import { describe, expect, it } from 'vitest';
import {
  AUTO_DRAG_STAGES_MS,
  AUTO_DRAG_TOTAL_MS,
  autoDragFrame,
  autoDragPath,
  easeInOut,
  easeOut,
} from './autoDrag';

const PATH = autoDragPath({ x: 100, y: 300 }, { x: 400, y: 200 }, 800, 600);

const frameAt = (ms: number) => autoDragFrame(ms, PATH);

describe('easing', () => {
  it('starts and ends where it should', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeOut(0)).toBe(0);
    expect(easeOut(1)).toBe(1);
  });

  it('clamps out-of-range input instead of overshooting', () => {
    expect(easeInOut(-2)).toBe(0);
    expect(easeInOut(3)).toBe(1);
    expect(easeOut(Number.NaN)).toBe(0);
  });
});

describe('autoDragPath', () => {
  it('enters from the lower right corner of the picture', () => {
    expect(PATH.cursorStart.x).toBeGreaterThan(PATH.from.x);
    expect(PATH.cursorStart.y).toBeGreaterThan(PATH.from.y);
    expect(PATH.to).toEqual({ x: 400, y: 200 });
  });
});

describe('autoDragFrame', () => {
  it('never moves Percy before the hand arrives', () => {
    const frames = [0, 200, 500, AUTO_DRAG_STAGES_MS.approach - 1].map(frameAt);
    for (const frame of frames) {
      expect(frame.stage).toBe('approach');
      expect(frame.sprite).toEqual(PATH.from);
      expect(frame.gripping).toBe(false);
    }
  });

  it('walks the cursor in to Percy during the approach', () => {
    const start = frameAt(0);
    const middle = frameAt(AUTO_DRAG_STAGES_MS.approach / 2);
    const end = frameAt(AUTO_DRAG_STAGES_MS.approach - 1);

    expect(start.cursor).toEqual(PATH.cursorStart);
    expect(middle.cursor.x).toBeLessThan(start.cursor.x);
    expect(middle.cursor.y).toBeLessThan(start.cursor.y);
    expect(end.cursor.x).toBeCloseTo(PATH.from.x, 0);
    expect(end.cursor.y).toBeCloseTo(PATH.from.y, 0);
  });

  it('grips before pulling, then carries Percy with the cursor', () => {
    const grab = frameAt(AUTO_DRAG_STAGES_MS.approach + 10);
    expect(grab.stage).toBe('grab');
    expect(grab.gripping).toBe(true);
    expect(grab.sprite).toEqual(PATH.from);

    const pullStart = AUTO_DRAG_STAGES_MS.approach + AUTO_DRAG_STAGES_MS.grab;
    const midPull = frameAt(pullStart + AUTO_DRAG_STAGES_MS.pull / 2);
    expect(midPull.stage).toBe('pull');
    expect(midPull.gripping).toBe(true);
    expect(midPull.sprite).toEqual(midPull.cursor);
    expect(midPull.sprite.x).toBeGreaterThan(PATH.from.x);
    expect(midPull.sprite.y).toBeLessThan(PATH.from.y);
  });

  it('lets go on the frame centre and stays there', () => {
    const settled = frameAt(AUTO_DRAG_TOTAL_MS - 1);
    expect(settled.stage).toBe('settle');
    expect(settled.gripping).toBe(false);
    expect(settled.sprite).toEqual(PATH.to);
    expect(settled.done).toBe(false);

    const finished = frameAt(AUTO_DRAG_TOTAL_MS);
    expect(finished.done).toBe(true);
    expect(finished.sprite).toEqual(PATH.to);
    expect(frameAt(AUTO_DRAG_TOTAL_MS * 4)).toEqual(finished);
  });

  it('survives a broken clock', () => {
    const start = frameAt(Number.NaN);
    expect(start.stage).toBe('approach');
    expect(start.sprite).toEqual(PATH.from);
    expect(start.cursor).toEqual(PATH.cursorStart);
  });
});