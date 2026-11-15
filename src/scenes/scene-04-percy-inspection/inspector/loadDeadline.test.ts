import { describe, expect, it, vi } from 'vitest';
import { InspectorModelError, withModelDeadline } from './loadDeadline';

function rejection(promise: Promise<unknown>): Promise<InspectorModelError> {
  return promise.then(
    () => {
      throw new Error('expected a rejection');
    },
    (error: unknown) => {
      if (error instanceof InspectorModelError) {
        return error;
      }
      throw error;
    },
  );
}

describe('withModelDeadline', () => {
  it('resolves with the work that finishes in time', async () => {
    await expect(withModelDeadline(async () => 'model', { deadlineMs: 1000 })).resolves.toBe('model');
  });

  it('gives up after the deadline and aborts the download', async () => {
    vi.useFakeTimers();
    try {
      let sawAbort = false;
      const pending = withModelDeadline(
        (signal) =>
          new Promise<string>(() => {
            signal.addEventListener('abort', () => {
              sawAbort = true;
            });
          }),
        { deadlineMs: 10_000 },
      );
      const settled = rejection(pending);
      await vi.advanceTimersByTimeAsync(10_000);
      const error = await settled;
      expect(error.kind).toBe('timeout');
      expect(sawAbort).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a model that arrives after the deadline', async () => {
    vi.useFakeTimers();
    try {
      const late: { resolve: (value: string) => void } = { resolve: () => {} };
      const pending = withModelDeadline(
        () =>
          new Promise<string>((resolve) => {
            late.resolve = resolve;
          }),
        { deadlineMs: 500 },
      );
      const settled = rejection(pending);
      await vi.advanceTimersByTimeAsync(500);
      const error = await settled;
      expect(error.kind).toBe('timeout');
      late.resolve('too late');
      await vi.advanceTimersByTimeAsync(0);
      // The promise already rejected; the late value is silently dropped.
      await expect(pending).rejects.toBeInstanceOf(InspectorModelError);
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels when the caller leaves before the model arrives', async () => {
    const abort = new AbortController();
    const pending = withModelDeadline(
      (signal) =>
        new Promise<string>((_, rejectWork) => {
          signal.addEventListener('abort', () => rejectWork(new DOMException('aborted', 'AbortError')));
        }),
      { deadlineMs: 10_000, signal: abort.signal },
    );
    const settled = rejection(pending);
    abort.abort();
    const error = await settled;
    expect(error.kind).toBe('aborted');
  });

  it('rejects at once when the caller already left', async () => {
    const abort = new AbortController();
    abort.abort();
    const start = vi.fn(async () => 'model');
    const error = await rejection(
      withModelDeadline(start, { deadlineMs: 10_000, signal: abort.signal }),
    );
    expect(error.kind).toBe('aborted');
    expect(start).not.toHaveBeenCalled();
  });

  it('reports a parse or fetch failure as failed', async () => {
    const error = await rejection(
      withModelDeadline(
        async () => {
          throw new Error('bad glb');
        },
        { deadlineMs: 10_000 },
      ),
    );
    expect(error.kind).toBe('failed');
    expect(error.message).toBe('bad glb');
  });
});
