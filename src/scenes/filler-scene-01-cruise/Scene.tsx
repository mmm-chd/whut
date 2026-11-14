import { WebGLStage } from '../../three/WebGLStage';
import { cruiseWorldTextureIds } from './assets';
import { CruiseWorld } from './World';
import { useStoryStore } from '../../stores/story.store';
import { cruiseSceneConfig } from './scene.config';
import './Scene.css';

/**
 * Entry scaffold for the cruise filler. The full journey (progress bar, "Did
 * you know?" cards, acceleration) is a later milestone and needs no input.
 *
 * Until it lands, the scaffold Continue below is the only way on to P-03.
 * Remove it, and complete the scene from the acceleration beat instead, when
 * the full cruise is implemented.
 */
export function CruiseEntryScene() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

  const continueToMars = () => {
    const { setStatus } = useStoryStore.getState();
    // playing -> waiting -> completed: the legal route to a scene hand-off.
    setStatus('waiting');
    setStatus('completed');
  };

  return (
    <main
      className="cruise-scene"
      data-scene={cruiseSceneConfig.id}
      data-reduced-motion={reducedMotion}
    >
      <WebGLStage
        label="Deep space with stars. A small rocket drifts across."
        background="#0b1020"
        preload={cruiseWorldTextureIds}
      >
        <CruiseWorld reducedMotion={reducedMotion} />
      </WebGLStage>
      <div className="cruise-scene__content">
        <p className="cruise-scene__eyebrow">On the way to Mars</p>
        <h2 className="cruise-scene__title">Sit tight, it&rsquo;s gonna take a while~</h2>
        <p className="cruise-scene__body">
          Percy and Ginny are cruising through space. Their next adventure is being prepared.
        </p>
        <button type="button" className="cruise-scene__continue" onClick={continueToMars}>
          Continue to Mars
        </button>
      </div>
    </main>
  );
}
