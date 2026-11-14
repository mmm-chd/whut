import { describe, expect, it } from 'vitest';
import {
  P02_CAMERA,
  P02_CLOSEUP,
  P02_CLOSEUP_TOWERS,
  P02_DESIGN_HEIGHT,
  P02_DESIGN_WIDTH,
  P02_ESTABLISHING_TOWERS,
  P02_LAND,
  P02_ROCKET,
  P02_ROCKET_ESTABLISHING,
  P02_TOWER_SPRITE,
  P02_WINDOW,
  P02_WINDOW_FRAME,
  fitP02Stage,
  getP02RocketScreenBounds,
  isP02RocketOffscreen,
  p02TowerSpriteStyle,
} from './camera';

describe('fitP02Stage', () => {
  it('fits a 16:9 host exactly', () => {
    expect(fitP02Stage(1920, 1080)).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('letterboxes a 19.5:9 host without cropping', () => {
    const fit = fitP02Stage(2532, 1170);
    expect(fit.scale).toBeCloseTo(1170 / 1080, 6);
    expect(fit.offsetX).toBeCloseTo((2532 - P02_DESIGN_WIDTH * fit.scale) / 2, 6);
    expect(fit.offsetY).toBeCloseTo(0, 6);
  });

  it('pillarboxes a 4:3 host without cropping', () => {
    const fit = fitP02Stage(1440, 1080);
    expect(fit.scale).toBeCloseTo(0.75, 6);
    expect(fit.offsetX).toBeCloseTo(0, 6);
    expect(fit.offsetY).toBeCloseTo(135, 6);
  });

  it('returns a safe zero fit for invalid host dimensions', () => {
    expect(fitP02Stage(0, 1080)).toEqual({ scale: 0, offsetX: 0, offsetY: 0 });
    expect(fitP02Stage(1920, Number.NaN)).toEqual({ scale: 0, offsetX: 0, offsetY: 0 });
    expect(fitP02Stage(Number.POSITIVE_INFINITY, 1080)).toEqual({
      scale: 0,
      offsetX: 0,
      offsetY: 0,
    });
  });
});

describe('isP02RocketOffscreen', () => {
  const viewport = { left: 0, top: 0, right: P02_DESIGN_WIDTH, bottom: P02_DESIGN_HEIGHT };
  const rocket = { left: 840, top: -900, right: 1080, bottom: -23 };

  it('requires the attached bottom to clear the margin', () => {
    expect(isP02RocketOffscreen(rocket, viewport, 24)).toBe(false);
    expect(isP02RocketOffscreen({ ...rocket, bottom: -24 }, viewport, 24)).toBe(true);
  });
});

describe('ascent endpoint geometry', () => {
  it('leaves the rocket and attached exhaust above the frame', () => {
    const bounds = getP02RocketScreenBounds({
      rocketY: -2680,
      exhaustHeight: 200,
      pose: P02_CAMERA.ascent,
    });

    expect(bounds.bottom).toBeLessThanOrEqual(-24);
    expect(bounds.top).toBeLessThan(bounds.bottom);
  });

  it('keeps the full rocket inside the launch composition', () => {
    const bounds = getP02RocketScreenBounds({
      rocketY: 0,
      exhaustHeight: 200,
      pose: P02_CAMERA.launch,
    });

    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(P02_DESIGN_HEIGHT);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(P02_DESIGN_WIDTH);
  });

  it('exposes the measured design envelope', () => {
    expect(P02_ROCKET).toMatchObject({
      centerX: 960,
      top: 51,
      width: 292,
      height: 876,
      nozzleY: 900,
    });
  });

});

describe('establishing composition', () => {
  // Measured from rocket-full-body.png: 203 px fairing in a 724 px canvas.
  const baseFairingWidth = (203 / 724) * P02_ROCKET.width;
  const establishingFairingWidth = baseFairingWidth * P02_ROCKET_ESTABLISHING.scale;

  it('matches the reference fairing and window sizes', () => {
    expect(establishingFairingWidth).toBeCloseTo(140, 0);

    // The reference ring is ~131 x 128; the frame's ring is 408 of 610 px.
    const baseRing =
      P02_WINDOW.size * (P02_WINDOW_FRAME.ring.height / P02_WINDOW_FRAME.canvas.height);
    const establishingRing = baseRing * P02_ROCKET_ESTABLISHING.scale;
    expect(establishingRing).toBeGreaterThan(128);
    expect(establishingRing).toBeLessThan(137);
  });

  it('puts the nose and window centre at the reference heights', () => {
    const originY =
      P02_ROCKET.top +
      (P02_ROCKET.height * P02_ROCKET_ESTABLISHING.originY) / 100;
    const mapY = (baseY: number) =>
      originY +
      (baseY - originY) * P02_ROCKET_ESTABLISHING.scale +
      P02_ROCKET_ESTABLISHING.offsetY;

    const noseBaseY = P02_ROCKET.top + (58 / 2172) * P02_ROCKET.height;
    expect(mapY(noseBaseY)).toBeCloseTo(200, 0);

    const windowBaseY =
      P02_ROCKET.top + P02_WINDOW.offsetTop + P02_WINDOW.size * P02_WINDOW_FRAME.centreY;
    expect(mapY(windowBaseY)).toBeCloseTo(P02_WINDOW.establishingCenterY, 0);
  });

  it('centres the window on the visible rocket body', () => {
    // rocket-full-body.png: visible body x 224-497 in a 724 px canvas.
    const bodyCentre = ((224 + 497) / 2 / 724) * P02_ROCKET.width;
    const ringCentre = P02_WINDOW.offsetLeft + P02_WINDOW.size / 2;
    expect(Math.abs(ringCentre - bodyCentre)).toBeLessThan(1);
  });

  it('puts the horizon near the reference height only in the establishing shot', () => {
    // sea.png: visible band starts 27 px into a 96 px canvas; the layer is
    // 110 px tall at top 730 in launch coordinates.
    const seaTop = 730 + (27 / 96) * 110;
    expect(seaTop).toBeLessThan(800);
    expect(seaTop + P02_LAND.establishingOffsetY).toBeGreaterThan(980);
    expect(seaTop + P02_LAND.establishingOffsetY).toBeLessThan(1010);
  });
});

describe('tower sprites', () => {
  it('shows exactly one tower at the placement height', () => {
    for (const placement of [...P02_ESTABLISHING_TOWERS, ...P02_CLOSEUP_TOWERS]) {
      const sprite = P02_TOWER_SPRITE[placement.sprite];
      const { wrapper, image } = p02TowerSpriteStyle(placement);
      const scale = placement.height / sprite.height;

      expect(wrapper.height).toBe(placement.height);
      expect(wrapper.width).toBeCloseTo(sprite.width * scale, 6);
      expect(wrapper.left).toBe(placement.left);
      expect(wrapper.top).toBe(placement.top);

      // The visible tower starts at the wrapper origin.
      expect(image.left + sprite.left * scale).toBeCloseTo(0, 6);
      expect(image.top + sprite.top * scale).toBeCloseTo(0, 6);
      // The sheet keeps its aspect ratio (no stretch).
      expect(image.width / image.height).toBeCloseTo(
        P02_TOWER_SPRITE.sheet.width / P02_TOWER_SPRITE.sheet.height,
        6,
      );
    }
  });

  it('applies the land offset to the wrapper only', () => {
    const placement = P02_ESTABLISHING_TOWERS[0];
    const plain = p02TowerSpriteStyle(placement);
    const shifted = p02TowerSpriteStyle(placement, P02_LAND.establishingOffsetY);

    expect(shifted.wrapper.top).toBe(placement.top - P02_LAND.establishingOffsetY);
    expect(shifted.image).toEqual(plain.image);
  });

  it('places the establishing towers at the reference positions', () => {
    const tops = P02_ESTABLISHING_TOWERS.map((placement) => placement.top);
    expect(tops).toEqual([489, 340, 627, 484]);
    // Bases sit below the frame edge, as in the reference.
    for (const placement of P02_ESTABLISHING_TOWERS) {
      expect(placement.top + placement.height).toBeGreaterThan(P02_DESIGN_HEIGHT);
    }
  });
});

describe('close-up composition', () => {
  const ringScale = P02_CLOSEUP.window.size / P02_WINDOW_FRAME.canvas.height;

  it('shows the fairing and window at native close-up scale', () => {
    // rocket-half-body.png: 150 px fairing in a 533 px canvas.
    expect((150 / 533) * P02_CLOSEUP.head.width).toBeCloseTo(432, 0);
    // Reference ring: outer ~386, inner ~347.
    expect(P02_WINDOW_FRAME.ring.width * ringScale).toBeCloseTo(393, 0);
    expect(P02_WINDOW_FRAME.hole.width * ringScale).toBeCloseTo(341, 0);
  });

  it('keeps the window centre at the reference point', () => {
    const centreX = P02_CLOSEUP.window.left + P02_CLOSEUP.window.size / 2;
    const centreY =
      P02_CLOSEUP.window.top + P02_CLOSEUP.window.size * P02_WINDOW_FRAME.centreY;

    expect(centreX).toBeCloseTo(433, 0);
    expect(centreY).toBeCloseTo(748, 0);
  });

  it('puts the nose tip and fairing collar at the reference heights', () => {
    // rocket-half-body.png: nose at y 42, collar line at y 482 of 910.
    const scaleY = P02_CLOSEUP.head.height / 910;
    expect(P02_CLOSEUP.head.top + 42 * scaleY).toBeCloseTo(150, 0);
    expect(P02_CLOSEUP.head.top + 482 * scaleY).toBeCloseTo(975, 0);
  });

  it('keeps Percy about 250 px wide inside the window', () => {
    // percy.png: 467 px visible in a 573 px canvas.
    const visible = (467 / 573) * P02_CLOSEUP.percy.width;
    expect(visible).toBeGreaterThan(240);
    expect(visible).toBeLessThan(310);
  });
});
