export type SceneStatus = 'idle' | 'playing' | 'waiting' | 'completed';

export interface SceneAssets {
  critical: string[];
  deferred: string[];
}

export interface SceneConfig {
  id: string;
  title: string;
  requiredInteractions: string[];
  assets: SceneAssets;
}

export interface StorySettings {
  muted: boolean;
  volume: number;
  reducedMotion: boolean;
}
