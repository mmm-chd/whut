import { useEffect, useState } from 'react';
import { AssetImage } from '../../assets/AssetLoader';
import { PlaybackControls } from '../../components/story-controls/PlaybackControls';
import { useStoryStore } from '../../stores/story.store';
import { WebGLStage } from '../../three/WebGLStage';
import { P02_CLOSEUP, P02_ROCKET, P02_WINDOW } from '../scene-02-launch-to-mars/camera';
import { cruiseWorldTextureIds } from './assets';
import { CRUISE_BLOCKS, CRUISE_DONE_PAUSE_MS, CRUISE_FACTS } from './content';
import { cruiseSceneConfig } from './scene.config';
import { CruiseWorld } from './World';
import './Scene.css';

/** The window clip used by P-02, as percentages of the window box. */
const WINDOW_CLIP = 'ellipse(30% 28.8% at 50.1% 45.4%)';
const WINDOW_SCALE = P02_WINDOW.size / P02_CLOSEUP.window.size;

const pct = (value: number, of: number) => `${(value / of) * 100}%`;
const windowBox = (box: { left: number; top: number; width: number; height: number }) => ({
  left: pct(box.left * WINDOW_SCALE, P02_WINDOW.size),
  top: pct(box.top * WINDOW_SCALE, P02_WINDOW.size),
  width: pct(box.width * WINDOW_SCALE, P02_WINDOW.size),
  height: pct(box.height * WINDOW_SCALE, P02_WINDOW.size),
});

/** Where the three nozzles end, in the sideways ship's design units (the ship is 876 x 292). */
const NOZZLES = [
  { x: 27, y: 104, length: 160, thick: 1.5 },
  { x: 34, y: 146, length: 210, thick: 1.6 },
  { x: 27, y: 188, length: 160, thick: 1.5 },
] as const;

/**
 * One tongue of exhaust, pointing left from a nozzle: a soft glow, three nested
 * shapes (orange, amber, cream) that flicker out of step, and a spark or two
 * that drift back and fade. Flat shapes in the story's warm paper palette.
 */
function Tongue({ index }: { readonly index: number }) {
  const gradient = `cruise-glow-${index}`;
  return (
    <svg className="cruise-flame" viewBox="0 0 160 40" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={gradient} cx="92%" cy="50%" r="70%">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="#f39a52" stopOpacity="0.22" />
          <stop offset="1" stopColor="#f39a52" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse className="cruise-flame__glow" cx="140" cy="20" rx="46" ry="19" fill={`url(#${gradient})`} />
      <g className="cruise-flame__tongue cruise-flame__tongue--outer">
        <path d="M160 9C132 5 92 10 52 18C30 19 14 20 2 20C14 20 30 21 52 22C92 30 132 35 160 31Z" fill="#e2603a" />
      </g>
      <g className="cruise-flame__tongue cruise-flame__tongue--mid">
        <path d="M160 13C136 10 106 14 76 19C58 19.5 46 20 38 20C46 20 58 20.5 76 21C106 26 136 30 160 27Z" fill="#f5a03c" />
      </g>
      <g className="cruise-flame__tongue cruise-flame__tongue--core">
        <path d="M160 16C142 14 122 17 104 19.5C94 20 88 20 82 20C88 20 94 20 104 20.5C122 23 142 26 160 24Z" fill="#fff0c4" />
      </g>
      <circle className="cruise-flame__spark" cx="46" cy="20" r="2.2" fill="#ffd36b" style={{ animationDelay: `${index * 0.37}s` }} />
    </svg>
  );
}

/** The exhaust: one tongue per nozzle, drawn behind the rocket so each starts at its bell. */
function Flame() {
  return (
    <div className="cruise-flames" aria-hidden="true">
      {NOZZLES.map((nozzle, index) => (
        <div
          key={index}
          className="cruise-flames__slot"
          style={{
            left: `calc(var(--u) * ${nozzle.x - nozzle.length})`,
            top: `calc(var(--u) * ${nozzle.y - 20 * (nozzle.length / 160) * nozzle.thick})`,
            width: `calc(var(--u) * ${nozzle.length})`,
            height: `calc(var(--u) * ${40 * (nozzle.length / 160) * nozzle.thick})`,
          }}
        >
          <Tongue index={index} />
        </div>
      ))}
    </div>
  );
}

/**
 * Percy and Ginny's rocket, lying on its side and flying to the right. The
 * rocket is the P-02 art turned a quarter; the window keeps its two riders
 * upright so a child can see who is inside.
 */
function Ship() {
  const { width: w, height: h } = P02_ROCKET;
  // The window centre, turned a quarter clockwise with the rocket: (x, y) -> (h - y, x).
  const cx = h - (P02_WINDOW.offsetTop + P02_WINDOW.size / 2);
  const cy = P02_WINDOW.offsetLeft + P02_WINDOW.size / 2;
  return (
    <div className="cruise-ship" aria-hidden="true" data-cruise-ship>
      <Flame />
      <div className="cruise-ship__body">
        <AssetImage
          assetId="p02-rocket"
          alt=""
          className="cruise-ship__rocket"
          style={{ width: pct(w, h), height: pct(h, w) }}
        />
        <div
          className="cruise-ship__window"
          style={{
            left: pct(cx - P02_WINDOW.size / 2, h),
            top: pct(cy - P02_WINDOW.size / 2, w),
            width: pct(P02_WINDOW.size, h),
            height: pct(P02_WINDOW.size, w),
          }}
        >
          <div className="cruise-ship__inside" style={{ clipPath: WINDOW_CLIP }}>
            <AssetImage assetId="p02-window-bg" alt="" className="cruise-ship__fill" />
            <AssetImage
              assetId="p02-percy"
              alt=""
              className="cruise-ship__rider"
              style={windowBox(P02_CLOSEUP.percy)}
            />
            <AssetImage
              assetId="p02-ginny"
              alt=""
              className="cruise-ship__rider"
              style={windowBox(P02_CLOSEUP.ginny)}
            />
          </div>
          <AssetImage assetId="p02-window-frame" alt="" className="cruise-ship__fill" />
        </div>
      </div>
    </div>
  );
}

/**
 * The cruise filler. The reader clicks the "Did you know?" card to read the next
 * of three facts; each click fills one block of the bar. When the bar is full the
 * story moves on to Mars by itself. Nothing advances on a timer except that last pause.
 */
export function CruiseEntryScene() {
  const reducedMotion = useStoryStore((state) => state.settings.reducedMotion);
  const paused = useStoryStore((state) => state.isPaused);
  const [filled, setFilled] = useState(0);
  const arrived = filled >= CRUISE_BLOCKS;
  const fact = CRUISE_FACTS[Math.min(filled, CRUISE_FACTS.length - 1)];
  const lastFact = filled >= CRUISE_FACTS.length - 1;

  const discoverMore = () => {
    if (paused || arrived) {
      return;
    }
    setFilled((value) => value + 1);
  };

  useEffect(() => {
    if (!arrived || paused) {
      return;
    }
    const timer = window.setTimeout(() => {
      const { setStatus } = useStoryStore.getState();
      // playing -> waiting -> completed: the legal route to a scene hand-off.
      setStatus('waiting');
      setStatus('completed');
    }, CRUISE_DONE_PAUSE_MS);
    return () => window.clearTimeout(timer);
  }, [arrived, paused]);

  return (
    <main
      className="cruise-scene"
      data-scene={cruiseSceneConfig.id}
      data-reduced-motion={reducedMotion}
      data-filled={filled}
    >
      <WebGLStage
        label="Deep space with stars. A small rocket drifts across."
        background="#0b1020"
        preload={cruiseWorldTextureIds}
      >
        <CruiseWorld reducedMotion={reducedMotion} />
      </WebGLStage>

      <h1 className="sr-only">Sit tight, it&rsquo;s gonna take a while~</h1>

      <div className="cruise-know-wrap">
        <button
          type="button"
          className="cruise-know"
          data-cruise-fact
          aria-label={`Did you know? ${fact.text} ${arrived ? '' : lastFact ? 'Press to finish the trip.' : 'Press for the next fact.'}`}
          disabled={arrived}
          onClick={discoverMore}
        >
          <span className="cruise-know__title">Did you know?</span>
          <span className="cruise-know__text" key={fact.text}>
            {fact.text}
          </span>
        </button>
        {arrived ? null : (
          <button type="button" className="cruise-hint" data-cruise-hint onClick={discoverMore}>
            Click to discover more
          </button>
        )}
      </div>

      <div className="cruise-flight">
        <Ship />
      </div>

      <div className="cruise-bottom">
        <div
          className="cruise-bar"
          role="progressbar"
          aria-label="Trip to Mars"
          aria-valuemin={0}
          aria-valuemax={CRUISE_BLOCKS}
          aria-valuenow={filled}
        >
          {Array.from({ length: CRUISE_BLOCKS }, (_, index) => (
            <span key={index} className="cruise-bar__segment" data-on={index < filled ? 'true' : 'false'} />
          ))}
        </div>
        <p className="cruise-bottom__caption">{arrived ? 'We made it!' : 'Journey to Mars'}</p>
      </div>

      <PlaybackControls />
    </main>
  );
}
