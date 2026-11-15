import { Group } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InspectorModelError } from './loadDeadline';
import {
  loadInspectorModel,
  setInspectorTemplateLoader,
  type InspectorModelResource,
} from './modelResource';

afterEach(() => {
  setInspectorTemplateLoader(null);
});

describe('loadInspectorModel', () => {
  it('retries cleanly after a cancelled attempt instead of reusing its failure', async () => {
    // First attempt: cancelled before the template arrives.
    setInspectorTemplateLoader(
      (_url, signal) =>
        new Promise<Group>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    const abort = new AbortController();
    const first = loadInspectorModel({ deadlineMs: 1000, signal: abort.signal });
    abort.abort();
    await expect(first).rejects.toBeInstanceOf(Error);

    // Second attempt: a working loader must be asked again, not handed the
    // dead promise from the first try.
    const template = new Group();
    const load = vi.fn(async () => template);
    setInspectorTemplateLoader(load);
    const resource = await loadInspectorModel({ deadlineMs: 1000 });

    expect(load).toHaveBeenCalledTimes(1);
    expect(resource.scene).not.toBe(template);
  });

  it('hands back an owned clone, not the shared template', async () => {
    const template = new Group();
    template.name = 'template';
    setInspectorTemplateLoader(async () => template);

    const first = await loadInspectorModel({ deadlineMs: 1000 });
    const second = await loadInspectorModel({ deadlineMs: 1000 });

    expect(first.scene).not.toBe(template);
    expect(second.scene).not.toBe(first.scene);
    expect(first.scene.name).toBe('template');
  });

  it('disposes only its own clone, and only once', async () => {
    const template = new Group();
    const disposeTemplate = vi.spyOn(template, 'clear');
    setInspectorTemplateLoader(async () => template);

    const resource = await loadInspectorModel({ deadlineMs: 1000 });
    const sibling = await loadInspectorModel({ deadlineMs: 1000 });

    resource.dispose();
    resource.dispose();

    expect(resource.disposed).toBe(true);
    expect(sibling.disposed).toBe(false);
    expect(resource.scene.children).toHaveLength(0);
    expect(disposeTemplate).not.toHaveBeenCalled();
  });

  it('shares one template download across reopenings', async () => {
    const load = vi.fn(async () => new Group());
    setInspectorTemplateLoader(load);

    await Promise.all([
      loadInspectorModel({ deadlineMs: 1000 }),
      loadInspectorModel({ deadlineMs: 1000 }),
    ]);
    await loadInspectorModel({ deadlineMs: 1000 });

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reports a failed download as failed and does not cache it', async () => {
    const load = vi
      .fn<() => Promise<Group>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Group());
    setInspectorTemplateLoader((async () => load()) as never);

    await expect(loadInspectorModel({ deadlineMs: 1000 })).rejects.toBeInstanceOf(InspectorModelError);
    const retry = await loadInspectorModel({ deadlineMs: 1000 });
    expect(retry.disposed).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('never resolves a resource after the caller cancels', async () => {
    setInspectorTemplateLoader(
      (() => new Promise<Group>((_, reject) => setTimeout(() => reject(new Error('late')), 5))) as never,
    );
    const abort = new AbortController();
    const pending = loadInspectorModel({ deadlineMs: 1000, signal: abort.signal });
    abort.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('marks a resource as disposable even when the mount never happens', async () => {
    setInspectorTemplateLoader(async () => new Group());
    const resource: InspectorModelResource = await loadInspectorModel({ deadlineMs: 1000 });
    expect(resource.disposed).toBe(false);
    resource.dispose();
    expect(resource.disposed).toBe(true);
  });
});
