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
  /** Share of the master volume given to narration (0..1). */
  voiceVolume?: number;
  /** Share of the master volume given to the background music (0..1). */
  musicVolume?: number;
  reducedMotion: boolean;
}
