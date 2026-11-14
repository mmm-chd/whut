import { scene01Config } from '../scenes/scene-01-jezero/scene.config';
import { scene02Config } from '../scenes/scene-02-launch-to-mars/scene.config';
import { cruiseSceneConfig } from '../scenes/filler-scene-01-cruise/scene.config';
import { getScene, registerScene } from './SceneRegistry';

const storyConfigs = [scene01Config, scene02Config, cruiseSceneConfig];

export function ensureScenesRegistered(): void {
  for (const config of storyConfigs) {
    if (!getScene(config.id)) {
      registerScene(config);
    }
  }
}
