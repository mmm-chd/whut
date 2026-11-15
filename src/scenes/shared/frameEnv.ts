/**
 * The clock and frame queue a scene driver runs on. The browser version uses
 * `requestAnimationFrame` and `performance.now`; tests pass their own, so a
 * driver can be stepped without waiting.
 */
export interface FrameEnv {
  now: () => number;
  request: (callback: () => void) => number;
  cancel: (id: number) => void;
}

export const browserFrameEnv: FrameEnv = {
  now: () => performance.now(),
  request: (callback) => window.requestAnimationFrame(callback),
  cancel: (id) => window.cancelAnimationFrame(id),
};
