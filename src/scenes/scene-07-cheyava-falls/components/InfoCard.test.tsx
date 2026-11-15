import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { P06Card } from '../content';
import { findCard } from '../content';
import { InfoCard } from './InfoCard';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const card: P06Card = findCard('leopard-spots');

interface Handles {
  readonly onReveal: (card: P06Card) => void;
  readonly onFlipSettled: (card: P06Card) => void;
}

function render(
  opened: boolean,
  handles: Handles,
  extra: { disabled?: boolean; flipping?: boolean; flipMs?: number } = {},
) {
  act(() =>
    root.render(
      <InfoCard
        card={card}
        opened={opened}
        flipping={extra.flipping ?? false}
        disabled={extra.disabled ?? false}
        onReveal={handles.onReveal}
        onFlipSettled={handles.onFlipSettled}
        flipMs={extra.flipMs ?? 0}
      />,
    ),
  );
}

function handles(): Handles {
  return { onReveal: vi.fn<(card: P06Card) => void>(), onFlipSettled: vi.fn<(card: P06Card) => void>() };
}

const button = () =>
  container.querySelector<HTMLButtonElement>('button.p06-card-reveal') as HTMLButtonElement;

describe('an information card', () => {
  it('names the card on its reveal button, and says it is closed', () => {
    render(false, handles());
    expect(button().getAttribute('aria-label')).toBe('Reveal card 2: Leopard Spots');
    expect(button().getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the icon out of the accessibility tree and out of the tab order', () => {
    render(false, handles());
    const svg = container.querySelector('svg.p06-icon');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
  });

  it('hides the information face while the card is closed', () => {
    render(false, handles());
    const front = container.querySelector('.p06-card-front');
    expect(front?.hasAttribute('inert')).toBe(true);
    expect(front?.getAttribute('aria-hidden')).toBe('true');
  });

  it('reports one reveal, then hands focus to the heading', () => {
    const spies = handles();
    render(false, spies);
    act(() => button().click());
    const onReveal = vi.mocked(spies.onReveal);
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onReveal).toHaveBeenCalledWith(card);

    // The turn is driven by `flipping`: `opened` arrives only after it settles.
    render(false, spies, { flipping: true });
    expect(vi.mocked(spies.onFlipSettled)).toHaveBeenCalledWith(card);

    render(true, spies);
    const front = container.querySelector('.p06-card-front');
    expect(front?.hasAttribute('inert')).toBe(false);
    expect(front?.getAttribute('aria-hidden')).toBe('false');
    expect(document.activeElement).toBe(container.querySelector('.p06-card-heading'));
  });

  it('shows the supplied body, unaltered, once open', () => {
    render(true, handles());
    expect(container.querySelector('.p06-card-front')?.textContent).toContain(card.body);
  });

  it('cannot be opened while the deck is busy', () => {
    render(false, handles(), { disabled: true });
    expect(button().disabled).toBe(true);
  });

  it('marks the card that is turning', () => {
    render(true, handles(), { flipping: true });
    expect(container.querySelector('.p06-card')?.getAttribute('data-flipping')).toBe('true');
  });
});

describe('the turn itself', () => {
  const transformOf = () =>
    container.querySelector<HTMLElement>('.p06-card-inner')?.style.transform ?? '';

  it('turns around the vertical axis, with a dip and a single settle', async () => {
    const spies = handles();
    render(false, spies, { flipping: true, flipMs: 550 });

    // Sampled rather than timed: whatever the test runner's clock does, the
    // card is only ever turning sideways and never rolling over.
    const seen: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 60));
      seen.push(transformOf());
    }
    const written = seen.join(' ');
    expect(written).toContain('rotateY(');
    expect(written).not.toContain('rotateX(');
    // The motion has weight: a scale is applied while the card is turning.
    expect(written).toContain('scale(');

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(vi.mocked(spies.onFlipSettled)).toHaveBeenCalledTimes(1);
    expect(transformOf()).toContain('rotateY(180deg)');
  });
});
