// DEV-TOOL: scene jumper for local testing. Remove before release:
// delete the src/dev folder and the DEV-TOOL lines in src/main.tsx.
import { useCallback, useEffect, useState } from 'react';
import { App } from '../app/App';
import { useExperienceStore } from '../app/experience.store';
import { useStoryStore } from '../stores/story.store';
import type { StorySceneId } from '../app/sceneSequence';

const SCENES: { id: StorySceneId; label: string }[] = [
  { id: 'p01-jezero', label: 'P-01 Jezero' },
  { id: 'scene-02-launch-to-mars', label: 'P-02 Launch' },
  { id: 'filler-scene-01-cruise', label: 'Cruise' },
  { id: 'scene-03-arrival-jezero', label: 'P-03 Arrival' },
];

function applyScene(id: StorySceneId) {
  const { setState, getState } = useStoryStore;
  if (id === 'p01-jezero') {
    // Pristine app start: P-01 starts itself from its own gate.
    setState({
      activeSceneId: null,
      status: 'idle',
      isPaused: false,
      completedInteractions: [],
    });
    return;
  }
  getState().resetScene();
  getState().startScene(id);
}

export function DevRoot() {
  const [nonce, setNonce] = useState(0);
  const [open, setOpen] = useState(true);
  const activeSceneId = useStoryStore((s) => s.activeSceneId);
  const status = useStoryStore((s) => s.status);
  const stage = useExperienceStore((s) => s.stage);

  const jump = useCallback((id: StorySceneId) => {
    applyScene(id);
    // A new key remounts the whole app, so the same scene restarts cleanly.
    setNonce((n) => n + 1);
  }, []);

  const jumpStage = useCallback((stage: 'homepage' | 'book') => {
    useExperienceStore.setState({ stage });
    setNonce((n) => n + 1);
  }, []);

  /* DEV-TOOL: ?devStage=book jumps straight to the journal for screenshots. */
  useEffect(() => {
    const stage = new URLSearchParams(window.location.search).get('devStage');
    if (stage === 'homepage' || stage === 'book') {
      useExperienceStore.setState({ stage });
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey) {
        return;
      }
      if (event.key === '0') {
        setOpen((v) => !v);
        return;
      }
      const index = Number(event.key) - 1;
      const target = SCENES[index];
      if (target) {
        event.preventDefault();
        jump(target.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  return (
    <>
      <App key={nonce} />
      <div
        data-dev-tool
        style={{
          position: 'fixed',
          left: 8,
          bottom: 8,
          zIndex: 99999,
          font: '12px/1.3 monospace',
          color: '#e8f0ff',
          background: 'rgba(8,12,20,0.88)',
          border: '1px solid #3a4a66',
          borderRadius: 6,
          padding: open ? 8 : '4px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ all: 'unset', cursor: 'pointer', opacity: 0.8 }}
        >
          DEV {open ? '▾' : '▸'} (Alt+0)
        </button>
        {open && (
          <>
            <div style={{ opacity: 0.7 }}>
              {activeSceneId ?? 'p01 (not started)'} · {status}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {SCENES.map((scene, i) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => jump(scene.id)}
                  style={{
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                    background: activeSceneId === scene.id ? '#2b4a7a' : '#1a2233',
                    border: '1px solid #3a4a66',
                    borderRadius: 4,
                    padding: '3px 6px',
                  }}
                >
                  {i + 1} {scene.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                onClick={() => jumpStage('homepage')}
                style={{
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  background: stage === 'homepage' ? '#2b4a7a' : '#1a2233',
                  border: '1px solid #3a4a66',
                  borderRadius: 4,
                  padding: '3px 6px',
                }}
              >
                Homepage
              </button>
              <button
                type="button"
                onClick={() => jumpStage('book')}
                style={{
                  cursor: 'pointer',
                  font: 'inherit',
                  color: 'inherit',
                  background: stage === 'book' ? '#2b4a7a' : '#1a2233',
                  border: '1px solid #3a4a66',
                  borderRadius: 4,
                  padding: '3px 6px',
                }}
              >
                Adventure book
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
