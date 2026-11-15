import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InspectionPointId } from '../../scene-04-percy-inspection/inspectionState';
import { monitorViewport } from '../../scene-04-percy-inspection/inspector/projection';
import { INITIAL_ROTATION } from '../../scene-04-percy-inspection/inspector/rotation';
import { PartChips } from './PartChips';
import {
  CHIP_GAP_PX,
  CHIP_MARGIN_X,
  CHIP_MARGIN_Y,
  chipLayout,
  clampChipAnchor,
  separateChips,
} from './chipLayout';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const VIEWPORT = monitorViewport({ width: 1180, height: 640 });

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

async function render(overrides: Partial<Parameters<typeof PartChips>[0]> = {}) {
  const onSelect = vi.fn();
  const onHover = vi.fn();
  await act(async () => {
    root.render(
      <PartChips
        viewport={VIEWPORT}
        rotation={INITIAL_ROTATION}
        occluded={[]}
        activePoint={null}
        hoveredPoint={null}
        completed={[]}
        onHover={onHover}
        onSelect={onSelect}
        {...overrides}
      />,
    );
  });
  return { onSelect, onHover };
}

const chips = () => [...container.querySelectorAll<HTMLElement>('[data-chip]')];

describe('clampChipAnchor', () => {
  it('keeps a chip centre inside the picture margins', () => {
    const narrow = clampChipAnchor({ x: 5, y: 900 }, 470, 300);
    expect(narrow.x).toBe(CHIP_MARGIN_X);
    expect(narrow.y).toBe(300 - CHIP_MARGIN_Y);

    const wide = clampChipAnchor({ x: 900, y: -40 }, 470, 300);
    expect(wide.x).toBe(470 - CHIP_MARGIN_X);
    expect(wide.y).toBe(CHIP_MARGIN_Y);
  });

  it('leaves a chip that already fits alone, and survives a broken viewport', () => {
    expect(clampChipAnchor({ x: 200, y: 150 }, 470, 300)).toEqual({ x: 200, y: 150 });
    const broken = clampChipAnchor({ x: Number.NaN, y: Number.POSITIVE_INFINITY }, 470, 300);
    expect(Number.isFinite(broken.x)).toBe(true);
    expect(Number.isFinite(broken.y)).toBe(true);
  });
});

describe('chipLayout', () => {
  it('stays in the fixed part order, not the projected one', () => {
    const layout = chipLayout({
      viewport: VIEWPORT,
      rotation: { yaw: 2.4, pitch: 0.2 },
      occluded: [],
      activePoint: null,
      hoveredPoint: null,
      completed: [],
    });
    expect(layout.map((chip) => chip.point)).toEqual([
      'cameras',
      'microphone',
      'moxie',
      'earth-team',
    ]);
  });

  it('floats every chip outside the part it points at', () => {
    for (const chip of chipLayout({
      viewport: VIEWPORT,
      rotation: INITIAL_ROTATION,
      occluded: [],
      activePoint: null,
      hoveredPoint: null,
      completed: [],
    })) {
      expect(chip.leader.visible).toBe(true);
      expect(chip.leader.from.x).toBeCloseTo(chip.anchor.x, 6);
      expect(chip.leader.from.y).toBeCloseTo(chip.anchor.y, 6);
      expect(chip.leader.to.x).toBeCloseTo(chip.part.x, 6);
      expect(chip.leader.to.y).toBeCloseTo(chip.part.y, 6);
    }
  });
});

describe('PartChips', () => {
  it('renders four buttons in the fixed order with their hints', async () => {
    await render();
    expect(chips().map((chip) => chip.dataset.chip)).toEqual([
      'cameras',
      'microphone',
      'moxie',
      'earth-team',
    ]);
    expect(chips()[0].textContent).toContain('Cameras');
    expect(chips()[0].textContent).toContain('How Percy looks at Mars');
    expect(chips()[0].getAttribute('aria-describedby')).toBe('p05-chip-hint-cameras');
  });

  it('draws one leader per visible part with the part end marked', async () => {
    await render();
    expect(container.querySelectorAll('[data-leader]')).toHaveLength(4);
    expect(container.querySelectorAll('[data-leader] circle')).toHaveLength(4);
  });

  it('marks hover, active and done on the chip and its leader', async () => {
    await render({ hoveredPoint: 'moxie', completed: ['cameras'] });
    expect(container.querySelector('[data-chip="moxie"]')?.getAttribute('data-state')).toBe('hover');
    expect(container.querySelector('[data-leader="moxie"]')?.getAttribute('data-state')).toBe(
      'hover',
    );
    expect(container.querySelector('[data-chip="cameras"]')?.getAttribute('data-state')).toBe('done');
    await render({ activePoint: 'earth-team' });
    expect(container.querySelector('[data-chip="earth-team"]')?.getAttribute('data-state')).toBe(
      'active',
    );
    expect(container.querySelector('[data-chip="earth-team"]')?.getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('hides a chip and its line for a part turned away, but keeps the button mounted', async () => {
    await render({ occluded: ['moxie'] });
    const chip = container.querySelector<HTMLElement>('[data-chip="moxie"]');
    expect(chip?.getAttribute('data-state')).toBe('hidden');
    expect(chip?.tagName).toBe('BUTTON');
    expect(container.querySelector('[data-leader="moxie"]')).toBeNull();
    // Tab order still has four stops.
    expect(chips()).toHaveLength(4);
  });

  it('opens a part and returns the control that opened it', async () => {
    const opened: [InspectionPointId, HTMLElement | null][] = [];
    await render({ onSelect: (point, control) => opened.push([point, control]) });
    await act(async () => {
      container.querySelector<HTMLElement>('[data-chip="cameras"]')?.click();
    });
    expect(opened).toHaveLength(1);
    expect(opened[0][0]).toBe('cameras');
    expect(opened[0][1]?.getAttribute('data-chip')).toBe('cameras');
  });

  it('reports hover from pointer and focus alike', async () => {
    const { onHover } = await render();
    const chip = container.querySelector<HTMLElement>('[data-chip="microphone"]');

    // React's enter/leave handlers are driven by the bubbling over/out pair.
    await act(async () => {
      chip?.dispatchEvent(new PointerEvent('pointerover', { bubbles: true }));
    });
    expect(onHover).toHaveBeenCalledWith('microphone');

    onHover.mockClear();
    await act(async () => {
      chip?.focus();
    });
    expect(onHover).toHaveBeenCalledWith('microphone');

    onHover.mockClear();
    await act(async () => {
      chip?.blur();
    });
    expect(onHover).toHaveBeenCalledWith(null);
  });
});

describe('separateChips', () => {
  it('slides a later chip out of the way of an earlier one at the same height', () => {
    const placed = separateChips(
      [
        { point: 'cameras', anchor: { x: 300, y: 130 } },
        { point: 'microphone', anchor: { x: 300, y: 130 } },
      ],
      true,
      300,
    );
    expect(placed[1].anchor.y).toBeGreaterThan(placed[0].anchor.y);
    expect(placed[1].anchor.y - placed[0].anchor.y).toBeGreaterThanOrEqual(44 + CHIP_GAP_PX - 1);
  });

  it('leaves chips that already fit alone and keeps the fixed order', () => {
    const placed = separateChips(
      [
        { point: 'cameras', anchor: { x: 120, y: 40 } },
        { point: 'microphone', anchor: { x: 320, y: 40 } },
        { point: 'moxie', anchor: { x: 120, y: 220 } },
        { point: 'earth-team', anchor: { x: 320, y: 220 } },
      ],
      true,
      300,
    );
    expect(placed.map((chip) => chip.point)).toEqual(['cameras', 'microphone', 'moxie', 'earth-team']);
    expect(placed[1].anchor).toEqual({ x: 320, y: 40 });
    expect(placed[3].anchor).toEqual({ x: 320, y: 220 });
  });

  it('never pushes a chip out of the picture', () => {
    const placed = separateChips(
      [
        { point: 'cameras', anchor: { x: 300, y: 250 } },
        { point: 'microphone', anchor: { x: 300, y: 250 } },
        { point: 'earth-team', anchor: { x: 300, y: 250 } },
      ],
      true,
      300,
    );
    for (const chip of placed) {
      expect(chip.anchor.y).toBeGreaterThanOrEqual(CHIP_MARGIN_Y);
      expect(chip.anchor.y).toBeLessThanOrEqual(300 - CHIP_MARGIN_Y);
    }
  });
});
