import { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useStoryStore } from '../stores/story.store';
import {
  NarrativeControllerContext,
  type NarrativeControllerApi,
  type PausableTimeline,
} from './narrativeControllerContext';

export function NarrativeController({ children }: { children: ReactNode }) {
  const timelineRef = useRef<PausableTimeline | null>(null);
  const setStatus = useStoryStore((state) => state.setStatus);
  const setPaused = useStoryStore((state) => state.setPaused);
  const resetScene = useStoryStore((state) => state.resetScene);
  const status = useStoryStore((state) => state.status);

  const start = useCallback(() => {
    resetScene();
    setStatus('playing');
    timelineRef.current?.play?.();
  }, [resetScene, setStatus]);

  const pause = useCallback(() => {
    setPaused(true);
    timelineRef.current?.pause?.();
  }, [setPaused]);

  const resume = useCallback(() => {
    setPaused(false);
    timelineRef.current?.resume?.();
  }, [setPaused]);

  const replay = useCallback(() => {
    resetScene();
    setStatus('playing');
    timelineRef.current?.restart?.();
  }, [resetScene, setStatus]);

  const markWaiting = useCallback(() => {
    setStatus('waiting');
  }, [setStatus]);

  const completeScene = useCallback(() => {
    if (status !== 'waiting') {
      return;
    }
    setStatus('completed');
  }, [setStatus, status]);

  const attachTimeline = useCallback((timeline: PausableTimeline | null) => {
    timelineRef.current = timeline;
  }, []);

  const isTimelineRunning = useCallback(() => {
    return timelineRef.current?.isRunning?.() ?? false;
  }, []);

  const api = useMemo<NarrativeControllerApi>(
    () => ({
      start,
      pause,
      resume,
      replay,
      markWaiting,
      completeScene,
      attachTimeline,
      isTimelineRunning,
    }),
    [start, pause, resume, replay, markWaiting, completeScene, attachTimeline, isTimelineRunning],
  );

  return (
    <NarrativeControllerContext.Provider value={api}>
      {children}
    </NarrativeControllerContext.Provider>
  );
}
