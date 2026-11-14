import { createContext } from 'react';

export interface PausableTimeline {
  play?: () => void;
  pause?: () => void;
  resume?: () => void;
  restart?: () => void;
  /** True while the playhead is moving: attached, not paused, not finished. */
  isRunning?: () => boolean;
}

export interface NarrativeControllerApi {
  start: () => void;
  pause: () => void;
  resume: () => void;
  replay: () => void;
  markWaiting: () => void;
  completeScene: () => void;
  attachTimeline: (timeline: PausableTimeline | null) => void;
  /** True only when the attached timeline is actively playing. */
  isTimelineRunning: () => boolean;
}

export const NarrativeControllerContext = createContext<NarrativeControllerApi | null>(null);
