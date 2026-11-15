/**
 * Deadline and cancellation for the inspector model.
 *
 * The 3D model is optional: a slow download, a parse failure or a lost context
 * must never keep the four readable parts waiting. Everything here is plain
 * promises so the rules can be tested without a browser or a GL stack.
 */

export type InspectorLoadFailureKind = 'timeout' | 'aborted' | 'failed';

export class InspectorModelError extends Error {
  readonly kind: InspectorLoadFailureKind;

  constructor(kind: InspectorLoadFailureKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'InspectorModelError';
    this.kind = kind;
  }
}

export interface ModelDeadlineOptions {
  readonly deadlineMs: number;
  readonly signal?: AbortSignal;
}

/**
 * Run `start` with an abortable signal and give up after `deadlineMs`.
 *
 * A late result is dropped: the returned promise has already settled, so a
 * finished download can never remount the 3D view after the fallback won.
 */
export function withModelDeadline<T>(
  start: (signal: AbortSignal) => Promise<T>,
  options: ModelDeadlineOptions,
): Promise<T> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', forwardAbort, { once: true });
    }
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (settle: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      options.signal?.removeEventListener('abort', forwardAbort);
      settle();
    };

    const fail = (kind: InspectorLoadFailureKind, message: string, cause?: unknown) =>
      finish(() => {
        controller.abort();
        reject(new InspectorModelError(kind, message, cause === undefined ? undefined : { cause }));
      });

    if (controller.signal.aborted) {
      fail('aborted', 'Inspector load was cancelled before it started.');
      return;
    }

    timer = setTimeout(() => {
      fail('timeout', `Inspector model did not arrive within ${options.deadlineMs} ms.`);
    }, options.deadlineMs);

    options.signal?.addEventListener(
      'abort',
      () => fail('aborted', 'Inspector load was cancelled.'),
      { once: true },
    );

    start(controller.signal).then(
      (value) => finish(() => resolve(value)),
      (error: unknown) =>
        fail('failed', error instanceof Error ? error.message : String(error), error),
    );
  });
}
