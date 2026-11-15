import { useEffect, useRef } from 'react';

/**
 * A timer for one authored beat that freezes while the story is paused.
 *
 * `key` identifies the beat: a new key restarts the full duration, while a
 * pause and resume of the same key continues with what was left, so pausing
 * mid-transfer never skips or repeats it. `onDone` runs at most once per key.
 */
export function usePhaseTimer(
  key: string | null,
  durationMs: number,
  paused: boolean,
  onDone: () => void,
): void {
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  const beat = useRef<{ key: string | null; remaining: number; fired: boolean }>({
    key: null,
    remaining: 0,
    fired: false,
  });

  useEffect(() => {
    if (key === null) {
      beat.current = { key: null, remaining: 0, fired: false };
      return;
    }
    if (beat.current.key !== key) {
      beat.current = { key, remaining: durationMs, fired: false };
    }
    if (paused || beat.current.fired) {
      return;
    }

    const startedAt = performance.now();
    const timer = window.setTimeout(() => {
      beat.current.fired = true;
      beat.current.remaining = 0;
      doneRef.current();
    }, Math.max(0, beat.current.remaining));

    return () => {
      window.clearTimeout(timer);
      if (!beat.current.fired) {
        beat.current.remaining = Math.max(0, beat.current.remaining - (performance.now() - startedAt));
      }
    };
  }, [durationMs, key, paused]);
}
