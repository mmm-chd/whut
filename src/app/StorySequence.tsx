import { useEffect, useRef, useState } from 'react';
import { CruiseEntryScene } from '../scenes/filler-scene-01-cruise/Scene';
import { Scene01Jezero } from '../scenes/scene-01-jezero/Scene';
import { Scene02LaunchToMars } from '../scenes/scene-02-launch-to-mars/Scene';
import { Scene03ArrivalJezero } from '../scenes/scene-03-arrival-jezero/Scene';
import { Scene04PercyInspection } from '../scenes/scene-04-percy-inspection/Scene';
import { Scene05PercyInspector } from '../scenes/scene-05-percy-inspector/Scene';
import { useStoryScore } from '../audio/useStoryScore';
import { useStoryStore } from '../stores/story.store';
import {
  getNextSceneId,
  narrowStorySceneId,
  type StorySceneId,
} from './sceneSequence';
import './App.css';

const COVER_FADE_MS = 600;

function renderScene(id: StorySceneId) {
  switch (id) {
    case 'p01-jezero':
      return <Scene01Jezero />;
    case 'scene-02-launch-to-mars':
      return <Scene02LaunchToMars />;
    case 'filler-scene-01-cruise':
      return <CruiseEntryScene />;
    case 'scene-03-arrival-jezero':
      return <Scene03ArrivalJezero />;
    case 'scene-04-percy-inspection':
      return <Scene04PercyInspection />;
    case 'scene-05-percy-inspector':
      return <Scene05PercyInspector />;
  }
}

interface CoverState {
  opacity: 0 | 1;
  instant: boolean;
}

/**
 * Owns the black transition cover and the scene swap.
 *
 * The outgoing scene stays mounted until the cover is fully black. The swap
 * then runs `resetScene()` and `startScene(nextId)` in one tick, which is the
 * legal `completed -> idle -> playing` trace, and replaces the displayed
 * scene. P-02 mounts with its own opaque rewind card, so the shell cover can
 * disappear immediately there; the cruise entry is revealed by the shell.
 */
export function StorySequence() {
  // One looping score for the whole run: it outlives every scene swap.
  useStoryScore();

  const activeSceneId = useStoryStore((state) => state.activeSceneId);
  const status = useStoryStore((state) => state.status);
  const isPaused = useStoryStore((state) => state.isPaused);
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const resetScene = useStoryStore((state) => state.resetScene);
  const startScene = useStoryStore((state) => state.startScene);

  const [displayedSceneId, setDisplayedSceneId] = useState<StorySceneId>(
    () => narrowStorySceneId(activeSceneId) ?? 'p01-jezero',
  );
  const [cover, setCover] = useState<CoverState>({ opacity: 0, instant: false });

  const handoffRef = useRef<StorySceneId | null>(null);
  const timerRef = useRef<number | null>(null);

  // Keep the displayed scene in sync with external store changes (tests,
  // replay) while no handoff owns the swap.
  useEffect(() => {
    if (handoffRef.current !== null) {
      return;
    }
    const live = narrowStorySceneId(activeSceneId);
    if (live && live !== displayedSceneId) {
      setDisplayedSceneId(live);
    }
  }, [activeSceneId, displayedSceneId]);

  // A handoff that loses its `completed` state must not fire later.
  useEffect(() => {
    if (status === 'completed' || timerRef.current === null) {
      return;
    }
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
    handoffRef.current = null;
    setCover({ opacity: 0, instant: false });
  }, [status]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (status !== 'completed' || isPaused) {
      return;
    }

    const outgoing = displayedSceneId;
    const next = getNextSceneId(outgoing);
    if (!next || handoffRef.current !== null) {
      return;
    }
    handoffRef.current = outgoing;

    // P-02 already fades to black during its exit, so the cover appears
    // instantly there. P-01 needs the shell to fade to full black first.
    const instantCover = reducedMotion || outgoing === 'scene-02-launch-to-mars';
    setCover({ opacity: 1, instant: instantCover });

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;

      const state = useStoryStore.getState();
      if (state.status !== 'completed' || state.isPaused) {
        handoffRef.current = null;
        setCover({ opacity: 0, instant: false });
        return;
      }

      resetScene();
      startScene(next);
      setDisplayedSceneId(next);

      // P-02's rewind card and P-03's opening cover are already opaque black.
      // The cruise entry needs a visible reveal, so only that swap fades the
      // shell cover out.
      setCover({
        opacity: 0,
        instant:
          next === 'scene-02-launch-to-mars' ||
          next === 'scene-03-arrival-jezero' ||
          next === 'scene-04-percy-inspection' ||
          next === 'scene-05-percy-inspector' ||
          reducedMotion,
      });
      handoffRef.current = null;
    }, instantCover ? 0 : COVER_FADE_MS);
  }, [displayedSceneId, isPaused, reducedMotion, resetScene, startScene, status]);

  return (
    <div className="story-sequence" data-displayed-scene={displayedSceneId}>
      {renderScene(displayedSceneId)}
      <div
        className="story-sequence__cover"
        data-visible={cover.opacity === 1}
        style={{
          opacity: cover.opacity,
          transition:
            cover.instant || reducedMotion ? 'none' : `opacity ${COVER_FADE_MS}ms ease`,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
