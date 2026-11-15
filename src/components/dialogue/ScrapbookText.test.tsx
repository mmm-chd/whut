import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStoryStore } from '../../stores/story.store';
import { dialogueLines } from '../../scenes/scene-01-jezero/dialogue';
import { ScrapbookText } from './ScrapbookText';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const narrator = dialogueLines.find((line) => line.id === 'narrator-01')!;
const manualNarrator = { ...narrator, advance: 'manual' as const };
/** A narrated line: Continue stays closed until its own recording ends. */
const recordedNarrator = { ...manualNarrator, gateAfter: 4 };

function setReducedMotion(reducedMotion: boolean) {
  useStoryStore.setState({
    isPaused: false,
    settings: { muted: false, volume: 0.8, reducedMotion },
  }); 
}

beforeEach(() => setReducedMotion(true));

describe('ScrapbookText', () => {
  it('renders cream handwriting with a placement, no panel and no speaker label', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ScrapbookText line={narrator} />);
    });

    const overlay = container.querySelector('.scrapbook-text');
    expect(overlay).not.toBeNull();
    expect(overlay?.classList.contains('scrapbook-text--narrator-top-right')).toBe(true);
    expect(container.querySelector('.dialogue-box')).toBeNull();
    expect(container.querySelector('.dialogue-box__speaker')).toBeNull();
    expect(container.textContent).not.toContain('Narrator');
    expect(container.textContent).not.toContain('Percy');

    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toBe(narrator.text);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('never resolves a manual line on its own', async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ScrapbookText line={narrator} onContinue={onContinue} />);
    });

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('shows a Continue gate once a gated line finishes typing', async () => {
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Reduced motion makes the typewriter instant, so the gate appears at once.
    await act(async () => {
      root.render(<ScrapbookText line={manualNarrator} onContinue={onContinue} />);
    });

    const overlay = container.querySelector('[data-gated="true"]');
    expect(overlay).not.toBeNull();
    const gate = container.querySelector('[data-circular-gate]');
    expect(gate).not.toBeNull();
    expect(gate?.classList.contains('circular-gate--dialogue')).toBe(true);

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('fires onContinue once and hides the gate when it is pressed', async () => {
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<ScrapbookText line={manualNarrator} onContinue={onContinue} />);
    });

    const gateButton = container.querySelector<HTMLButtonElement>('[data-circular-gate] button');
    expect(gateButton).not.toBeNull();

    await act(async () => {
      gateButton?.click();
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith(manualNarrator);
    expect(container.querySelector('[data-circular-gate]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('continues automatically when advance is auto', async () => {
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ScrapbookText line={{ ...narrator, advance: 'auto' }} onContinue={onContinue} />,
      );
    });

    expect(onContinue).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ advance: 'auto' }));
    expect(container.querySelector('[data-circular-gate]')).toBeNull();

    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('resolves an auto line only after its delay elapses', async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <ScrapbookText
          line={{ ...narrator, advance: 'auto', delay: 2.5 }}
          onContinue={onContinue}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(2499);
    });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('holds the delay timer while the story is paused', async () => {
    vi.useFakeTimers();
    const onContinue = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    useStoryStore.setState({ isPaused: true });

    await act(async () => {
      root.render(
        <ScrapbookText
          line={{ ...narrator, advance: 'auto', delay: 2.5 }}
          onContinue={onContinue}
        />,
      );
    });

    await act(async () => {
      vi.advanceTimersByTime(10000);
    });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      useStoryStore.setState({ isPaused: false });
    });
    await act(async () => {
      vi.advanceTimersByTime(2500);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);

    await act(async () => {
      root.unmount();
    });
    container.remove();
    vi.useRealTimers();
  });

  it('takes an early Continue and carries it out when the voice ends', async () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onContinue = vi.fn();

    await act(async () => {
      root.render(<ScrapbookText line={recordedNarrator} onContinue={onContinue} />);
    });

    // The gate is offered as soon as the text is typed: nobody is left
    // staring at a finished line while the voice keeps talking.
    const gate = container.querySelector('.circular-gate__button') as HTMLButtonElement | null;
    expect(gate).not.toBeNull();

    await act(async () => {
      gate?.click();
    });
    // Pressed early: remembered, not carried out, so the recording is safe.
    expect(onContinue).not.toHaveBeenCalled();
    expect(container.querySelector('.scrapbook-text')?.getAttribute('data-armed')).toBe('true');

    await act(async () => {
      vi.advanceTimersByTime(3900);
    });
    expect(onContinue).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(200);
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
    // The gate leaves with the line.
    expect(container.querySelector('.circular-gate')).toBeNull();

    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('continues at once when the pressing comes after the recording', async () => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const onContinue = vi.fn();
    await act(async () => {
      root.render(<ScrapbookText line={recordedNarrator} onContinue={onContinue} />);
    });
    await act(async () => {
      vi.advanceTimersByTime(4500);
    });
    await act(async () => {
      (container.querySelector('.circular-gate__button') as HTMLButtonElement | null)?.click();
    });
    expect(onContinue).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  it('shows Continue as soon as the typing ends when the line has no recording', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(<ScrapbookText line={manualNarrator} onContinue={() => {}} />);
    });
    expect(container.querySelector('.circular-gate')).not.toBeNull();
    await act(async () => root.unmount());
    container.remove();
  });
});
