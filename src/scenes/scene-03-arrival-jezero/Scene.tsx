import { useEffect, useRef, useState } from 'react';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { p03WorldTextureIds } from './assets';
import { RoverCards } from './components/RoverCards';
import { TimeTravelGame } from './components/TimeTravelGame';
import { createP03Nodes } from './nodes';
import { scene03Config } from './scene.config';
import { useP03Scene } from './useP03Scene';
import { P03World } from './World';
import './Scene.css';

export function Scene03ArrivalJezero() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const status = useStoryStore((state) => state.status);
  // The animation state the timeline drives and the WebGL world reads.
  const [nodes] = useState(() => createP03Nodes(reducedMotion));
  const { phase, cardsShown, gameOpen, completeGame } = useP03Scene(nodes);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusedHeading = useRef(false);

  useEffect(() => {
    if (!focusedHeading.current && phase === 'reveal') {
      focusedHeading.current = true;
      headingRef.current?.focus();
    }
  }, [phase]);

  return (
    <main
      className="p03-scene"
      data-scene={scene03Config.id}
      data-phase={phase}
      data-status={status}
      data-reduced-motion={reducedMotion}
    >
      <div className="p03-stage" data-p03-stage>
        <WebGLStage
          label="Percy the rover rolls out of the landed rocket onto the red ground of Jezero Crater."
          background="#4d2a23"
          preload={p03WorldTextureIds}
        >
          <P03World nodes={nodes} />
        </WebGLStage>
      </div>

      <h1 className="p03-heading sr-only" tabIndex={-1} ref={headingRef}>
        Finally... Jezero?
      </h1>

      <RoverCards shown={cardsShown} visible={phase === 'rovers'} />

      {gameOpen ? <TimeTravelGame onDone={completeGame} /> : null}

      {/* The last line asks for one Continue; a press anywhere is that Continue. */}
      {phase === 'final-quote' ? (
        <div
          className="p03-click-catcher"
          aria-hidden="true"
          onClick={() => document.querySelector<HTMLButtonElement>('.p03-dialogue .circular-gate__button')?.click()}
        />
      ) : null}

      <div className="p03-dialogue">
        <DialogueLayer />
      </div>

      <PlaybackControls />

      {/* The scene opens from black, and the exit fade supplies the black the
          sequence shell swaps under. */}
      <div className="p03-cover" aria-hidden="true" />
      <div className="p03-exit-fade" aria-hidden="true" />
    </main>
  );
}
