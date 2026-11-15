import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Group } from 'three';
import { InspectorModelError } from './loadDeadline';
import type { InspectorModelResource } from './modelResource';
import {
  hasWebGL2,
  resetWebGLSupportProbe,
  useInspectorRenderer,
  type InspectorRendererApi,
} from './useInspectorRenderer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function fakeResource(): InspectorModelResource {
  const scene = new Group();
  let disposed = false;
  return {
    scene,
    get disposed() {
      return disposed;
    },
    dispose() {
      disposed = true;
    },
  };
}

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;
let latest: InspectorRendererApi | null = null;

async function mount(options: Parameters<typeof useInspectorRenderer>[0]) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  latest = null;
  function Harness() {
    latest = useInspectorRenderer(options);
    return null;
  }
  await act(async () => {
    root?.render(<Harness />);
  });
  return () => {
    if (!latest) {
      throw new Error('hook never rendered');
    }
    return latest;
  };
}

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  latest = null;
});

describe('useInspectorRenderer', () => {
  it('waits for the monitor before touching the model', async () => {
    const load = vi.fn(async () => fakeResource());
    const api = await mount({ active: false, webglAvailable: true, load });
    expect(api().renderer).toBe('loading');
    expect(load).not.toHaveBeenCalled();
  });

  it('shows the model when the download wins', async () => {
    const settled = vi.fn();
    const api = await mount({
      active: true,
      webglAvailable: true,
      load: async () => fakeResource(),
      onSettled: settled,
    });
    expect(api().renderer).toBe('3d');
    expect(api().resource).not.toBeNull();
    expect(settled).toHaveBeenCalledWith('3d');
  });

  it('falls back at once without WebGL, and never downloads', async () => {
    const load = vi.fn(async () => fakeResource());
    const settled = vi.fn();
    const api = await mount({ active: true, webglAvailable: false, load, onSettled: settled });
    expect(api().renderer).toBe('2d-fallback');
    expect(api().reason).toBe('no-webgl');
    expect(load).not.toHaveBeenCalled();
    expect(settled).toHaveBeenCalledWith('2d-fallback');
  });

  it('falls back on a timeout', async () => {
    const api = await mount({
      active: true,
      webglAvailable: true,
      load: async () => {
        throw new InspectorModelError('timeout', 'too slow');
      },
    });
    expect(api().renderer).toBe('2d-fallback');
    expect(api().reason).toBe('timeout');
  });

  it('falls back on a parse failure', async () => {
    const api = await mount({
      active: true,
      webglAvailable: true,
      load: async () => {
        throw new Error('bad glb');
      },
    });
    expect(api().renderer).toBe('2d-fallback');
    expect(api().reason).toBe('failed');
  });

  it('ignores a model that arrives after the fallback', async () => {
    let release: ((resource: InspectorModelResource) => void) | null = null;
    const late = fakeResource();
    const api = await mount({
      active: true,
      webglAvailable: true,
      load: () =>
        new Promise<InspectorModelResource>((resolve) => {
          release = resolve;
        }),
    });
    expect(api().renderer).toBe('loading');
    await act(async () => {
      api().reportContextLost();
    });
    expect(api().renderer).toBe('2d-fallback');
    await act(async () => {
      release?.(late);
      await Promise.resolve();
    });
    expect(api().renderer).toBe('2d-fallback');
    // The late clone is released rather than mounted.
    expect(late.disposed).toBe(true);
  });

  it('releases the model when the monitor closes', async () => {
    const resource = fakeResource();
    const api = await mount({ active: true, webglAvailable: true, load: async () => resource });
    expect(api().renderer).toBe('3d');
    await act(async () => {
      root?.unmount();
    });
    root = null;
    expect(resource.disposed).toBe(true);
  });
});

describe('the WebGL support probe', () => {
  it('asks the browser once and remembers the answer', async () => {
    // A probe is a real context. Asking per render — which a default parameter
    // does — exhausted the page's context allowance while the reader turned the
    // model, and the browser dropped the canvas itself.
    resetWebGLSupportProbe();
    const create = vi.spyOn(document, 'createElement');
    const answers = [hasWebGL2(), hasWebGL2(), hasWebGL2(), hasWebGL2()];
    expect(new Set(answers).size).toBe(1);
    const probes = create.mock.calls.filter(([tag]) => String(tag) === 'canvas').length;
    expect(probes).toBeLessThanOrEqual(1);
    create.mockRestore();
    resetWebGLSupportProbe();
  });
});
