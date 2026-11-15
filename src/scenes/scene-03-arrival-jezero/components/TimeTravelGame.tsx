import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AssetImage } from '../../../assets/AssetLoader';
import { LAST_STOP, TIME_STOPS } from '../timeTravel';

interface TimeTravelGameProps {
  /** The reader reached the lake and chose to go on. */
  readonly onDone: () => void;
}

const BOWL = 'M0 62C40 58 62 70 84 112C100 142 122 156 160 156C198 156 220 142 236 112C258 70 280 58 320 62';

/** Side view of the crater: the floor, the walls, and a lake that rises as time runs back. */
function SideView({ water }: { readonly water: number }) {
  // Water surface y, from the floor (dry) to just under the rim.
  const surface = 156 - water * 84;
  return (
    <svg className="tt-picture" viewBox="0 0 320 200" role="img" aria-label="A cut through Jezero crater. The lake rises as you go back in time.">
      <rect width="320" height="200" fill="#e9b88a" />
      <path d={`${BOWL}V200H0Z`} fill="#a8523b" />
      <clipPath id="tt-bowl">
        <path d={`${BOWL}V0H0Z`} />
      </clipPath>
      <g clipPath="url(#tt-bowl)">
        <rect x="0" y={surface} width="320" height="120" fill="#4c9fd0" opacity="0.9" style={{ transition: 'y 700ms ease' }} />
        <rect x="0" y={surface} width="320" height="4" fill="#e8f6ff" opacity="0.9" style={{ transition: 'y 700ms ease' }} />
      </g>
      <path d={BOWL} fill="none" stroke="#7b4636" strokeWidth="3" />
      <text x="160" y="188" textAnchor="middle" fontSize="13" fill="#3b2118" fontFamily="Segoe Print, Comic Sans MS, cursive">
        Crater from the side
      </text>
    </svg>
  );
}

/** Top view: the crater ring, the delta fan, the lake, and a pin for where Percy looked. */
function TopView({ water, pin }: { readonly water: number; readonly pin: { readonly x: number; readonly y: number } }) {
  return (
    <svg className="tt-picture" viewBox="0 0 320 160" role="img" aria-label="Jezero crater seen from above, with the river delta on its left side.">
      <rect width="320" height="160" fill="#e9b88a" />
      <ellipse cx="160" cy="76" rx="124" ry="62" fill="#c9714f" stroke="#7b4636" strokeWidth="3" />
      <ellipse cx="160" cy="76" rx={Math.max(0.1, 100 * water)} ry={Math.max(0.1, 50 * water)} fill="#4c9fd0" opacity="0.9" style={{ transition: 'rx 700ms ease, ry 700ms ease' }} />
      <path d="M44 66C70 52 92 62 98 76C92 94 70 102 44 88Z" fill="#8e3a2b" opacity="0.8" />
      <text x="56" y="80" fontSize="11" fill="#fff6e2" fontFamily="Segoe Print, Comic Sans MS, cursive">
        delta
      </text>
      <g style={{ transform: `translate(${(pin.x / 100) * 320}px, ${(pin.y / 100) * 140}px)`, transition: 'transform 500ms ease' }}>
        <circle r="9" fill="#fff6e2" stroke="#3b2118" strokeWidth="3" />
        <circle r="3.5" fill="#d9442b" />
      </g>
      <text x="160" y="153" textAnchor="middle" fontSize="12" fill="#3b2118" fontFamily="Segoe Print, Comic Sans MS, cursive">
        Crater from above
      </text>
    </svg>
  );
}

/**
 * The time slider. One input, six stops. Percy rides above the thumb and says
 * the date of what he found there; the two pictures and the card follow the stop.
 */
export function TimeTravelGame({ onDone }: TimeTravelGameProps) {
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const [furthest, setFurthest] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const stop = TIME_STOPS[index];
  const found = furthest >= LAST_STOP;

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  const go = (next: number) => {
    const clamped = Math.min(LAST_STOP, Math.max(0, next));
    setIndex(clamped);
    setTouched(true);
    setFurthest((value) => Math.max(value, clamped));
  };

  const trackStyle = { '--tt-ratio': String(index / LAST_STOP) } as CSSProperties;

  return (
    <section className="tt" aria-label="Travel back in time with Percy" data-time-travel data-stop={stop.id}>
      <h2 className="tt-heading">Travel back in time</h2>

      <div className="tt-grid">
        <figure className="tt-card tt-card--side">
          <SideView water={stop.water} />
        </figure>
        <figure className="tt-card tt-card--top">
          <TopView water={stop.water} pin={stop.pin} />
        </figure>
        <div className="tt-card tt-card--info" role="status" aria-live="polite" data-stop-card={stop.id}>
          <h3 className="tt-title">{stop.title}</h3>
          <p className="tt-body">{stop.body}</p>
          <p className="tt-source">Source: {stop.source}</p>
        </div>
      </div>

      <div className="tt-track" style={trackStyle}>
        <div className="tt-percy" data-hop={touched ? 'false' : 'true'}>
          <p className="tt-bubble" data-percy-bubble>
            {stop.bubble}
          </p>
          <AssetImage assetId="rover" alt="Percy the rover" className="tt-percy-image" />
        </div>
        <input
          ref={inputRef}
          className="tt-slider"
          type="range"
          min={0}
          max={LAST_STOP}
          step={1}
          value={index}
          aria-label="Years ago"
          aria-valuetext={stop.axis}
          onChange={(event) => go(Number(event.target.value))}
        />
        <ol className="tt-ticks">
          {TIME_STOPS.map((entry, tick) => (
            <li key={entry.id} data-active={tick === index ? 'true' : 'false'}>
              <button type="button" className="tt-tick" onClick={() => go(tick)}>
                {entry.axis}
              </button>
            </li>
          ))}
        </ol>
      </div>

      {!touched ? <p className="tt-hint">Slide to go back in time!</p> : null}
      {found ? (
        <button type="button" className="tt-done" data-time-travel-done onClick={onDone}>
          Percy found it!
        </button>
      ) : null}
    </section>
  );
}
