import { describe, expect, it } from 'vitest';
import { gateDelaySeconds, readingBudgetMs } from './narrationReadiness';

describe('narration readiness', () => {
  it('gives a short line at least two seconds to read', () => {
    expect(readingBudgetMs('Percy?')).toBe(2000);
    expect(readingBudgetMs('')).toBe(2000);
  });

  it('reads at 120 words a minute for longer text', () => {
    const sixty = Array.from({ length: 60 }, () => 'word').join(' ');
    expect(readingBudgetMs(sixty)).toBe(30_000);
  });

  it('a short line over a long recording waits for the voice', () => {
    const delay = gateDelaySeconds('Oh!', 6);
    expect(delay).toBeGreaterThan(5.9);
    expect(delay).toBeLessThan(6.5);
  });

  it('a long line over a short recording waits for the reading', () => {
    const text = Array.from({ length: 30 }, () => 'word').join(' ');
    const delay = gateDelaySeconds(text, 1);
    expect(delay).toBeGreaterThan(readingBudgetMs(text) / 1000 - text.length * 0.024);
  });

  it('counts typing as time already spent, and reduced motion as none', () => {
    const text = 'Hello there Percy';
    expect(gateDelaySeconds(text, 4)).toBeLessThan(gateDelaySeconds(text, 4, { reducedMotion: true }));
  });

  it('never goes negative and ignores bad voice lengths', () => {
    expect(gateDelaySeconds('Hi', Number.NaN)).toBeGreaterThan(0);
    expect(gateDelaySeconds('Hi', -3, { tailMs: 0 })).toBeGreaterThanOrEqual(0);
  });
});
