import { act, useRef, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InfographicCard, InfographicViewer } from './Infographic';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Harness() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <InfographicCard triggerRef={trigger} onOpen={() => setOpen(true)} />
      {open ? <InfographicViewer onClose={() => setOpen(false)} returnFocusTo={trigger} /> : null}
    </div>
  );
}

let container: HTMLDivElement;
let root: Root;

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<Harness />);
  });
});

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

const open = () => container.querySelector<HTMLButtonElement>('[data-open-infographic]')!;
const dialog = () => container.querySelector('[role="dialog"]');

describe('Infographic', () => {
  it('shows a described thumbnail and no viewer at first', () => {
    expect(open()).not.toBeNull();
    expect(open().querySelector('img')?.getAttribute('alt')).toMatch(/Perseverance/);
    expect(dialog()).toBeNull();
  });

  it('opens the full poster, moves focus into it and describes it', async () => {
    await act(async () => {
      open().click();
    });
    expect(dialog()).not.toBeNull();
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.hasAttribute('data-close-infographic')).toBe(true);
    expect(dialog()?.querySelector('img')?.getAttribute('alt')).toMatch(/Lunokhod/);
  });

  it('closes with Escape and gives focus back to the card', async () => {
    await act(async () => {
      open().click();
    });
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(open());
  });

  it('closes from the Close button and from the backdrop, but not from inside the sheet', async () => {
    await act(async () => {
      open().click();
    });
    await act(async () => {
      container.querySelector<HTMLElement>('.p07-viewer-scroll')?.click();
    });
    expect(dialog()).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-close-infographic]')?.click();
    });
    expect(dialog()).toBeNull();

    await act(async () => {
      open().click();
    });
    await act(async () => {
      container.querySelector<HTMLElement>('.p07-viewer')?.click();
    });
    expect(dialog()).toBeNull();
  });

  it('keeps Tab inside the sheet', async () => {
    await act(async () => {
      open().click();
    });
    const sheet = container.querySelector<HTMLElement>('.p07-viewer')!;
    const scroll = container.querySelector<HTMLElement>('.p07-viewer-scroll')!;
    await act(async () => {
      sheet.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement).toBe(scroll);
    await act(async () => {
      scroll.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    });
    expect(document.activeElement?.hasAttribute('data-close-infographic')).toBe(true);
  });
});
