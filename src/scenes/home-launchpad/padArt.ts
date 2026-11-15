/**
 * The launch pad the prototype draws and this repo has been missing (plan T6c):
 * the gold slab, its legs and rails, the gantry tower, the access road, the two
 * green foothill bands and the paper shadow under the rocket.
 *
 * Everything is a polygon in design pixels, so it costs no new asset file and
 * stays sharp at any zoom. Every number is read from `docs-base/Cerita Roket
 * (2).html`; the comments name the element each block came from.
 */

export type PadPoint = readonly [number, number];
export type PadPolygon = readonly PadPoint[];

/** The prototype's pad colours, unchanged. */
export const PAD = {
  gold: '#e3a73a',
  teal: '#4f6d70',
  brace: '#6b8685',
  road: '#d9d3c2',
  shadow: '#a98a48',
  platform: '#e9e2cf',
  leg: '#dcd0b4',
  hillFar: '#8f9552',
  hillNear: '#a8a55c',
  horizon: '#5d8aa3',
} as const;

function rect(x: number, y: number, w: number, h: number): PadPolygon {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

function ellipse(cx: number, cy: number, rx: number, ry: number, steps = 44): PadPolygon {
  const points: PadPoint[] = [];
  for (let i = 0; i < steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    points.push([cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry]);
  }
  return points;
}

/**
 * A thick stroke as a polygon: sample the curve, then walk one side out and the
 * other side back. Used for the legs, the road and the dashed rails.
 */
function ribbon(curve: readonly PadPoint[], width: number): PadPolygon {
  const half = width / 2;
  const left: PadPoint[] = [];
  const right: PadPoint[] = [];
  curve.forEach((point, index) => {
    const previous = curve[Math.max(0, index - 1)];
    const next = curve[Math.min(curve.length - 1, index + 1)];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * half;
    const ny = (dx / length) * half;
    left.push([point[0] + nx, point[1] + ny]);
    right.push([point[0] - nx, point[1] - ny]);
  });
  return [...left, ...right.reverse()];
}

/** Quadratic curve sampled into a polyline. */
function quad(
  from: PadPoint,
  control: PadPoint,
  to: PadPoint,
  steps = 12,
): PadPoint[] {
  const points: PadPoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * from[0] + 2 * u * t * control[0] + t * t * to[0],
      u * u * from[1] + 2 * u * t * control[1] + t * t * to[1],
    ]);
  }
  return points;
}

/** Handrail: 5 px dashes with 11 px gaps, the prototype's `stroke-dasharray`. */
function dashes(x0: number, x1: number, y: number, span: number, dash = 5, gap = 11): PadPolygon[] {
  const out: PadPolygon[] = [];
  for (let x = x0; x < x1; x += dash + gap) {
    out.push(rect(x, y - span / 2, Math.min(dash, x1 - x), span));
  }
  return out;
}

/**
 * Sample an **absolute** SVG path (`M`, `L`, `H`, `V`, `C`, `Q`, `T`, `Z`) into
 * closed polygons, so the prototype's own path strings can be lifted verbatim
 * instead of re-approximated by hand. One polygon per subpath.
 */
export function pathToPolygons(d: string, curveSteps = 8): PadPolygon[] {
  const tokens = d.match(/[MLHVCQTZmlhvcqtz]|-?\d*\.?\d+/g) ?? [];
  const polygons: PadPolygon[] = [];
  let current: PadPoint[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastControl: PadPoint | null = null;
  let index = 0;

  const close = () => {
    if (current.length >= 3) {
      polygons.push(current);
    }
    current = [];
  };
  const push = (point: PadPoint) => {
    current.push(point);
  };

  const command = () => {
    const token = tokens[index];
    index += 1;
    return token;
  };
  const number = () => {
    const token = tokens[index];
    index += 1;
    return Number(token);
  };

  while (index < tokens.length) {
    const token = command();
    if (token === undefined) {
      break;
    }
    const absolute = token === token.toUpperCase();
    switch (token.toUpperCase()) {
      case 'M': {
        close();
        x = number();
        y = number();
        if (!absolute) {
          x += startX;
          y += startY;
        }
        startX = x;
        startY = y;
        push([x, y]);
        lastControl = null;
        break;
      }
      case 'L': {
        x = number();
        y = number();
        if (!absolute) {
          x += current[current.length - 1][0];
          y += current[current.length - 1][1];
        }
        push([x, y]);
        lastControl = null;
        break;
      }
      case 'H': {
        const value = number();
        x = absolute ? value : x + value;
        push([x, y]);
        lastControl = null;
        break;
      }
      case 'V': {
        const value = number();
        y = absolute ? value : y + value;
        push([x, y]);
        lastControl = null;
        break;
      }
      case 'C':
      case 'Q': {
        const cubic = token.toUpperCase() === 'C';
        const c1: PadPoint = cubic ? [number(), number()] : [x, y];
        const c2: PadPoint = cubic ? [number(), number()] : [number(), number()];
        const end: PadPoint = [number(), number()];
        const from: PadPoint = [x, y];
        for (let step = 1; step <= curveSteps; step += 1) {
          const t = step / curveSteps;
          const u = 1 - t;
          if (cubic) {
            push([
              u * u * u * from[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * end[0],
              u * u * u * from[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * end[1],
            ]);
          } else {
            push([
              u * u * from[0] + 2 * u * t * c2[0] + t * t * end[0],
              u * u * from[1] + 2 * u * t * c2[1] + t * t * end[1],
            ]);
          }
        }
        lastControl = cubic ? c2 : c2;
        x = end[0];
        y = end[1];
        break;
      }
      case 'T': {
        const end: PadPoint = [number(), number()];
        const from: PadPoint = [x, y];
        const control: PadPoint = lastControl
          ? [from[0] * 2 - lastControl[0], from[1] * 2 - lastControl[1]]
          : from;
        for (let step = 1; step <= curveSteps; step += 1) {
          const t = step / curveSteps;
          const u = 1 - t;
          push([
            u * u * from[0] + 2 * u * t * control[0] + t * t * end[0],
            u * u * from[1] + 2 * u * t * control[1] + t * t * end[1],
          ]);
        }
        lastControl = control;
        x = end[0];
        y = end[1];
        break;
      }
      case 'Z': {
        close();
        x = startX;
        y = startY;
        lastControl = null;
        break;
      }
      default:
        break;
    }
  }
  close();
  return polygons;
}

/** `rect -100 792 2120 30`: the narrow blue band the hills sit on. */
export const horizonBand: PadPolygon = rect(-100, 792, 2120, 30);

/** `#gfar`: the two green foothill bands under the horizon, verbatim. */
export const padHills = {
  far: pathToPolygons('M0 822Q200 770 420 800T820 795T1220 790T1620 800T1920 785V830H0Z')[0],
  near: pathToPolygons('M0 830Q300 800 620 815T1300 812T1920 806V840H0Z')[0],
};

/**
 * `#gfar`: the prototype's three sweeping cream cloud bands. This repo shipped
 * puffy cloud sprites instead and no band across the upper sky, which is the
 * biggest single difference in the sky.
 */
export const cloudBands: readonly PadPolygon[] = [
  ...pathToPolygons(
    'M40 101C170 108 250 30 380 28C520 26 640 95 930 90C780 112 640 118 520 75C390 40 250 110 40 101Z',
  ),
  ...pathToPolygons(
    'M730 224C900 190 1020 160 1100 110C1200 40 1360 25 1520 0L1560 6C1400 40 1300 75 1230 130C1130 195 900 150 730 224Z',
  ),
  ...pathToPolygons(
    'M1100 190C1250 182 1300 165 1380 100C1470 55 1600 58 1700 72C1800 86 1860 90 1920 80V118C1800 140 1700 135 1620 115C1480 92 1420 190 1280 190Z',
  ),
];

/** The gantry: a teal tower with cross bracing and two gold arms. */
export const padGantry = {
  tower: rect(1172, 570, 98, 340) as PadPolygon,
  braces: [
    ribbon([[1172, 570], [1270, 910]], 8),
    ribbon([[1270, 570], [1172, 910]], 8),
    ribbon([[1172, 740], [1270, 910]], 8),
    ribbon([[1270, 740], [1172, 910]], 8),
  ] as PadPolygon[],
  arms: [rect(1150, 556, 142, 16), rect(1150, 696, 142, 16)] as PadPolygon[],
  rails: [
    ...dashes(1150, 1292, 545, 20),
    ...dashes(1150, 1292, 685, 20),
    rect(1150, 531, 142, 6),
    rect(1150, 671, 142, 6),
  ] as PadPolygon[],
};

/** The slab the rocket stands on, its legs and the paper shadow. */
export const padSlab = {
  /** `rect 765 872 495 16` plus the rail above it. */
  slab: rect(765, 872, 495, 16) as PadPolygon,
  railDashes: dashes(765, 1260, 861, 20),
  rail: rect(765, 847, 495, 6),
  /** Teal skirt under the slab. */
  skirt: rect(765, 888, 495, 10) as PadPolygon,
  /** Two 22 px legs curving down to the ground. */
  legs: [
    ribbon(quad([905, 905], [862, 905], [848, 962], 10), 22),
    ribbon(quad([928, 905], [892, 912], [882, 968], 10), 22),
  ] as PadPolygon[],
  /** `ellipse cx 960 cy 918 rx 300 ry 20` at 50 %. */
  shadow: ellipse(960, 918, 300, 20),
  /** `rect 740 896 440 16 rx 3`. */
  platform: rect(740, 896, 440, 16) as PadPolygon,
};

/** Quiet foreground launch-site equipment, replacing the animated crowd. */
export const launchComplex = {
  ground: [[-80, 830], [2000, 830], [2000, 1160], [-80, 1160]] as PadPolygon,
  road: [[860, 912], [1060, 912], [1530, 1080], [390, 1080]] as PadPolygon,
  roadEdges: [ribbon([[860, 912], [390, 1080]], 8), ribbon([[1060, 912], [1530, 1080]], 8)] as PadPolygon[],
  roadCentre: ribbon([[960, 918], [960, 1080]], 7),
  tankBodies: [rect(170, 942, 132, 76), rect(1450, 946, 150, 70)] as PadPolygon[],
  tankRoofs: [rect(158, 928, 156, 18), rect(1438, 932, 174, 18)] as PadPolygon[],
  tankDoors: [rect(196, 976, 28, 42), rect(1476, 972, 30, 44)] as PadPolygon[],
  tankWindows: [rect(235, 968, 44, 22), rect(1530, 968, 50, 26)] as PadPolygon[],
  lightPoles: [rect(548, 776, 12, 226), rect(1358, 776, 12, 226)] as PadPolygon[],
  lightCaps: [rect(514, 752, 80, 26), rect(1324, 752, 80, 26)] as PadPolygon[],
  lightFaces: [rect(522, 770, 64, 8), rect(1332, 770, 64, 8)] as PadPolygon[],
  truckBody: rect(1010, 984, 108, 46),
  truckCab: rect(1118, 994, 38, 36),
  truckWindow: rect(1128, 1000, 20, 14),
  truckWheels: [ellipse(1036, 1034, 13, 13, 18), ellipse(1138, 1034, 13, 13, 18)] as PadPolygon[],
};
