import { useEffect, useRef, useState } from 'react';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { createP02Nodes } from './nodes';
import { p02WorldTextureIds } from './assets';
import { P02World } from './World';
import { scene02Config } from './scene.config';
import { useP02Scene } from './useP02Scene';
import './Scene.css';

export function Scene02LaunchToMars() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  // The animation state the timeline drives and the WebGL world reads.
  const [nodes] = useState(() => createP02Nodes(reducedMotion));
  const { phase, countdown, launch } = useP02Scene(nodes);
  const status = useStoryStore((state) => state.status);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const focusedHeading = useRef(false);
  const focusedCountdown = useRef(false);

  useEffect(() => {
    if (!focusedHeading.current && phase === 'establishing') {
      focusedHeading.current = true;
      headingRef.current?.focus();
    }
  }, [phase]);

  useEffect(() => {
    if (!focusedCountdown.current && phase === 'countdown') {
      focusedCountdown.current = true;
      statusRef.current?.focus();
    }
  }, [phase]);

  const showLaunch = phase === 'awaiting-launch' && status === 'waiting';

  return (
    <main
      className="p02-scene"
      data-scene={scene02Config.id}
      data-phase={phase}
      data-status={status}
      data-reduced-motion={reducedMotion}
    >
      <div className="p02-stage" data-p02-stage>
        <WebGLStage
          label="The Atlas V rocket stands on its launch pad at Cape Canaveral."
          preload={p02WorldTextureIds}
        >
          <P02World nodes={nodes} />
        </WebGLStage>
      </div>

      <h1 className="p02-heading sr-only" tabIndex={-1} ref={headingRef}>
        The Journey to Mars
      </h1>

      <div
        className="p02-rewind"
        data-visible={phase === 'flashback'}
        aria-hidden={phase !== 'flashback'}
      >
        <div className="p02-rewind__card">
          <p className="p02-rewind__eyebrow">Rewind</p>
          <p className="p02-rewind__title">But before the journey began...</p>
        </div>
      </div>

      <div className="p02-hud">
        {showLaunch ? (
          <button
            type="button"
            className="p02-launch"
            data-interaction="launch-button"
            onClick={launch}
          >
            <span className="p02-launch__eyebrow">Mission ready</span>
            <span className="p02-launch__label">Launch</span>
          </button>
        ) : null}

        <div
          className="p02-countdown"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          ref={statusRef}
          tabIndex={-1}
        >
          {countdown ?? ''}
        </div>
      </div>

      <div className="p02-dialogue">
        <DialogueLayer />
      </div>

      <PlaybackControls />

      {/* The exit fade supplies the black the sequence shell swaps under. */}
      <div className="p02-exit-fade" data-p02-exit-fade aria-hidden="true" />
    </main>
  );
}
