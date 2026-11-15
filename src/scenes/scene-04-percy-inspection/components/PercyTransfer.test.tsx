import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rect } from '../layout';
import { AUTO_DRAG_TOTAL_MS, autoDragPath } from './autoDrag';
import { PercyTransfer } from './PercyTransfer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The hand-over runs by itself, and the manual drag stays as a spare: a drag
 * starts late enough to keep clicks working, and a drop only counts inside the
 * monitor content rectangle.
 */

const host: Rect = { left: 0, top: 0, width: 1280, height: 720 };
const monitor: Rect = { left: 24, top: 88, width: 912, height: 528 };
const anchor = { x: 640, y: 590 };

let container: HTMLDivElement;
let root: Root;

const sprite = () => container.querySelector<HTMLElement>('[data-transfer]');

function pointer(type: string, x: number, y: number) {
  return new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true });
}

async function render(
  onDrop: (result: { inside: boolean; normalized: { x: number; y: number } }) => void,
  options: { auto?: ReturnType<typeof autoDragPath> | null; disabled?: boolean } = {},
) {
  await act(async () => {
    root.render(
      <PercyTransfer
        host={host}
        monitor={monitor}
        anchor={anchor}
        auto={options.auto ?? null}
        disabled={options.disabled ?? false}
        onDrop={onDrop}
      />,
    );
  });
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  document.body.innerHTML = '';
});

describe('drag start', () => {
  it('does not report a drop for a press without movement', async () => {
    const onDrop = vi.fn();
    await render(onDrop);
    const element = sprite();
    await act(async () => {
      element?.dispatchEvent(pointer('pointerdown', anchor.x, anchor.y));
      element?.dispatchEvent(pointer('pointerup', anchor.x, anchor.y));
    });
    expect(onDrop).not.toHaveBeenCalled();
    expect(sprite()?.dataset.dragging).toBe('false');
  });

  it('marks the sprite as dragging once the pointer moves past the threshold', async () => {
    const onDrop = vi.fn();
    await render(onDrop);
    const element = sprite();
    await act(async () => {
      element?.dispatchEvent(pointer('pointerdown', anchor.x, anchor.y));
      element?.dispatchEvent(pointer('pointermove', anchor.x, anchor.y - 30));
    });
    expect(sprite()?.dataset.dragging).toBe('true');
  });
});

describe('drop', () => {
  it('accepts a drop inside the monitor content rectangle', async () => {
    const onDrop = vi.fn();
    await render(onDrop);
    const element = sprite();
    await act(async () => {
      element?.dispatchEvent(pointer('pointerdown', anchor.x, anchor.y));
      element?.dispatchEvent(pointer('pointermove', 600, 400));
      element?.dispatchEvent(pointer('pointermove', 500, 300));
      element?.dispatchEvent(pointer('pointerup', 500, 300));
    });
    expect(onDrop).toHaveBeenCalledTimes(1);
    const result = onDrop.mock.calls[0][0] as { inside: boolean; normalized: { x: number; y: number } };
    expect(result.inside).toBe(true);
    expect(result.normalized.x).toBeGreaterThan(0);
    expect(result.normalized.x).toBeLessThan(1);
  });

  it('rejects a drop outside the monitor and returns the sprite home', async () => {
    const onDrop = vi.fn();
    await render(onDrop);
    const element = sprite();
    await act(async () => {
      element?.dispatchEvent(pointer('pointerdown', anchor.x, anchor.y));
      element?.dispatchEvent(pointer('pointermove', 1200, 640));
      element?.dispatchEvent(pointer('pointerup', 1200, 640));
    });
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect((onDrop.mock.calls[0][0] as { inside: boolean }).inside).toBe(false);
    expect(sprite()?.style.left).toBe(`${anchor.x}px`);
    expect(sprite()?.style.top).toBe(`${anchor.y}px`);
  });

  it('drops the drag on pointercancel without reporting a drop', async () => {
    const onDrop = vi.fn();
    await render(onDrop);
    const element = sprite();
    await act(async () => {
      element?.dispatchEvent(pointer('pointerdown', anchor.x, anchor.y));
      element?.dispatchEvent(pointer('pointermove', 500, 300));
      element?.dispatchEvent(pointer('pointercancel', 500, 300));
    });
    expect(onDrop).not.toHaveBeenCalled();
    expect(sprite()?.dataset.dragging).toBe('false');
  });
});

describe('scripted carry', () => {
  const path = autoDragPath(anchor, { x: 480, y: 352 }, host.width, host.height);

  it('moves the sprite on its own and reports one drop at the frame centre', async () => {
    const onDrop = vi.fn();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    try {
      await render(onDrop, { auto: path });
      // The hand is on screen from the first frame, and Percy has not moved yet.
      expect(sprite()?.dataset.autoStage).toBe('approach');
      expect(container.querySelector('[data-hand]')).not.toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(AUTO_DRAG_TOTAL_MS + 50);
      });

      expect(onDrop).toHaveBeenCalledTimes(1);
      const result = onDrop.mock.calls[0][0] as { inside: boolean; normalized: { x: number; y: number } };
      expect(result.inside).toBe(true);
      expect(result.normalized.x).toBeCloseTo(0.5, 1);
      expect(result.normalized.y).toBeCloseTo(0.5, 1);
      expect(sprite()?.style.left).toBe(`${path.to.x}px`);
      expect(sprite()?.style.top).toBe(`${path.to.y}px`);
      // The hand leaves with the drop, so nothing floats over the frame.
      expect(sprite()?.dataset.autoStage).toBe('settle');
    } finally {
      vi.useRealTimers();
    }
  });

  it('grips Percy before he moves', async () => {
    const onDrop = vi.fn();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    try {
      await render(onDrop, { auto: path });
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(sprite()?.dataset.autoStage).toBe('grab');
      expect(sprite()?.dataset.dragging).toBe('true');
      expect(onDrop).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('is inert while the hand-over is refused, and when no path is given', async () => {
    const onDrop = vi.fn();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    try {
      await render(onDrop, { auto: path, disabled: true });
      await act(async () => {
        vi.advanceTimersByTime(AUTO_DRAG_TOTAL_MS + 50);
      });
      expect(onDrop).not.toHaveBeenCalled();
      expect(container.querySelector('[data-hand]')).toBeNull();
      expect(sprite()?.dataset.autoStage).toBe('manual');
    } finally {
      vi.useRealTimers();
    }
  });

  it('carries Percy himself, not a stand-in badge', async () => {
    await render(vi.fn());
    const art = sprite()?.querySelector<HTMLImageElement>('.p04-transfer-art');
    expect(art).not.toBeNull();
    expect(art?.getAttribute('src')).toContain('percy');
    expect(art?.getAttribute('alt')).toBe('');
    // Decorative: the accessible path is the button, not the sprite.
    expect(art?.getAttribute('draggable')).toBe('false');
    expect(sprite()?.querySelector('.p04-transfer-label')).toBeNull();
  });

  it('highlights the sprite on hover and shows the grab cursor', async () => {
    await render(vi.fn());
    expect(sprite()?.dataset.hover).toBe('false');
    expect(sprite()?.style.cursor).toContain('data:image/svg+xml');
    expect(sprite()?.style.cursor).toContain(', grab');

    await act(async () => {
      // React derives enter/leave from over/out, so the tests drive those.
      sprite()?.dispatchEvent(
        new MouseEvent('pointerover', { bubbles: true, relatedTarget: document.body }),
      );
    });
    expect(sprite()?.dataset.hover).toBe('true');

    await act(async () => {
      sprite()?.dispatchEvent(
        new MouseEvent('pointerout', { bubbles: true, relatedTarget: document.body }),
      );
    });
    expect(sprite()?.dataset.hover).toBe('false');
  });

  it('draws the carrying hand from the same cursor asset', async () => {
    const onDrop = vi.fn();
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'performance'] });
    try {
      await render(onDrop, { auto: path });
      await act(async () => {
        vi.advanceTimersByTime(AUTO_DRAG_TOTAL_MS + 50);
      });
      const hand = container.querySelector<HTMLElement>('[data-hand]');
      expect(hand).not.toBeNull();
      expect(hand?.style.backgroundImage).toContain('data:image/svg+xml');
      expect(hand?.getAttribute('aria-hidden')).toBe('true');
    } finally {
      vi.useRealTimers();
    }
  });
});
