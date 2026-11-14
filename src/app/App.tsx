import { useStoryStore } from '../stores/story.store';
import { NarrativeController } from '../engine/NarrativeController';
import { ensureScenesRegistered } from '../engine/ensureScenesRegistered';
import { RotateGate } from '../components/story-controls/RotateGate';
import { EndScreen } from './EndScreen';
import { StorySequence } from './StorySequence';
import { getNextSceneId, narrowStorySceneId } from './sceneSequence';
import './App.css';

ensureScenesRegistered();

export function App() {
  const status = useStoryStore((state) => state.status);
  const activeSceneId = useStoryStore((state) => state.activeSceneId);

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
