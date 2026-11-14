import type { SceneConfig } from './types';

const scenes = new Map<string, SceneConfig>();

export function registerScene(config: SceneConfig): void {
  if (scenes.has(config.id)) {
    throw new Error(`Scene already registered: ${config.id}`);
  }
  scenes.set(config.id, config);
}

export function getScene(sceneId: string): SceneConfig | undefined {
  return scenes.get(sceneId);
}

export function listScenes(): SceneConfig[] {
  return [...scenes.values()];
}

export function clearSceneRegistry(): void {
  scenes.clear();
}
