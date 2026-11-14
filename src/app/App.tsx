import { useStoryStore } from '../stores/story.store';
import { NarrativeController } from '../engine/NarrativeController';
import { ensureScenesRegistered } from '../engine/ensureScenesRegistered';
import { RotateGate } from '../components/story-controls/RotateGate';
import { SplashOverlay } from '../components/splash/SplashOverlay';
import { Scene00Home } from '../scenes/home-launchpad/Scene';
import { SceneBook } from '../scenes/book/Scene';
import { EndScreen } from './EndScreen';
import { StorySequence } from './StorySequence';
import { useExperienceStore } from './experience.store';
import { getNextSceneId, narrowStorySceneId } from './sceneSequence';
import './App.css';

ensureScenesRegistered();

export function App() {
  const stage = useExperienceStore((state) => state.stage);
  const status = useStoryStore((state) => state.status);
  const activeSceneId = useStoryStore((state) => state.activeSceneId);

  // Stage 00: the launchpad mounts behind the splash overlay so its textures
  // preload during the frames; the overlay crossfades straight into it.
  if (stage === 'splash') {
    return (
      <>
        <Scene00Home />
        <SplashOverlay />
      </>
    );
  }

  // Stage 01: the launchpad; Play hands off to the story sequence.
  if (stage === 'homepage') {
    return <Scene00Home />;
  }

  // Stages 02-05: the 2.5D adventure journal (book reveal, character spreads,
  // 3D inspector) before the story sequence starts.
  if (stage === 'book') {
    return <SceneBook />;
  }

  // The opening scene has no active ID yet; treat it as P-01.
  const sceneId = narrowStorySceneId(activeSceneId) ?? 'p01-jezero';
  const isTerminal = status === 'completed' && getNextSceneId(sceneId) === null;

  if (isTerminal) {
    return <EndScreen />;
  }

  return (
    <NarrativeController>
      <StorySequence />
      <RotateGate />
    </NarrativeController>
  );
}
