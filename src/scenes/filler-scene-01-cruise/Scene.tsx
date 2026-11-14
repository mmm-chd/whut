import { WebGLStage } from '../../three/WebGLStage';
import { cruiseWorldTextureIds } from './assets';
import { CruiseWorld } from './World';
import { useStoryStore } from '../../stores/story.store';
import { cruiseSceneConfig } from './scene.config';
import './Scene.css';

/**
 * Entry scaffold for the cruise filler. It stays in `playing` and never
 * completes automatically; the full journey sequence is a later milestone.
 */
export function CruiseEntryScene() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);

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
      </div>
    </main>
  );
}
