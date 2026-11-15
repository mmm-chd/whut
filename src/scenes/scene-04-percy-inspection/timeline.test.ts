import gsap from 'gsap';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { layoutP04 } from './layout';
import { createP04Nodes, type P04Nodes } from './nodes';
import type { P04Phase } from './state';
import { createP04Driver, type P04Driver, type P04Gate } from './timeline';

/**
 * The two clocks must stay independent: a dialogue gate pauses narration, not
 * travel, while a presentation pause stops everything and stays stopped.
 */

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.wake();
});

interface Recorder {
  readonly driver: P04Driver;
  readonly nodes: P04Nodes;
  activeLine: string;
  phases: P04Phase[];
  gates: string[];
  faded: number;
  advance: (seconds: number) => Promise<void>;
}

function record(options: { resolved?: readonly string[]; reducedMotion?: boolean } = {}): Recorder {
  const nodes = createP04Nodes(layoutP04(1920, 1080), options.reducedMotion ?? false);
  const resolved = new Set<string>(options.resolved ?? []);
  const state = {
    activeLine: '',
    phases: [] as P04Phase[],
    gates: [] as string[],
    faded: 0,
  };
  const driver = createP04Driver({
    nodes,
    reducedMotion: options.reducedMotion ?? false,
    onPhase: (phase) => state.phases.push(phase),
    onCue: (id) => {
      state.activeLine = id;
    },
    onGate: (gate: P04Gate) => state.gates.push(gate.lineId),
    onExitFadeFinished: () => {
      state.faded += 1;
    },
    isDialogueResolved: (id) => resolved.has(id),
  });

  const advance = async (seconds: number): Promise<void> => {
    gsap.globalTimeline.totalTime(gsap.globalTimeline.totalTime() + seconds, false);
    await Promise.resolve();
  };

  return Object.assign(state, { driver, nodes, advance });
}

describe('independent travel and presentation pause', () => {
  it('keeps travelling under a manual dialogue hold and freezes on presentation pause', async () => {
    gsap.ticker.sleep();
    const run = record({ resolved: ['p04-narrator-01'] });
    try {
      run.driver.play();
      for (let i = 0; i < 400 && run.activeLine !== 'p04-narrator-02'; i += 1) {
        await run.advance(0.1);
      }
      expect(run.activeLine).toBe('p04-narrator-02');
      await run.advance(0.1); // reach the cue's +0.01 s gate
      expect(run.gates).toContain('p04-narrator-02');

      const x = run.nodes.percy.body.x;
      await run.advance(2);
      // The narrative is held; the rover is not.
      expect(run.activeLine).toBe('p04-narrator-02');
      expect(run.nodes.percy.body.x).toBeGreaterThan(x);

      run.driver.setPresentationPaused(true);
      const heldX = run.nodes.percy.body.x;
      await run.advance(2);
      expect(run.nodes.percy.body.x).toBe(heldX);
    } finally {
      run.driver.dispose();
    }
  });
});

describe('phases and cues', () => {
  it('walks entry through invitation, then waits with the story', async () => {
    gsap.ticker.sleep();
    const run = record();
    try {
      run.driver.play();
      // The beats are spaced by the recordings, so the whole walk is ~50 s.
      for (let i = 0; i < 900 && run.driver.phase() !== 'awaiting-inspection'; i += 1) {
        await run.advance(0.1);
        // Simulate a reader pressing Continue promptly at every gate.
        if (run.gates.length > 0) {
          const last = run.gates[run.gates.length - 1];
          run.driver.releaseDialogue(last);
        }
      }
      expect(run.phases).toEqual([
        'entry',
        'distance',
        'dimensions',
        'wheels',
        'invitation',
        'awaiting-inspection',
      ]);
      // The walk is bounded: it can end up anywhere short of the invitation
      // stop (the reader's pacing does not change where it stops), and lands
      // exactly there once the travel clock has run its full span.
      expect(run.nodes.percy.body.x).toBeGreaterThan(0);
      expect(run.nodes.percy.body.x).toBeLessThanOrEqual(860);
      await run.advance(3);
      expect(run.nodes.percy.body.x).toBeCloseTo(860);
      expect(run.nodes.annotation.value).toBe('none');
    } finally {
      run.driver.dispose();
    }
  });
});

describe('the hand-over latch', () => {
  const atAwaitingInspection = async (): Promise<Recorder> => {
    gsap.ticker.sleep();
    const run = record({
      resolved: ['p04-narrator-01', 'p04-narrator-02', 'p04-narrator-03', 'p04-narrator-04'],
    });
    run.driver.play();
    // The beats are spaced by the recordings, so the whole walk is ~50 s.
      for (let i = 0; i < 900 && run.driver.phase() !== 'awaiting-inspection'; i += 1) {
      await run.advance(0.1);
    }
    return run;
  };

  it('refuses to hand over before the invitation is over', () => {
    gsap.ticker.sleep();
    const run = record();
    try {
      expect(run.driver.beginHandoff()).toBe(false);
      expect(run.driver.phase()).toBe('entry');
    } finally {
      run.driver.dispose();
    }
  });

  it('hands over once: handoff, then exit, then the finished fade', async () => {
    const run = await atAwaitingInspection();
    try {
      expect(run.driver.phase()).toBe('awaiting-inspection');
      expect(run.driver.beginHandoff()).toBe(true);
      expect(run.driver.beginHandoff()).toBe(false);
      await run.advance(0.5);
      expect(run.phases).toContain('handoff');
      expect(run.nodes.percy.body.opacity).toBeCloseTo(0, 1);
      await run.advance(1);
      expect(run.phases).toContain('exit');
      // The driver never sets `done` itself: completion belongs to the guard.
      expect(run.phases).not.toContain('done');
      expect(run.faded).toBe(1);
      expect(run.nodes.fade.opacity).toBeCloseTo(1, 1);
      // Percy is carried in, not rolled back: he leaves where the walk stopped.
      expect(run.nodes.percy.body.x).toBeCloseTo(860);
    } finally {
      run.driver.dispose();
    }
  });

  it('runs both stages at once when motion is reduced', async () => {
    gsap.ticker.sleep();
    const run = record({
      reducedMotion: true,
      resolved: ['p04-narrator-01', 'p04-narrator-02', 'p04-narrator-03', 'p04-narrator-04'],
    });
    try {
      run.driver.play();
      // The beats are spaced by the recordings, so the whole walk is ~50 s.
      for (let i = 0; i < 900 && run.driver.phase() !== 'awaiting-inspection'; i += 1) {
        await run.advance(0.1);
      }
      expect(run.driver.beginHandoff()).toBe(true);
      await run.advance(0.4);
      expect(run.phases).toContain('exit');
      expect(run.faded).toBe(1);
    } finally {
      run.driver.dispose();
    }
  });
});

describe('teardown', () => {
  it('stops every clock on dispose', async () => {
    gsap.ticker.sleep();
    const run = record();
    run.driver.play();
    await run.advance(3);
    const x = run.nodes.percy.body.x;
    expect(x).toBeGreaterThan(0);

    run.driver.dispose();
    await run.advance(3);
    expect(run.nodes.percy.body.x).toBe(x);
    expect(run.driver.isRunning()).toBe(false);
  });

  it('ignores a release for a gate that is not held', async () => {
    gsap.ticker.sleep();
    const run = record();
    try {
      const spy = vi.fn();
      run.driver.play();
      await run.advance(1.2);
      run.driver.releaseDialogue('p04-narrator-99');
      spy();
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      run.driver.dispose();
    }
  });

  it('spaces the beats by the recordings, never by a fixed gap', async () => {
    // Once the voice-over was mapped, a fixed 3.2 s beat stopped the 14 s and
    // 24 s lines after three seconds. Each beat now starts only after the
    // previous recording has finished, so this holds the spacing down.
    const { P04_BEAT_TIMES: beats } = await import('./timeline');
    const { p04VoiceSeconds } = await import('./dialogue');
    const gaps = [
      [beats.first, beats.second, 'p04-narrator-01'],
      [beats.second, beats.third, 'p04-narrator-02'],
      [beats.third, beats.invitation, 'p04-narrator-03'],
    ] as const;

    for (const [from, to, lineId] of gaps) {
      expect(to - from).toBeGreaterThanOrEqual(p04VoiceSeconds(lineId));
    }
    expect(beats.invitation).toBeGreaterThan(beats.third);
    expect(beats.awaiting).toBeGreaterThan(beats.invitation);
    // The last two lines really are long, which is why this matters.
    expect(p04VoiceSeconds('p04-narrator-02')).toBeGreaterThan(10);
    expect(p04VoiceSeconds('p04-narrator-03')).toBeGreaterThan(20);
  });
});
