import { Home, Play } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { jumpToScene, leaveToMainMenu, listSceneChoices } from '../../app/storyNavigation';
import { useStoryStore } from '../../stores/story.store';
import './PauseMenu.css';

interface PauseMenuProps {
  /** Close the menu and carry on with the story. */
  readonly onResume: () => void;
}

const SCENES = listSceneChoices();

/**
 * The pause dialog: how loud the narration and the music are, a way back to the
 * main menu, and a list of scenes to jump to. The story is paused while it is open.
 */
export function PauseMenu({ onResume }: PauseMenuProps) {
  const voice = useStoryStore((state) => state.settings.voiceVolume ?? 1);
  const music = useStoryStore((state) => state.settings.musicVolume ?? 1);
  const activeSceneId = useStoryStore((state) => state.activeSceneId) ?? 'p01-jezero';
  const setVoice = useStoryStore((state) => state.setVoiceVolume);
  const setMusic = useStoryStore((state) => state.setMusicVolume);
  const resumeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    resumeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onResume();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div className="pause-menu" data-pause-menu>
      <div className="pause-menu__scrim" onClick={onResume} aria-hidden="true" />
      <section className="pause-menu__card" role="dialog" aria-modal="true" aria-labelledby="pause-menu-title">
        <h2 id="pause-menu-title" className="pause-menu__title">
          Paused
        </h2>

        <div className="pause-menu__sliders">
          <label className="pause-menu__row">
            <span>Voice</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={voice}
              onChange={(event) => setVoice(Number(event.target.value))}
              aria-label="Voice-over volume"
              data-voice-volume
            />
          </label>
          <label className="pause-menu__row">
            <span>Music</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={music}
              onChange={(event) => setMusic(Number(event.target.value))}
              aria-label="Background music volume"
              data-music-volume
            />
          </label>
        </div>

        <div className="pause-menu__scenes">
          <h3 className="pause-menu__subtitle">Go to a scene</h3>
          <ol className="pause-menu__list">
            {SCENES.map((scene) => (
              <li key={scene.id}>
                <button
                  type="button"
                  className="pause-menu__scene"
                  data-scene-choice={scene.id}
                  aria-current={scene.id === activeSceneId ? 'true' : undefined}
                  onClick={() => jumpToScene(scene.id)}
                >
                  {scene.label}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="pause-menu__actions">
          <button ref={resumeRef} type="button" className="pause-menu__button" data-primary data-resume onClick={onResume}>
            <Play size={18} aria-hidden="true" />
            Keep playing
          </button>
          <button type="button" className="pause-menu__button" data-main-menu onClick={leaveToMainMenu}>
            <Home size={18} aria-hidden="true" />
            Main menu
          </button>
        </div>
      </section>
    </div>
  );
}
