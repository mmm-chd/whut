import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InspectionCard } from './InspectionCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * The cards are part of the readable page: not a dialog, no backdrop, and
 * closing one puts the reader back on the control they used.
 */

interface Harness {
  container: HTMLDivElement;
  root: Root;
  render: (props?: Partial<Parameters<typeof InspectionCard>[0]>) => Promise<void>;
  unmount: () => Promise<void>;
}

let harness: Harness;

function createHarness(): Harness {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const render: Harness['render'] = async (props) => {
    await act(async () => {
      root.render(
        <InspectionCard
          point="cameras"
          title="Cameras"
          category={props?.category}
          media={props?.media}
          discovered={props?.discovered}
          onClose={props?.onClose ?? (() => {})}
          returnFocusTo={props?.returnFocusTo ?? null}
        >
          <p>Percy carries a set of cameras that work together.</p>
        </InspectionCard>,
      );
    });
  };
  return {
    container,
    root,
    render,
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

const card = () => harness.container.querySelector<HTMLElement>('[data-inspection-card]');

beforeEach(() => {
  harness = createHarness();
});

afterEach(async () => {
  await harness.unmount();
  document.body.innerHTML = '';
});

describe('card structure', () => {
  it('is a labelled region, not a dialog', async () => {
    await harness.render();
    const element = card();
    expect(element).not.toBeNull();
    expect(element?.getAttribute('role')).not.toBe('dialog');
    expect(harness.container.querySelector('[aria-modal="true"]')).toBeNull();
    expect(harness.container.querySelector('.p04-backdrop')).toBeNull();
    expect(element?.getAttribute('aria-labelledby')).toBe('p04-card-title-cameras');
    expect(harness.container.querySelector('h2')?.textContent).toBe('Cameras');
  });

  it('moves focus to the card heading when it opens', async () => {
    await harness.render();
    expect(document.activeElement).toBe(harness.container.querySelector('h2'));
  });
});

describe('closing', () => {
  it('closes on the Close button', async () => {
    const onClose = vi.fn();
    await harness.render({ onClose });
    const button = harness.container.querySelector<HTMLButtonElement>('.p04-card-close');
    expect(button?.textContent).toBe('Close');
    await act(async () => {
      button?.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    await harness.render({ onClose });
    const element = card();
    await act(async () => {
      element?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', async () => {
    const onClose = vi.fn();
    await harness.render({ onClose });
    await act(async () => {
      card()?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('focus return', () => {
  it('returns focus to the control that opened the card', async () => {
    const opener = document.createElement('button');
    opener.textContent = 'Cameras';
    document.body.appendChild(opener);
    opener.focus();
    expect(document.activeElement).toBe(opener);

    await harness.render({ returnFocusTo: opener });
    expect(document.activeElement).not.toBe(opener);

    await harness.unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
    // The afterEach unmount must not throw on an already removed root.
    harness = createHarness();
  });

  it('does not throw when the opener has left the page', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    await harness.render({ returnFocusTo: opener });
    opener.remove();
    await expect(harness.unmount()).resolves.toBeUndefined();
    harness = createHarness();
  });

});

describe('the panel hierarchy', () => {
  beforeEach(() => {
    harness = createHarness();
  });

  afterEach(async () => {
    await harness.unmount();
  });

  it('shows category, title, the reserved media slot and a discovery badge', async () => {
    await harness.render({
      category: 'Imaging system',
      media: {
        label: 'Recorded from Mars',
        note: 'Mastcam-Z footage is not loaded yet.',
      },
      discovered: true,
    });

    expect(harness.container.querySelector('.p04-card-category')?.textContent).toBe(
      'Imaging system',
    );
    expect(harness.container.querySelector('.p04-card-title')?.textContent).toBe('Cameras');
    const slot = harness.container.querySelector('[data-media-slot]');
    expect(slot?.getAttribute('data-media-slot')).toBe('cameras');
    expect(slot?.textContent).toContain('Recorded from Mars');
    // The slot says the media is missing instead of showing something invented.
    expect(slot?.textContent).toContain('not loaded yet');
    expect(harness.container.querySelector('[data-discovered]')?.textContent).toBe(
      'Discovered',
    );
  });

  it('omits the optional parts when the panel does not have them', async () => {
    await harness.render();
    expect(harness.container.querySelector('.p04-card-category')).toBeNull();
    expect(harness.container.querySelector('[data-media-slot]')).toBeNull();
    expect(harness.container.querySelector('[data-discovered]')).toBeNull();
  });
});
