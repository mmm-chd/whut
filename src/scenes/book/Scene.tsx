import { useCallback, useEffect, useRef, useState } from 'react';
import { useExperienceStore } from '../../app/experience.store';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { BOOK_FLAME_URL, BOOK_ROCKET_URL, bookWorldTextureIds } from './assets';
import { Book } from './Book';
import { characterSpreads, type CharacterSpread } from './characters';
import { Inspector } from './Inspector';
import { bookParallax, pointerToTarget, resetBookParallax } from './parallax';
import { nextRevealPhase, revealDelay, type RevealPhase } from './reveal';
import { BookWorld } from './World';
import './Scene.css';

/**
 * Stages 02-05: the rocket leaves the launchpad, the adventure journal drifts
 * in and opens, and each spread introduces one explorer (concept 5-11). The
 * book hands off to the story sequence from the right-hand page.
 */
export function SceneBook() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const setStage = useExperienceStore((state) => state.setStage);
  const [reveal, setReveal] = useState<RevealPhase>(reducedMotion ? 'ready' : 'arriving');
  const [inspecting, setInspecting] = useState<CharacterSpread | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (reveal === 'ready') {
      return;
    }
    const next = nextRevealPhase(reveal);
    if (!next) {
      return;
    }
    const timer = window.setTimeout(() => setReveal(next), revealDelay(reveal));
    return () => window.clearTimeout(timer);
  }, [reveal]);

  /* One pointer listener drives both the backdrop parallax and the book tilt. */
  useEffect(() => {
    const root = rootRef.current;
    const resetTilt = () => {
      root?.style.setProperty('--book-tilt-x', '0deg');
      root?.style.setProperty('--book-tilt-y', '0deg');
    };
    if (reducedMotion) {
      resetBookParallax();
      resetTilt();
      return;
    }
    const onMove = (event: PointerEvent) => {
      const target = pointerToTarget(
        event.clientX,
        event.clientY,
        window.innerWidth,
        window.innerHeight,
      );
      bookParallax.target.x = target.x;
      bookParallax.target.y = target.y;
      root?.style.setProperty('--book-tilt-x', `${(-target.y * 1.1).toFixed(2)}deg`);
      root?.style.setProperty('--book-tilt-y', `${(target.x * 1.5).toFixed(2)}deg`);
    };
    const onLeave = () => {
      bookParallax.target.x = 0;
      bookParallax.target.y = 0;
      resetTilt();
    };
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [reducedMotion]);

  const handleExplore = useCallback((spread: CharacterSpread) => {
    setInspecting(spread);
  }, []);
  const handleStartStory = useCallback(() => {
    setStage('story');
  }, [setStage]);
  const closeInspector = useCallback(() => setInspecting(null), []);

  return (
    <main
      className="book-scene"
      data-scene="book"
      data-phase={reveal}
      data-inspecting={inspecting ? 'true' : 'false'}
      data-reduced={reducedMotion ? 'true' : 'false'}
      ref={rootRef}
    >
      <div className="book-backdrop">
        <WebGLStage
          label="Space backdrop: stars, the planet Mars, and a moon behind the adventure journal."
          background="#0e1b30"
          preload={bookWorldTextureIds}
        >
          <BookWorld reducedMotion={reducedMotion} />
        </WebGLStage>
      </div>

      <div className="book-rocket" aria-hidden="true">
        <img className="book-rocket__flame" src={BOOK_FLAME_URL} alt="" draggable={false} />
        <img className="book-rocket__body" src={BOOK_ROCKET_URL} alt="" draggable={false} />
      </div>

      <header className="book-hud">
        <p className="book-hud__eyebrow">The Adventure Journal</p>
        <h1 className="book-hud__title">Select your explorer</h1>
        <p className="book-hud__sub">Every explorer has a story to tell.</p>
      </header>

      <Book
        spreads={characterSpreads}
        reveal={reveal}
        reducedMotion={reducedMotion}
        interactive={inspecting === null}
        onExplore={handleExplore}
        onStartStory={handleStartStory}
      />

      {inspecting ? (
        <Inspector spread={inspecting} reducedMotion={reducedMotion} onClose={closeInspector} />
      ) : null}
    </main>
  );
}
