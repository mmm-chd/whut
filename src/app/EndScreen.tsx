import { motion } from 'motion/react';
import { useStoryStore } from '../stores/story.store';
import './EndScreen.css';

const SAMPLING_SCENE_ID = 'scene-06-sample-workflow';
const RUNNER_SCENE_ID = 'scene-08-the-runner';

export function EndScreen() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const afterSampling = useStoryStore((state) => state.activeSceneId === SAMPLING_SCENE_ID);
  const afterRunner = useStoryStore((state) => state.activeSceneId === RUNNER_SCENE_ID);

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
