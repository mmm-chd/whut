/**
 * Camera and stage geometry for P-02.
 *
 * The design frame is 1920x1080. A world point maps to the screen with:
 *
 *   screenX = 960 + (worldX - centerX) * scale
 *   screenY = 540 + (worldY - centerY) * scale
 *
 * The stage fit scale is separate from the camera scale: the fit scales the
 * whole design frame into the host, while the camera selects which part of
 * that frame the shot shows.
 */
export const P02_DESIGN_WIDTH = 1920;
export const P02_DESIGN_HEIGHT = 1080;

/**
 * Measured from the pulled P-02 art. `rocket-full-body.png` is 724 x 2172,
 * but the visible body occupies x 224-496 and y 58-2108. A 292 x 876 box
 * therefore shows a 110 px wide, 826 px tall body; the nozzle sits at y=900.
 * This is the launch/ascent box. The establishing shot scales it up around
 * the visible nozzle so the fairing matches the reference composition.
 */
export const P02_ROCKET = {
  centerX: 960,
  top: 51,
  width: 292,
  height: 876,
  nozzleY: 900,
} as const;

/**
 * Establishing shot transform for the same rocket box.
 *
 * The reference P-02-00 shows a 140 px wide fairing with its nose at y=200
 * and the window centred at y~426. Scaling the 82 px fairing by 1.709 and
 * moving it down 711 px around the visible nozzle reaches that composition;
 * the lower stage then falls below the frame, as in the reference.
 */
export const P02_ROCKET_ESTABLISHING = {
  scale: 1.709,
  offsetY: 711,
  originY: 97,
} as const;

/**
 * Circular window on the fairing. `offsetTop`/`offsetLeft` are relative to
 * the rocket box; `establishingCenterY` is where the visible ring centre
 * lands after the establishing transform. The frame asset has transparent
 * padding, so a 118 px element shows a ~79 px ring at launch scale and a
 * ~131-135 px ring in the establishing shot (reference: ~131 x 128, centre
 * (957, 426)).
 */
export const P02_WINDOW = {
  centerX: 960,
  establishingCenterY: 426,
  size: 118,
  offsetLeft: 86.5,
  offsetTop: 102.2,
} as const;

/**
 * Land layers (sea, ground, service tower, lattice towers) share one group.
 * The establishing reference frames the upper rocket, so its horizon sits at
 * y~1000; the launch shot needs the full rocket standing on the pad, so the
 * horizon sits at y~765. The group is moved down by `establishingOffsetY`
 * for the establishing shot and returns to 0 with the rocket at countdown.
 * CSS positions inside the group are launch (native) coordinates.
 */
export const P02_LAND = {
  establishingOffsetY: 222,
} as const;

/**
 * Dedicated close-up shot. This is not a camera zoom: the fairing, window and
 * characters are laid out at their final size so the frame asset and the
 * 573/627 px character art stay sharp. Measured on `Scene_ P-02 - 1.png` and
 * `Scene_ P-02 - 2.png`:
 *
 * - fairing ~432 px wide (x 226-658), nose tip y 150, collar y~975;
 * - window ring outer ~386 px, inner ~347 px, centre (433, 748);
 * - rover ~250 x 202 at x 355-605, y 710-912;
 * - Ginny's solar panel x 307-435, top y 811.
 *
 * The source fairing (`rocket-half-body.png`, 150 x 440 px from nose to
 * collar) is slimmer than the reference fairing (432 x 825), so `head`
 * scales x by 2.88 and y by 1.875 and is drawn with `object-fit: fill`.
 * The fairing art is soft gradients, so 2.88x stays clean; the vertical
 * factor is lower than before, which reduces magnification.
 *
 * `head` and `window` are design pixels in the 1920x1080 frame. `percy` and
 * `ginny` are relative to the window box.
 */
export const P02_CLOSEUP = {
  head: { left: -320, top: 71, width: 1535, height: 1706 },
  window: { left: 141, top: 482.3, size: 584 },
  percy: { left: 174, top: 210, width: 368, height: 281 },
  ginny: { left: 95, top: 317, width: 270, height: 152 },
} as const;

/**
 * `rocket-tower-frame.png` is 565 x 610 with the ring at x 78-488, y 74-481
 * and the glass hole at x 105-461, y 106-448. With `object-fit: contain` in a
 * square box of size S, one source pixel is S/610 design pixels.
 */
export const P02_WINDOW_FRAME = {
  canvas: { width: 565, height: 610 },
  ring: { left: 78, top: 74, width: 411, height: 408 },
  hole: { left: 105, top: 106, width: 356, height: 342 },
  /** Ring centre as a fraction of the box height. */
  centreY: 277.5 / 610,
} as const;

/**
 * `tower-front.png` (1034 x 942) holds two lattice towers with transparent
 * padding. These are the visible bounds of each tower inside the canvas, so a
 * sprite wrapper can show one tower at an exact design size instead of
 * stretching the whole sheet.
 */
export const P02_TOWER_SPRITE = {
  sheet: { width: 1034, height: 942 },
  tall: { left: 0, top: 29, width: 170, height: 907 },
  short: { left: 764, top: 182, width: 171, height: 751 },
} as const;

export interface P02TowerPlacement {
  sprite: 'tall' | 'short';
  /** Design x of the tower's visible left edge. */
  left: number;
  /** Design y of the tower's visible top edge (antenna tip). */
  top: number;
  /** Visible tower height in design pixels. */
  height: number;
}

/**
 * Four lattice towers as measured on `Scene_ P-02-00.png`, in the reference
 * frame's coordinates. The bases sit below the frame edge, as in the
 * reference. Stage subtracts `P02_LAND.establishingOffsetY` because the land
 * group is shifted down by that amount in the establishing shot. Order is
 * back to front.
 */
export const P02_ESTABLISHING_TOWERS: readonly P02TowerPlacement[] = [
  { sprite: 'short', left: 470, top: 489, height: 611 },
  { sprite: 'tall', left: 528, top: 340, height: 760 },
  { sprite: 'short', left: 1344, top: 627, height: 473 },
  { sprite: 'tall', left: 1258, top: 484, height: 616 },
];

/** A plain box for a whole-canvas sprite such as `tower.png`. */
export interface P02Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Service tower (`tower.png`, 1011 x 715, visible x 234-911, y 148-714) in
 * the establishing reference: platform x 763-1285, top platform y~640, pipes
 * running off the bottom edge. Reference-frame coordinates, like the towers.
 */
export const P02_ESTABLISHING_SERVICE_TOWER: P02Box = {
  left: 545,
  top: 518,
  width: 822,
  height: 581,
};

/**
 * Close-up background, measured on `Scene_ P-02 - 1.png`: the service tower's
 * three platforms stand behind the right side of the fairing (right edge
 * x~747, platforms at y~620, 745, 915), a tall lattice tower stands at
 * x 820-976, and a tall/short pair is cut by the left frame edge.
 */
export const P02_CLOSEUP_SERVICE_TOWER: P02Box = {
  left: -20,
  top: 494,
  width: 852,
  height: 603,
};

export const P02_CLOSEUP_TOWERS: readonly P02TowerPlacement[] = [
  { sprite: 'short', left: 27, top: 450, height: 690 },
  { sprite: 'tall', left: -57, top: 140, height: 1000 },
  { sprite: 'tall', left: 820, top: 310, height: 830 },
];

/** Sprite wrapper geometry for one tower at a placement. */
export function p02TowerSpriteStyle(
  placement: P02TowerPlacement,
  offsetY = 0,
): {
  wrapper: P02Box;
  image: P02Box;
} {
  const sprite = P02_TOWER_SPRITE[placement.sprite];
  const scale = placement.height / sprite.height;
  const sheet = P02_TOWER_SPRITE.sheet;

  return {
    wrapper: {
      left: placement.left,
      top: placement.top - offsetY,
      width: sprite.width * scale,
      height: placement.height,
    },
    image: {
      left: -sprite.left * scale,
      top: -sprite.top * scale,
      width: sheet.width * scale,
      height: sheet.height * scale,
    },
  };
}

export interface P02CameraPose {
  centerX: number;
  centerY: number;
  scale: number;
}

export const P02_CAMERA = {
  establishing: { centerX: 960, centerY: 540, scale: 1 },
  launch: { centerX: 960, centerY: 560, scale: 1 },
  ascent: { centerX: 960, centerY: -300, scale: 0.5 },
} as const satisfies Record<string, P02CameraPose>;

export interface P02StageFit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface P02Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function fitP02Stage(width: number, height: number): P02StageFit {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { scale: 0, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(width / P02_DESIGN_WIDTH, height / P02_DESIGN_HEIGHT);
  return {
    scale,
    offsetX: (width - P02_DESIGN_WIDTH * scale) / 2,
    offsetY: (height - P02_DESIGN_HEIGHT * scale) / 2,
  };
}

/**
 * Offscreen means the attached visual bottom has cleared the viewport top by
 * the safety margin. Bounds must already include exhaust and every visible
 * rocket part.
 */
export function isP02RocketOffscreen(
  bounds: P02Bounds,
  viewport: P02Bounds,
  margin: number,
): boolean {
  return bounds.bottom <= viewport.top - margin;
}

/** CSS transform values for a camera pose, relative to a 1920x1080 world. */
export function cameraTransform(pose: P02CameraPose): {
  x: number;
  y: number;
  scale: number;
} {
  return {
    x: P02_DESIGN_WIDTH / 2 - pose.centerX * pose.scale,
    y: P02_DESIGN_HEIGHT / 2 - pose.centerY * pose.scale,
    scale: pose.scale,
  };
}

interface RocketBoundsInput {
  rocketY: number;
  exhaustHeight: number;
  pose: P02CameraPose;
}

/**
 * Design-space screen bounds of the rocket plus its attached exhaust. Used by
 * geometry tests and as a deterministic fallback when live DOM measurement is
 * unavailable.
 */
export function getP02RocketScreenBounds({
  rocketY,
  exhaustHeight,
  pose,
}: RocketBoundsInput): P02Bounds {
  const screenX = (worldX: number) =>
    P02_DESIGN_WIDTH / 2 + (worldX - pose.centerX) * pose.scale;
  const screenY = (worldY: number) =>
    P02_DESIGN_HEIGHT / 2 + (worldY - pose.centerY) * pose.scale;

  const left = P02_ROCKET.centerX - P02_ROCKET.width / 2;
  const right = P02_ROCKET.centerX + P02_ROCKET.width / 2;
  const top = P02_ROCKET.top + rocketY;
  const bottom = P02_ROCKET.nozzleY + rocketY + exhaustHeight;

  return {
    left: screenX(left),
    top: screenY(top),
    right: screenX(right),
    bottom: screenY(bottom),
  };
}
