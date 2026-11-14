import gsap from 'gsap';
import { DESCENT_END_PERCENT } from './layout';
import type { P01Nodes } from './nodes';

export type SceneGate = 'title' | { kind: 'dialogue'; lineId: string };

export interface SceneTimelineOptions {
  /** Animation state the world reads (camera, parallax, Percy, layers). */
  nodes: P01Nodes;
  /** Only the DOM opening title is looked up here: `[data-title]`. */
  root: HTMLElement;
  onComplete: () => void;
  onLabel?: (label: string) => void;
  onGate?: (gate: SceneGate) => void;
  /**
   * Dialogue line ids whose gate pauses the timeline until the line resolves
   * (see dialogue.storyHoldingLineIds). The timeline only knows *where* to
   * wait; the dialogue system owns the text and reports the release.
   */
  holdLineIds?: readonly string[];
  paused?: boolean;
  reducedMotion?: boolean;
}

// A label callback must run before its dialogue pause. Keeping both at the
// exact same GSAP position can let the pause win and leave the dialogue
// component without an active line.
const DIALOGUE_GATE_DELAY = 0.01;

/**
 * P-01 timeline.
 *
 * The world is one tall vertical scroll: assets are pre-positioned (landscape
 * anchored to the world bottom) and never move — the camera (the scroll's
 * yPercent) is the POV that travels. Every asset spawns already in its final
 * position — no pan-in, no fade-in.
 * 0.0  space (alias sky)   camera at the top of the world: starfield + title
 * 3.3  gateTitle           timeline pauses with title and centered Continue visible
 * 3.3  title lifts away; narrator-01 types while the camera descends — one
 *      single camera move. Its manual gate is reached only after landing, so
 *      sky events are anchored to the
 *      world background (their trails stay put while the camera travels),
 *      and data-sky-phase flips to "sky" at land (7.0), so comets stop
 *      spawning from then on
 * 7.0  land (percyEnter)   camera rests on the surface; holds for two seconds
 * 9.0  zoomIn              camera 1 -> 1.12 about the screen centre
 * 10.4 narrator-02 (lookAround), held by its dialogue gate until Continue
 * 14.0 percyIntro, held by its dialogue gate — the gate inside this panel
 *      replaces the old centered intro gate
 * 18.0 panStart            camera zooms lightly and pans to the rocks
 * ~19.8 percyLine          Percy line cued mid-pan — it only enters the
 *                          dialogue system here; it stays until the player
 *                          continues and never holds the story
 * ~20.7 prompt             held by its dialogue gate until Continue
 */
export function createSceneTimeline({
  nodes,
  root,
  onComplete,
  onLabel,
  onGate,
  holdLineIds,
  paused = false,
  reducedMotion = false,
}: SceneTimelineOptions): gsap.core.Timeline {
  const q = gsap.utils.selector(root);
  const title = q('[data-title]');
  const { world, skyScroll, pan, percy, glow, fgV1, fgV2, flags } = nodes;

  const timeline = gsap.timeline({
    defaults: { ease: 'power2.out' },
    paused,
    onComplete,
  });

  const label = (name: string, position: number) => {
    timeline.addLabel(name, position);
    timeline.call(() => onLabel?.(name), [], position);
  };
  const round2 = (value: number) => Math.round(value * 100) / 100;
  const alias = (name: string, position: number) => timeline.addLabel(name, position);
  const gate = (name: SceneGate, position: number) => {
    timeline.addPause(position, () => onGate?.(name));
  };
  // Dialogue gates pause the timeline and report the owning line; the scene
  // binds that pause to the dialogue system (dialogue.holdStory), and the
  // story resumes when the line resolves. Automatic lines deliberately have
  // no pause, so their typewriter and the scene animation run concurrently.
  const holdingIds = new Set(holdLineIds ?? []);
  const dialogueGate = (lineId: string, position: number) => {
    if (!holdingIds.has(lineId)) {
      return;
    }
    timeline.addPause(position + DIALOGUE_GATE_DELAY, () => onGate?.({ kind: 'dialogue', lineId }));
  };

  const instant = reducedMotion ? 0.01 : 0;
  const descendDur = reducedMotion ? 0.5 : 3.4;
  const zoomDur = reducedMotion ? 0.01 : 1.2;
  const revealDur = reducedMotion ? 0.3 : 0.9;

  // --- Opening: space, title, first gate -------------------------------------
  // Everything spawns in its final position: the landscape is anchored to the
  // world bottom and the camera starts at the top of the world.
  timeline.set(world, { scale: 1, x: 0, y: 0, originX: 0.5, originY: 0.5 });
  timeline.set(skyScroll, { yPercent: 0 });
  // Sky events read this to decide between comets (space) and meteors (sky).
  timeline.set(flags, { skyPhase: 'space' }, 0);
  timeline.set(percy, { x: 0, y: 0, opacity: 1 });
  timeline.set(glow, { opacity: 0 });
  timeline.set(pan, { value: 0 });
  timeline.set(fgV1, { opacity: 1 });
  timeline.set(fgV2, { opacity: 0 });

  label('space', 0);
  alias('sky', 0);
  alias('title', 0.3);
  alias('titleOut', 3.31);

  gate('title', 3.3);
  alias('gateTitle', 3.3);

  // The first explicit Continue is directly below a still-visible title.
  // Its press lifts the paper title away before the camera begins descending.
  timeline.to(
    title,
    { opacity: 0, y: -34, rotate: 1.5, duration: reducedMotion ? instant : 0.5, ease: 'power2.in' },
    3.31,
  );

  // --- Descent: camera travels down the world -------------------------------
  // One single camera move: the scroll itself is the POV. -(160/260) = -61.54%
  // of the world height lands the world bottom exactly on the viewport bottom.
  // Streaks are NOT counter-translated: they keep their world position, so
  // their trails read clearly while the camera slides past them.
  label('descend', 3.31);
  timeline.to(
    skyScroll,
    { yPercent: DESCENT_END_PERCENT, duration: descendDur, ease: 'power2.inOut' },
    3.31,
  );

  // narrator-01 holds the story: its gate sits after the camera reaches Mars,
  // so Continue holds subsequent animation/dialogue only.
  dialogueGate('narrator-01', 7.0);

  // --- Landing and Percy -----------------------------------------------------
  // The camera has fully entered the Mars sky: from here on, sky events spawn
  // meteors only (data-sky-phase flips to "sky").
  label('land', 7.0);
  alias('percyEnter', 7.0);
  timeline.set(flags, { skyPhase: 'sky' }, 7.0);

  // --- Zoom, centred on the screen ------------------------------------------
  label('zoomIn', 9.0);
  timeline.to(
    world,
    { scale: reducedMotion ? 1 : 1.12, duration: zoomDur, ease: 'power2.inOut' },
    9.0,
  );

  label('narrator1', 10.4);
  alias('lookAround', 10.4);
  // narrator-02 holds the story until the player presses Continue.
  dialogueGate('narrator-02', 10.4);
  label('percyIntro', 14.0);
  // percy-01's gate replaces the old centered intro gate: the story waits
  // inside this dialogue line instead of a standalone gate.
  dialogueGate('percy-01', 14.0);

  // --- Pan to the rocks (one continuous world) ------------------------------
  // One progress value drives every layer; the world scales it by each layer's
  // parallax factor (layout.panShift), so a resize never desyncs the pan.
  const panStart = 18.0;
  const panDur = reducedMotion ? 0.5 : 2.6;
  const panEnd = panStart + panDur;
  const panEase = 'power2.inOut';

  label('panStart', panStart);
  timeline.to(world, { scale: reducedMotion ? 1 : 1.05, duration: panDur, ease: panEase }, panStart);
  timeline.to(pan, { value: 1, duration: panDur, ease: panEase }, panStart);

  // A small wheel bounce while he drives; skipped under reduced motion.
  if (!reducedMotion) {
    timeline.to(
      percy,
      { y: -4, duration: 0.26, yoyo: true, repeat: 3, ease: 'sine.inOut' },
      panStart + 0.35,
    );
  }

  label('percyLine', panStart + panDur * 0.3);
  // Foreground v1 -> v2 crossfade at 60-75% of the pan.
  const crossStart = panStart + panDur * 0.6;
  const crossEnd = panStart + panDur * 0.75;
  timeline.to(fgV2, { opacity: 1, duration: crossEnd - crossStart, ease: 'none' }, crossStart);
  timeline.to(fgV1, { opacity: 0, duration: crossEnd - crossStart, ease: 'none' }, crossStart);

  label('panEnd', round2(panEnd));

  // --- Rocks ready and interaction open -------------------------------------
  // The rocks are already in place (no reveal animation); the label keeps the
  // story beat and Percy reacts to reaching them.
  label('rocksReveal', round2(panEnd));
  timeline.to(
    percy,
    { y: -10, duration: reducedMotion ? 0.2 : 0.9, yoyo: true, repeat: 1, ease: 'power2.out' },
    panEnd,
  );
  timeline.to(glow, { opacity: 0.55, duration: 0.2, yoyo: true, repeat: 1, ease: 'sine.inOut' }, panEnd);
  label('prompt', round2(panEnd + 0.1));
  // percy-03's gate holds just after the pan stops, so the rocks are ready
  // when the player continues.
  dialogueGate('percy-03', round2(panEnd + 0.1));

  // Keep revealDur so the waiting label lands at the same time as before,
  // even though there is no reveal tween anymore.
  const revealEnd = panEnd + revealDur + (reducedMotion ? 0 : 0.24);
  timeline.to({}, { duration: 1 }, revealEnd);
  label('waiting', round2(revealEnd + 1));

  return timeline;
}
