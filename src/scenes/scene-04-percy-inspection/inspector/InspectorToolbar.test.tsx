import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectorToolbar } from './InspectorToolbar';
import type { InspectorRotationApi } from './useInspectorRotation';
import { INITIAL_ROTATION } from './rotation';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

function api(): InspectorRotationApi & Record<'left' | 'right' | 'up' | 'down' | 'reset', ReturnType<typeof vi.fn>> {
  const left = vi.fn();
  const right = vi.fn();
  const up = vi.fn();
  const down = vi.fn();
  const reset = vi.fn();
  return {
    rotation: INITIAL_ROTATION,
    rotateBy: vi.fn(),
    rotateLeft: left,
    rotateRight: right,
    tiltUp: up,
    tiltDown: down,
    reset,
    left,
    right,
    up,
    down,
  };
}

async function render(rotation: InspectorRotationApi) {
  await act(async () => {
    root.render(<InspectorToolbar rotation={rotation} />);
  });
}

const button = (label: string) =>
  [...container.querySelectorAll('button')].find((element) => element.textContent === label);

describe('InspectorToolbar', () => {
  it('offers the five named controls in reading order', async () => {
    await render(api());
    expect([...container.querySelectorAll('button')].map((element) => element.textContent)).toEqual([
      'Rotate left',
      'Rotate right',
      'Tilt up',
      'Tilt down',
      'Reset view',
    ]);
    expect(container.querySelector('[role="group"]')?.getAttribute('aria-label')).toBe('Turn the rover');
  });

  it('drives the same rotation the pointer does', async () => {
    const rotation = api();
    await render(rotation);

    for (const [label, spy] of [
      ['Rotate left', rotation.left],
      ['Rotate right', rotation.right],
      ['Tilt up', rotation.up],
      ['Tilt down', rotation.down],
      ['Reset view', rotation.reset],
    ] as const) {
      await act(async () => {
        button(label)?.click();
      });
      expect(spy).toHaveBeenCalledTimes(1);
    }
  });
});
