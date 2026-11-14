import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import './SkyEvents.css';

type SkyEventKind = 'meteor' | 'comet';

/** Which world band a streak lives in. Space-phase spawns ride the space
 *  band; sky-phase spawns ride the Mars sky band the camera rests on. */
type SkyEventBand = 'space' | 'mars';

interface SkyEventData {
  id: number;
  kind: SkyEventKind;
  band: SkyEventBand;
  style: SkyEventStyle;
}

type SkyEventStyle = CSSProperties & {
  '--ev-x': string;
  '--ev-y': string;
  '--ev-angle': string;
  '--ev-length': string;
  '--ev-thickness': string;
  '--ev-head': string;
  '--ev-travel': string;
  '--ev-drop': string;
  '--ev-drop-ease': string;
  '--ev-duration': string;
};

interface SkyEventsProps {
  reducedMotion?: boolean;
}

/** Comet share of spawns; the rest are meteors. */
const COMET_PROBABILITY = 0.22;
/** A comet is forced when none has appeared for this long. */
const COMET_MAX_GAP_MS = 26_000;
/** Cap on streaks kept in the DOM at once. */
const MAX_CONCURRENT = 6;

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * One random streak across the sky.
 *
 * Meteors: small, fast, warm cream, steep diagonal. Comets: large, slow, icy
 * cyan with a coma glow, shallow angle plus a sinking arc (the body drifts
 * down with an ease-in while the shell travels along its axis).
 */
function createEvent(id: number, kind: SkyEventKind, band: SkyEventBand): SkyEventData {
  const goingRight = Math.random() < 0.5;
  const angle = kind === 'meteor'
    ? goingRight ? rand(18, 52) : rand(128, 162)
    : goingRight ? rand(5, 18) : rand(162, 175);
  const head = kind === 'meteor' ? rand(4, 6) : rand(10, 14);
  const style: SkyEventStyle = {
    '--ev-x': `${goingRight ? rand(0, 55) : rand(40, 92)}%`,
    '--ev-y': `${rand(2, 30)}%`,
    '--ev-angle': `${angle}deg`,
    '--ev-length': `${kind === 'meteor' ? rand(60, 140) : rand(220, 380)}px`,
    '--ev-thickness': `${kind === 'meteor' ? 2 : head}px`,
    '--ev-head': `${head}px`,
    '--ev-travel': `${kind === 'meteor' ? rand(40, 68) : rand(55, 85)}vw`,
    '--ev-drop': kind === 'meteor' ? '0vh' : `${rand(4, 10)}vh`,
    '--ev-drop-ease': kind === 'meteor' ? 'linear' : 'ease-in',
    '--ev-duration': `${kind === 'meteor' ? rand(700, 1200) : rand(4000, 7000)}ms`,
  };
  return { id, kind, band, style };
}

export function SkyEvents({ reducedMotion = false }: SkyEventsProps) {
  const [events, setEvents] = useState<SkyEventData[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const nextIdRef = useRef(1);
  const lastCometRef = useRef(0);

  useEffect(() => {
    if (reducedMotion) {
      return;
    }

    let cancelled = false;
    let timer = 0;

    /**
     * Comets belong to space only; once the camera has reached the Mars sky
     * (data-sky-phase="sky" on the world), only meteors spawn. Streaks are
     * anchored to the world background, so their trails stay put in the sky
     * while the camera travels — they never follow the camera.
     */
    const isInSkyPhase = () =>
      containerRef.current
        ?.closest('[data-sky-phase]')
        ?.getAttribute('data-sky-phase') === 'sky';

    const spawn = () => {
      const now = Date.now();
      const inSky = isInSkyPhase();
      const band: SkyEventBand = inSky ? 'mars' : 'space';
      const forceComet = !inSky && now - lastCometRef.current >= COMET_MAX_GAP_MS;
      const kind: SkyEventKind = !inSky && (forceComet || Math.random() < COMET_PROBABILITY)
        ? 'comet'
        : 'meteor';
      if (kind === 'comet') {
        lastCometRef.current = now;
      }
      const id = nextIdRef.current;
      nextIdRef.current += 1;
      setEvents((prev) => [...prev.slice(-(MAX_CONCURRENT - 1)), createEvent(id, kind, band)]);
    };

    const schedule = () => {
      timer = window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        spawn();
        schedule();
      }, rand(2800, 8200));
    };
    schedule();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [reducedMotion]);

  const handleAnimationEnd = useCallback((id: number) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }, []);

  return (
    <div ref={containerRef} className="sky-events" data-sky-events aria-hidden="true">
      <div className="sky-events__band sky-events__band--space">
        {events
          .filter((event) => event.band === 'space')
          .map((event) => (
            <span
              key={event.id}
              className={`sky-event sky-event--${event.kind}`}
              style={event.style}
              onAnimationEnd={() => handleAnimationEnd(event.id)}
            >
              <span className="sky-event__body" />
            </span>
          ))}
      </div>
      <div className="sky-events__band sky-events__band--mars">
        {events
          .filter((event) => event.band === 'mars')
          .map((event) => (
            <span
              key={event.id}
              className={`sky-event sky-event--${event.kind}`}
              style={event.style}
              onAnimationEnd={() => handleAnimationEnd(event.id)}
            >
              <span className="sky-event__body" />
            </span>
          ))}
      </div>
    </div>
  );
}
