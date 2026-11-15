import { useCallback, useEffect, useRef, useState } from 'react';
import { InspectorModelError } from './loadDeadline';
import type { InspectorModelResource } from './modelResource';
import { loadInspectorModel } from './modelResource';

/**
 * Which inspector the monitor shows.
 *
 * The four readable parts never depend on this: every failure ends in the 2D
 * fallback, which keeps the same buttons and the same copy. Once the fallback
 * wins, a late download is dropped — the 3D view cannot replace a picture the
 * reader is already using.
 */
export type InspectorRendererState = 'loading' | '3d' | '2d-fallback';

export type InspectorFallbackReason = 'no-webgl' | 'timeout' | 'failed' | 'context-lost';

export interface InspectorRendererOptions {
  /**
   * Loading is allowed: the invitation is on screen, so the reader is about to
   * open the monitor. Nothing is drawn until the monitor exists.
   */
  readonly active: boolean;
  /** False in jsdom, in a locked-down browser, or after a lost context. */
  readonly webglAvailable?: boolean;
  readonly load?: (signal: AbortSignal) => Promise<InspectorModelResource>;
  /** Called once, when loading ends in either a model or a fallback. */
  readonly onSettled?: (renderer: '3d' | '2d-fallback') => void;
}

export interface InspectorRendererApi {
  readonly renderer: InspectorRendererState;
  readonly resource: InspectorModelResource | null;
  readonly reason: InspectorFallbackReason | null;
  /** The canvas lost its context: keep the fallback rather than retrying blind. */
  reportContextLost: () => void;
}

/**
 * Whether this browser can give us WebGL2.
 *
 * Asked once and remembered: a probe is a real WebGL context, and browsers keep
 * a small number of them alive per page (Chromium about sixteen). Asking again
 * on every render — which is exactly what a default parameter does — created a
 * context per pointer move while the reader turned the model, and the browser
 * began dropping the oldest, which was the canvas itself. The rover blinked
 * out, the context came back, and the cycle repeated.
 *
 * The probe releases its own context immediately, so a cached answer costs
 * nothing either.
 */
let webgl2Support: boolean | null = null;

/** Test seam: forget the remembered answer. */
export function resetWebGLSupportProbe(): void {
  webgl2Support = null;
}

export function hasWebGL2(): boolean {
  if (webgl2Support !== null) {
    return webgl2Support;
  }
  if (typeof document === 'undefined') {
    return false;
  }
  if (typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  try {
    const probe = document.createElement('canvas');
    const context = probe.getContext('webgl2');
    const supported = Boolean(context);
    // Hand the probe's context back before forgetting the canvas: a probe is
    // worth a question, not a slot out of the page's small allowance.
    const gl = context as WebGL2RenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    webgl2Support = supported;
    return supported;
  } catch {
    webgl2Support = false;
    return false;
  }
}

export function useInspectorRenderer(options: InspectorRendererOptions): InspectorRendererApi {
  const { active, webglAvailable = hasWebGL2(), onSettled } = options;
  const [renderer, setRenderer] = useState<InspectorRendererState>('loading');
  const [resource, setResource] = useState<InspectorModelResource | null>(null);
  const [reason, setReason] = useState<InspectorFallbackReason | null>(null);
  const settledRef = useRef(false);
  const defaultLoad = useCallback((signal: AbortSignal) => loadInspectorModel({ signal }), []);
  const loadInspector = options.load ?? defaultLoad;
  const loadRef = useRef(loadInspector);
  const onSettledRef = useRef(onSettled);

  // The newest callback is read from a ref, so the run effect never restarts
  // just because a parent re-rendered with a new closure.
  useEffect(() => {
    loadRef.current = loadInspector;
    onSettledRef.current = onSettled;
  }, [loadInspector, onSettled]);

  const settle = useCallback((next: '3d' | '2d-fallback', fallbackReason: InspectorFallbackReason | null) => {
    if (settledRef.current) {
      return;
    }
    settledRef.current = true;
    setRenderer(next);
    setReason(fallbackReason);
    onSettledRef.current?.(next);
  }, []);

  useEffect(() => {
    // Nothing to load before the invitation, and the picture never changes
    // once it has settled: the scene remounts for a new run.
    if (!active || settledRef.current) {
      return;
    }
    if (!webglAvailable) {
      settle('2d-fallback', 'no-webgl');
      return;
    }

    const abort = new AbortController();
    let current = true;
    loadRef.current(abort.signal).then(
      (loaded) => {
        if (!current || settledRef.current) {
          // The fallback already won, or the monitor closed: drop the download.
          loaded.dispose();
          return;
        }
        setResource(loaded);
        settle('3d', null);
      },
      (error: unknown) => {
        if (!current || settledRef.current) {
          return;
        }
        if (error instanceof InspectorModelError && error.kind === 'aborted') {
          return;
        }
        settle('2d-fallback', error instanceof InspectorModelError && error.kind === 'timeout' ? 'timeout' : 'failed');
      },
    );

    return () => {
      current = false;
      abort.abort();
    };
  }, [active, settle, webglAvailable]);

  // The clone is owned by this hook, so exactly one place releases it.
  useEffect(() => {
    if (!resource) {
      return;
    }
    return () => {
      resource.dispose();
    };
  }, [resource]);

  const reportContextLost = useCallback(() => {
    settle('2d-fallback', 'context-lost');
  }, [settle]);

  return { renderer, resource, reason, reportContextLost };
}
