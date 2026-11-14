import type { Polygon } from '../../three/layers';
import type { P02SkyCloud } from './skyClouds';

/**
 * Parses the `M x y L x y ... Z` strings `skyClouds.ts` writes (straight
 * segments only) into a polygon.
 */
export function parsePolygonPath(path: string): Polygon {
  const points: [number, number][] = [];
  const pattern = /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g;
  for (const match of path.matchAll(pattern)) {
    points.push([Number(match[1]), Number(match[2])]);
  }
  return points;
}

/** Every ribbon of every cloud, moved to its world position. */
export function skyCloudPolygons(clouds: readonly P02SkyCloud[]): Polygon[] {
  return clouds.flatMap((cloud) =>
    cloud.paths.map((path) =>
      parsePolygonPath(path).map(([x, y]) => [x + cloud.left, y + cloud.top] as const),
    ),
  );
}
