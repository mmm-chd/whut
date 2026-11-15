import type { Group } from 'three';
import { InspectorModelError, withModelDeadline } from './loadDeadline';
import { INSPECTOR_LOAD_DEADLINE_MS, INSPECTOR_MODEL_URL } from './modelConfig';

/**
 * One owned copy of the rover model for the inspector.
 *
 * The parsed template is cached per URL; every request gets its own clone, so
 * a card or a rerun can never dispose a scene another view is still drawing.
 * Geometry and materials belong to the template — `dispose()` releases only
 * this clone's place in the graph.
 */
export interface InspectorModelResource {
  readonly scene: Group;
  /** True once `dispose()` ran; a disposed resource must not be mounted. */
  readonly disposed: boolean;
  dispose(): void;
}

type TemplateLoader = (url: string, signal: AbortSignal) => Promise<Group>;

const templates = new Map<string, Promise<Group>>();

/** Test seam: swap the network/parse step without a GL stack. */
let templateLoader: TemplateLoader | null = null;

export function setInspectorTemplateLoader(loader: TemplateLoader | null): void {
  templateLoader = loader;
  templates.clear();
}

async function defaultTemplateLoader(url: string, signal: AbortSignal): Promise<Group> {
  const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
  ]);
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new InspectorModelError('failed', `Inspector model request failed (${response.status}).`);
  }
  const buffer = await response.arrayBuffer();
  const draco = new DRACOLoader();
  draco.setDecoderPath(`${import.meta.env.BASE_URL}draco/`);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await loader.parseAsync(buffer, '');
  return gltf.scene;
}

export interface LoadInspectorModelOptions {
  readonly url?: string;
  readonly deadlineMs?: number;
  readonly signal?: AbortSignal;
}

/**
 * Load the inspector model, giving up after the deadline.
 *
 * A cancelled or timed-out load leaves no cached promise behind, so a retry is
 * a real retry rather than a repeat of the same failure.
 */
export function loadInspectorModel(
  options: LoadInspectorModelOptions = {},
): Promise<InspectorModelResource> {
  const url = options.url ?? INSPECTOR_MODEL_URL;
  const deadlineMs = options.deadlineMs ?? INSPECTOR_LOAD_DEADLINE_MS;
  const load = templateLoader ?? defaultTemplateLoader;

  return withModelDeadline(async (signal) => {
    let template = templates.get(url);
    if (!template) {
      const created = load(url, signal);
      templates.set(url, created);
      const forget = () => {
        if (templates.get(url) === created) {
          templates.delete(url);
        }
      };
      created.catch(forget);
      // A cancelled attempt must not poison the retry: the reader who resizes
      // the window mid-download would otherwise be stuck in the 2D fallback.
      signal.addEventListener('abort', forget, { once: true });
      template = created;
    }
    const scene = await template;
    const clone = scene.clone(true);
    let disposed = false;
    return {
      scene: clone,
      get disposed() {
        return disposed;
      },
      dispose() {
        if (disposed) {
          return;
        }
        disposed = true;
        clone.removeFromParent();
        clone.clear();
      },
    } satisfies InspectorModelResource;
  }, { deadlineMs, signal: options.signal });
}
