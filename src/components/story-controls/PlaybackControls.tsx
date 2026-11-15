import { Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { PauseMenu } from './PauseMenu';
import './PlaybackControls.css';

export interface PlaybackControlsProps {
  /**
   * Allow Pause while the scene is globally `waiting`. Scenes that animate and
   * narrate through `waiting` (the ending, the Runner) opt in; the default keeps
   * Pause for `playing` only.
   */
  allowPauseWhileWaiting?: boolean;
}

export function PlaybackControls({ allowPauseWhileWaiting = false }: PlaybackControlsProps = {}) {
  const { pause, resume, replay } = useNarrativeController();
  const status = useStoryStore((state) => state.status);
  const isPaused = useStoryStore((state) => state.isPaused);
  const muted = useStoryStore((state) => state.settings.muted);
  const volume = useStoryStore((state) => state.settings.volume);
  const setMuted = useStoryStore((state) => state.setMuted);
  const setVolume = useStoryStore((state) => state.setVolume);

  const [menuOpen, setMenuOpen] = useState(false);

  // The menu belongs to a pause: if the story resumes some other way, it closes.
  useEffect(() => {
    if (!isPaused) {
      setMenuOpen(false);
    }
  }, [isPaused]);

  const closeMenu = () => {
    setMenuOpen(false);
    resume();
  };

  const onPauseButton = () => {
    if (isPaused) {
      closeMenu();
      return;
    }
    pause();
    setMenuOpen(true);
  };

  const canPause = status === 'playing' || (allowPauseWhileWaiting && status === 'waiting');
  const canReplay = status === 'playing' || status === 'waiting';

  return (
    <div className="playback-controls" role="group" aria-label="Story playback controls">
      <button
        type="button"
        className="playback-controls__button"
        onClick={onPauseButton}
        disabled={!canPause}
        aria-label={isPaused ? 'Resume story' : 'Pause story'}
        aria-haspopup="dialog"
      >
        {isPaused ? <Play size={18} aria-hidden="true" /> : <Pause size={18} aria-hidden="true" />}
      </button>

      <button
        type="button"
        className="playback-controls__button"
        onClick={replay}
        disabled={!canReplay}
        aria-label="Replay scene"
      >
        <RotateCcw size={18} aria-hidden="true" />
      </button>

      <button
        type="button"
        className="playback-controls__button"
        onClick={() => setMuted(!muted)}
        aria-pressed={muted}
        aria-label={muted ? 'Unmute audio' : 'Mute audio'}
      >
        {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
      </button>

      <input
        className="playback-controls__volume"
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={volume}
        onChange={(event) => setVolume(Number(event.target.value))}
        aria-label="Volume"
      />
      {menuOpen ? <PauseMenu onResume={closeMenu} /> : null}
    </div>
  );
}
