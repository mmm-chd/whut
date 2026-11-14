import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useExperienceStore } from '../../app/experience.store';
import { homeParallax, resetParallax } from './parallax';
import { Scene00Home } from './Scene';

/**
 * The Play button: it rides the rocket through CSS variables and the press
 * feedback must never move it (regression for the translate3d reset that used
 * to teleport the button to the top-left corner mid-click).
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function mountScene() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  return {
    container,
    render: async () => {
      await act(async () => {
        root.render(<Scene00Home />);
      });
    },
    frame: async () => {
      await act(async () => {
        await nextFrame();
      });
    },
    unmount: async () => {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

beforeEach(() => {
  useExperienceStore.setState({ stage: 'homepage' });
  resetParallax();
});

afterEach(() => {
  resetParallax();
  document.body.innerHTML = '';
});

describe('Play button', () => {
  it('is visible and anchored on the rocket at first paint', async () => {
    const scene = mountScene();
    await scene.render();

    const button = scene.container.querySelector<HTMLButtonElement>('.home-play');
    expect(button).not.toBeNull();
    expect(button?.getAttribute('data-visible')).toBe('true');

    // Position is applied synchronously, before the first animation frame.
    expect(button?.style.getPropertyValue('--play-x')).toMatch(/px$/);
    expect(button?.style.getPropertyValue('--play-y')).toMatch(/px$/);
    // Nothing inline overrides the CSS transform, so :active cannot fight it.
    expect(button?.style.transform).toBe('');

    await scene.unmount();
  });

  it('follows the parallax and tilts with the rocket', async () => {
    const scene = mountScene();
    await scene.render();

    const button = scene.container.querySelector<HTMLButtonElement>('.home-play');
    const restingX = Number.parseFloat(button?.style.getPropertyValue('--play-x') ?? 'NaN');
    expect(button?.style.getPropertyValue('--play-tilt')).toBe('0deg');

    homeParallax.current.x = 1;
    homeParallax.current.y = 0;
    await scene.frame();

    const shiftedX = Number.parseFloat(button?.style.getPropertyValue('--play-x') ?? 'NaN');
    expect(shiftedX).toBeLessThan(restingX);
    expect(button?.style.getPropertyValue('--play-tilt')).toBe('1.5deg');

    await scene.unmount();
  });

  it('keeps its position while the reader presses it', async () => {
    const scene = mountScene();
    await scene.render();

    const button = scene.container.querySelector<HTMLButtonElement>('.home-play');
    if (!button) {
      throw new Error('Play button not rendered');
    }
    const before = button.style.getPropertyValue('--play-x');

    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });

    // The press is a CSS-only scale; the position must stay on the rocket.
    expect(button.style.getPropertyValue('--play-x')).toBe(before);
    expect(button.style.transform).toBe('');

    await scene.unmount();
  });

  it('starts the launch on click', async () => {
    const scene = mountScene();
    await scene.render();

    const button = scene.container.querySelector<HTMLButtonElement>('.home-play');
    if (!button) {
      throw new Error('Play button not rendered');
    }

    await act(async () => {
      button.click();
    });
    // GSAP fires the position-0 cue on its next tick.
    await scene.frame();
    await scene.frame();

    expect(scene.container.querySelector('.home-scene')?.getAttribute('data-phase')).not.toBe(
      'idle',
    );
    expect(button.getAttribute('data-visible')).toBe('false');

    await scene.unmount();
  });
});
