import { scene01Config } from '../scenes/scene-01-jezero/scene.config';
import { getScene, registerScene } from './SceneRegistry';

export function ensureScenesRegistered(): void {
  if (!getScene(scene01Config.id)) {
    registerScene(scene01Config);
  }
}
