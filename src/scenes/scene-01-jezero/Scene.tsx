import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { useCallback, useRef, useState } from 'react';
import { useNarrativeController } from '../../engine/useNarrativeController';
import { useStoryStore } from '../../stores/story.store';
import { useAudioManager } from '../../audio/useAudioManager';
import { Dust } from './components/Dust';
import { Percy } from './components/Percy';
import { Rock } from './components/Rock';
import { SkyEvents } from './components/SkyEvents';
import { StageLayers } from './components/StageLayers';
import { OpeningTitle } from './components/OpeningTitle';
import { scene01Config } from './scene.config';
import { createSceneTimeline, type SceneGate } from './timeline';
import { dialogueLines, getTimelineDialogue, storyHoldingLineIds } from './dialogue';
import { DialogueLayer } from '../../components/dialogue/DialogueLayer';
import { useDialogueStore } from '../../components/dialogue/dialogue.store';
import { interactions, getInteractionForRock, type RockId } from './interactions';
import { rocksConfig } from './rocks.config';
import { getSonarMode } from './sonar';
import { FactCard } from '../../components/cards/FactCard';
import { Progress } from '../../components/story-controls/Progress';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { ContinueControl } from '../../components/story-controls/ContinueControl';
import { CircularGate } from '../../components/story-controls/CircularGate';
import { DimTransition } from '../../components/transitions/DimTransition';
import './Scene.css';

gsap.registerPlugin(useGSAP);

type Gate = null | 'title';

export function Scene01Jezero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const { resume, markWaiting, attachTimeline } = useNarrativeController();
  const startScene = useStoryStore((state) => state.startScene);
  const markInteractionComplete = useStoryStore((state) => state.markInteractionComplete);
  const status = useStoryStore((state) => state.status);
  const completedInteractions = useStoryStore((state) => state.completedInteractions);
  const isPaused = useStoryStore((state) => state.isPaused);
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const [gate, setGate] = useState<Gate>(null);
  const audio = useAudioManager();

  // Card state — only one card open at a time
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [focusedRockId, setFocusedRockId] = useState<RockId | null>(null);

  // Keep the label callback stable so the GSAP effect is not recreated on every
  // state change. Labels only cue lines into the dialogue store — they can
  // never clear or replace the text on screen; the dialogue system owns that.
  const handleLabelRef = useRef<(label: string) => void>((label) => {
    if (openCardId) return;
    const line = getTimelineDialogue(label);
    if (line) {
      useDialogueStore.getState().cue(line);
    }
  });
  handleLabelRef.current = (label) => {
    if (openCardId) return;
    const line = getTimelineDialogue(label);
    if (line) {
      useDialogueStore.getState().cue(line);
    }
  };

  // Dialogue gates bind the timeline pause to the line that owns it: the
  // story resumes when that line resolves (player Continue, auto, timer).
  const handleGateRef = useRef<(gate: SceneGate) => void>(() => {});
  handleGateRef.current = (nextGate) => {
    if (typeof nextGate === 'string') {
      setGate(nextGate);
      return;
    }
    useDialogueStore.getState().holdStory(nextGate.lineId, resume);
  };

  const handleRockClick = useCallback((rockId: RockId) => {
    const interaction = getInteractionForRock(rockId);
    if (!interaction || openCardId || focusedRockId) return;

    setFocusedRockId(rockId);
    const world = stageRef.current?.querySelector<HTMLElement>('[data-stage-world]');
    const duration = reducedMotion ? 0.01 : 0.34;
    const openCard = () => {
      markInteractionComplete(interaction.id);
      setOpenCardId(interaction.id);
    };

    if (!world) {
      openCard();
      return;
    }

    gsap.to(world, {
      scale: reducedMotion ? 1.06 : 1.13,
      transformOrigin: `${(rocksConfig.find((rock) => rock.id === rockId)?.screenX ?? 0.5) * 100}% 63%`,
      duration,
      ease: 'power2.out',
      onComplete: openCard,
    });
  }, [focusedRockId, markInteractionComplete, openCardId, reducedMotion]);

  const handleCardClose = useCallback(() => {
    setOpenCardId(null);
    setFocusedRockId(null);
    const world = stageRef.current?.querySelector<HTMLElement>('[data-stage-world]');
    if (world) {
      gsap.to(world, {
        scale: reducedMotion ? 1 : 1.05,
        duration: reducedMotion ? 0.01 : 0.28,
        ease: 'power2.out',
      });
    }
    const closingLine = dialogueLines.find((l) => l.id === 'card-closing');
    if (closingLine) {
      useDialogueStore.getState().cue(closingLine);
    }
  }, [reducedMotion]);

  // The opening (space + title) plays on mount and pauses at the title gate.
  // The story status stays idle until the player presses that gate, so the
  // descent always needs an explicit action.
  const handleGate = useCallback(() => {
    if (gate !== 'title') {
      return;
    }
    startScene(scene01Config.id);
    // Start on this user gesture so browsers do not reject the score as autoplay.
    audio.playMusic('music-kindred-spirits');
    setGate(null);
    resume();
  }, [audio, gate, resume, startScene]);

  useGSAP(
    () => {
      if (!stageRef.current) {
        return;
      }

      // A rebuilt timeline replays from the start: the previous run's dialogue
      // must not linger (its labels will re-cue everything they need).
      useDialogueStore.getState().clear();

      const timeline = createSceneTimeline({
        root: stageRef.current,
        onComplete: markWaiting,
        onLabel: (label) => handleLabelRef.current(label),
        onGate: (nextGate) => handleGateRef.current(nextGate),
        // The timeline only learns *where* to wait; the dialogue system owns
        // the text and resumes the story when a line resolves.
        holdLineIds: storyHoldingLineIds,
        paused: true,
        reducedMotion,
      });
      attachTimeline({
        play: () => timeline.play(),
        pause: () => timeline.pause(),
        resume: () => timeline.resume(),
        restart: () => timeline.restart(),
        isRunning: () => !timeline.paused() && timeline.progress() < 1,
      });
      timeline.play(0);

      return () => {
        attachTimeline(null);
      };
    },
    { scope: stageRef, dependencies: [attachTimeline, markWaiting, reducedMotion] },
  );

  const inspectedIds = new Set(
    completedInteractions.filter((id) => id === 'rock-a' || id === 'rock-b' || id === 'rock-c'),
  );

  return (
    <main
      className="scene"
      data-scene={scene01Config.id}
      data-status={status}
      data-reduced-motion={reducedMotion}
    >
      <div className="stage" ref={stageRef}>
        <div className="stage__world" data-stage-world data-sky-phase="space">
          <StageLayers>
            <SkyEvents reducedMotion={reducedMotion} />
            <div className="stage__actors">
              <Percy state="idle" />
              <div className="rocks" role="group" aria-label="Three rocks to inspect">
                {rocksConfig.map((rock) => (
                  <Rock
                    key={rock.id}
                    config={rock}
                    inspected={inspectedIds.has(rock.id)}
                    onInspect={handleRockClick}
                    disabled={status !== 'waiting' || focusedRockId !== null}
                    sonarMode={getSonarMode({
                      status,
                      inspected: inspectedIds.has(rock.id),
                      paused: isPaused,
                      cardOpen: openCardId !== null,
                    })}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </div>
            </div>
          </StageLayers>
        </div>
        <Dust />
        <div className="stage__vignette" aria-hidden="true" />
        <OpeningTitle />
      </div>

      {/* UI overlays */}
      {status === 'waiting' ? <Progress /> : null}
      {gate === null && status !== 'idle' ? <PlaybackControls /> : null}

      {/* Continue control — only when the rocks are ready, and gated by canContinue */}
      {status === 'waiting' ? (
        <ContinueControl requiredInteractions={scene01Config.requiredInteractions} />
      ) : null}

      {/* Dim transition overlay when completed */}
      <DimTransition />

      {/* Circular gate — the only way past the opening title */}
      {gate ? (
        <CircularGate
          label="Continue to Mars"
          hint="Press to land"
          placement="opening"
          onActivate={handleGate}
        />
      ) : null}

      {/* Dialogue: cream crayon overlay, no panel or speaker label. The scene
          only cues lines; the dialogue system owns everything visible here. */}
      <DialogueLayer />

      {/* Fact card — only one open at a time */}
      {openCardId ? (
        <FactCard
          card={interactions.find((i) => i.id === openCardId) as import('./interactions').InteractionCard}
          onClose={handleCardClose}
          returnFocusTo={document.querySelector(`[data-rock="${openCardId}"]`) as HTMLElement | null}
        />
      ) : null}
    </main>
  );
}
