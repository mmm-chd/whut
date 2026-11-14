import { describe, expect, it } from 'vitest';
import {
  CAMERA_X,
  DESIGN_WIDTH,
  PARALLAX,
  WORLD_WIDTH,
  screenPercent,
  screenToWorld,
  worldToScreen,
} from './camera';
import { rocksConfig } from './rocks.config';

describe('camera', () => {
  it('defines one continuous world with two stops', () => {
    expect(WORLD_WIDTH).toBe(DESIGN_WIDTH + CAMERA_X.rocks);
    expect(CAMERA_X.intro).toBe(0);
    expect(CAMERA_X.rocks).toBe(600);
  });

  it('maps world X to screen X by camera and parallax', () => {
    expect(worldToScreen(1733, 600, 1)).toBe(1133);
    expect(worldToScreen(1733, 600, 0.5)).toBe(1433);
    expect(screenToWorld(1133, 600, 1)).toBe(1733);
  });

  it('round-trips screen and world coordinates', () => {
    const worldX = 1672.8;
    const screenX = worldToScreen(worldX, CAMERA_X.rocks, PARALLAX.rocks);
    expect(screenToWorld(screenX, CAMERA_X.rocks, PARALLAX.rocks)).toBeCloseTo(worldX, 6);
  });

  it('lands Percy at about 28% after the drive', () => {
    const percyWorldX = DESIGN_WIDTH / 2 + 190;
    expect(screenPercent(percyWorldX, CAMERA_X.rocks, PARALLAX.rover)).toBeCloseTo(28.65, 1);
  });
});

describe('rocksConfig', () => {
  it('places the three rocks at the mockup frame-2 positions', () => {
    expect(rocksConfig).toHaveLength(3);
    for (const rock of rocksConfig) {
      expect(screenPercent(rock.worldX, CAMERA_X.rocks, PARALLAX.rocks)).toBeCloseTo(
        rock.screenX * 100,
        6,
      );
    }
  });

  it('starts every rock off to the right of its frame-2 position', () => {
    for (const rock of rocksConfig) {
      const frameOne = screenPercent(rock.worldX, CAMERA_X.intro, PARALLAX.rocks);
      expect(frameOne).toBeGreaterThan(rock.screenX * 100 + 20);
    }
  });

  it('keeps the rock bases at the mockup base line', () => {
    for (const rock of rocksConfig) {
      expect(rock.baseY).toBeCloseTo(0.63, 5);
    }
  });
});
