import { useStoryStore } from '../stores/story.store';
import { NarrativeController } from '../engine/NarrativeController';
import { ensureScenesRegistered } from '../engine/ensureScenesRegistered';
import { RotateGate } from '../components/story-controls/RotateGate';
import { Scene01Jezero } from '../scenes/scene-01-jezero/Scene';
import { EndScreen } from './EndScreen';
import './App.css';

ensureScenesRegistered();

export function App() {
  const status = useStoryStore((state) => state.status);

  if (status === 'completed') {
    return <EndScreen />;
  }

  return (
    <NarrativeController>
      <Scene01Jezero />
      <RotateGate />
    </NarrativeController>
  );
}
