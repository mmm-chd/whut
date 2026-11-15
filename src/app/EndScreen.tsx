import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { P08_CONTENT } from '../scenes/scene-09-waiting-sample/content';
import { P08_SCENE_ID } from '../scenes/scene-09-waiting-sample/scene.config';
import { useStoryStore } from '../stores/story.store';
import { performEndingAction, type EndingAction } from './storyEnding';
import './EndScreen.css';

const SAMPLING_SCENE_ID = 'scene-06-sample-workflow';
const RUNNER_SCENE_ID = 'scene-08-the-runner';

export function EndScreen() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const afterSampling = useStoryStore((state) => state.activeSceneId === SAMPLING_SCENE_ID);
  const afterRunner = useStoryStore((state) => state.activeSceneId === RUNNER_SCENE_ID);
  const isEnding = useStoryStore((state) => state.activeSceneId === P08_SCENE_ID);

  if (isEnding) {
    return <StoryEnding reducedMotion={reducedMotion} />;
  }

  return (
    <motion.div
      className="end-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.4 }}
    >
      <div className="end-screen__card">
        <h2 className="end-screen__title">To be continued...</h2>
        <p className="end-screen__subtitle">
          {afterRunner
            ? 'Percy reached the destination you chose. The next chapter is in development.'
            : afterSampling
              ? 'Percy has his samples safe in their tubes. The next chapter of his story is in development.'
              : 'Percy and Ginny are on their way to Mars. The next chapter of their story is in development.'}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * The story's last card, shown after the ending has faded to black. It comes up
 * slowly out of that black, says where Percy and his samples stand, and offers
 * exactly two ways on. Neither button celebrates: the samples are still waiting.
 */
function StoryEnding({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Latched before anything is dispatched, so a quick double click does one thing.
  const acceptedRef = useRef(false);
  const [pending, setPending] = useState<EndingAction | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const choose = (action: EndingAction) => {
    if (acceptedRef.current) {
      return;
    }
    acceptedRef.current = true;
    setPending(action);
    if (!performEndingAction(action)) {
      acceptedRef.current = false;
      setPending(null);
    }
  };

  return (
    <motion.div
      className="end-screen end-screen--ending"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.8 }}
      data-end-variant="perseverance-ending"
    >
      <div className="end-screen__card">
        <h2 className="end-screen__title" ref={headingRef} tabIndex={-1}>
          {P08_CONTENT.endingTitle}
        </h2>
        <p className="end-screen__subtitle">{P08_CONTENT.endingBody}</p>
        <div className="end-screen__actions">
          <button
            type="button"
            className="end-screen__button"
            data-primary
            data-action="replay-story"
            disabled={pending !== null}
            onClick={() => choose('replay-story')}
          >
            Replay Story
          </button>
          <button
            type="button"
            className="end-screen__button"
            data-action="back-to-start"
            disabled={pending !== null}
            onClick={() => choose('back-to-start')}
          >
            Back to Start
          </button>
        </div>
      </div>
    </motion.div>
  );
}
