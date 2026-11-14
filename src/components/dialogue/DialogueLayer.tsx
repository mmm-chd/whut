import { AnimatePresence } from 'motion/react';
import { useEffect } from 'react';
import { useAudioManager } from '../../audio/useAudioManager';
import { useStoryStore } from '../../stores/story.store';
import { ScrapbookText } from './ScrapbookText';
import { useDialogueStore } from './dialogue.store';

/**
 * Renders the dialogue system's active line.
 *
 * The scene never mounts or unmounts text itself: timeline labels and
 * interactions only cue lines into the store, and the store alone decides
 * what is visible and when a line leaves. Scene transitions therefore cannot
 * wipe text that the player is still reading.
 */
export function DialogueLayer() {
  const active = useDialogueStore((state) => state.active);
  const resolve = useDialogueStore((state) => state.resolve);
  const audio = useAudioManager();

  // Play the voice-over for the active line (silent fallback when no audio file).
  useEffect(() => {
    const audioId = active?.line.audioId;
    if (!audioId) {
      return;
    }
    audio.play(audioId);
    return () => audio.stop(audioId);
  }, [active, audio]);

  // A fresh scene run (start or replay) begins with an empty dialogue state;
  // the replayed timeline re-cues every line itself.
  useEffect(() => {
    return useStoryStore.subscribe((state, prevState) => {
      if (state.status === 'playing' && prevState.status !== 'playing') {
        useDialogueStore.getState().clear();
      }
    });
  }, []);

  return (
    <AnimatePresence mode="wait">
      {active ? (
        <ScrapbookText
          key={`${active.line.id}-${active.key}`}
          line={active.line}
          onContinue={resolve}
        />
      ) : null}
    </AnimatePresence>
  );
}
