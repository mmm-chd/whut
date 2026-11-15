import {
  COLUMNS,
  ROWS,
  boundaryCells,
  cellIndex,
  inBounds,
  inflate,
  isWalkable,
  reachableCells,
  rectCells,
  type Cell,
  type NavGrid,
} from './grid';

/**
 * The teaching board. It is an illustration, not real Mars terrain and not
 * NASA's AutoNav: it only has to be honest about what the rover can and cannot
 * drive over, so the picture and the planner share one source of truth.
 */
export interface Preset {
  readonly id: string;
  readonly label: string;
  readonly cell: Cell;
}

export interface Hazard {
  readonly id: string;
  /** The raw rough patch cells (before clearance). */
  readonly rawCells: readonly Cell[];
  /** The cells the rover keeps away from once the patch is known. */
  readonly blockedCells: readonly Cell[];
}

export interface Blocker {
  readonly id: string;
  readonly kind: 'rock' | 'pit';
  readonly rawCells: readonly Cell[];
}

export interface NavigationMap {
  readonly id: string;
  /** Edge plus every inflated visible blocker. */
  readonly known: NavGrid;
  /** Known plus every inflated detectable hazard. */
  readonly safety: NavGrid;
  readonly start: Cell;
  readonly presets: readonly Preset[];
  readonly hazards: readonly Hazard[];
  readonly blockers: readonly Blocker[];
}

const BLOCKERS: readonly Blocker[] = [
  { id: 'rocks-a', kind: 'rock', rawCells: rectCells(6, 7, 9, 10) },
  { id: 'rocks-b', kind: 'rock', rawCells: rectCells(21, 12, 23, 15) },
  { id: 'pit', kind: 'pit', rawCells: rectCells(13, 8, 14, 9) },
];

const HAZARD_RAW: readonly Cell[] = [{ col: 16, row: 13 }];

export const START_CELL: Cell = { col: 16, row: 20 };

export const PRESETS: readonly Preset[] = [
  { id: 'north', label: 'Northern clearing', cell: { col: 16, row: 4 } },
  { id: 'east', label: 'Eastern flat patch', cell: { col: 27, row: 16 } },
  { id: 'west', label: 'Western lookout', cell: { col: 4, row: 15 } },
];

function buildGrid(blockedSets: ReadonlyArray<ReadonlySet<number>>): NavGrid {
  const blocked = new Set<number>();
  for (const set of blockedSets) {
    for (const index of set) {
      blocked.add(index);
    }
  }
  return { columns: COLUMNS, rows: ROWS, blocked };
}

function createDefaultMap(): NavigationMap {
  const edge = boundaryCells(COLUMNS, ROWS);
  const visible = BLOCKERS.map((blocker) => inflate(blocker.rawCells, COLUMNS, ROWS));
  const known = buildGrid([edge, ...visible]);

  const hazards: Hazard[] = [
    {
      id: 'rough-patch',
      rawCells: HAZARD_RAW,
      blockedCells: [...inflate(HAZARD_RAW, COLUMNS, ROWS)].map((index) => ({
        col: index % COLUMNS,
        row: Math.floor(index / COLUMNS),
      })),
    },
  ];
  const hazardSets = hazards.map((hazard) => new Set(hazard.blockedCells.map((cell) => cellIndex(COLUMNS, cell))));
  const safety = buildGrid([known.blocked, ...hazardSets]);

  return {
    id: 'default',
    known,
    safety,
    start: START_CELL,
    presets: PRESETS,
    hazards,
    blockers: BLOCKERS,
  };
}

export const defaultMap: NavigationMap = createDefaultMap();

/** Every problem with a map; an empty list means it is safe to play. */
export function validateNavigationMap(map: NavigationMap): readonly string[] {
  const problems: string[] = [];
  const { known, safety } = map;

  if (known.columns !== COLUMNS || known.rows !== ROWS || safety.columns !== COLUMNS || safety.rows !== ROWS) {
    problems.push('The map has the wrong size.');
    return problems;
  }
  if (!inBounds(known, map.start) || !isWalkable(safety, map.start)) {
    problems.push('The start cell is not clear ground.');
    return problems;
  }

  const ids = new Set<string>();
  for (const hazard of map.hazards) {
    if (ids.has(hazard.id)) {
      problems.push(`Duplicate hazard id ${hazard.id}.`);
    }
    ids.add(hazard.id);
    for (const cell of hazard.blockedCells) {
      if (!inBounds(known, cell)) {
        problems.push(`Hazard ${hazard.id} has a cell off the board.`);
      }
    }
  }

  const reachable = reachableCells(safety, map.start);
  for (const preset of map.presets) {
    if (!isWalkable(safety, preset.cell)) {
      problems.push(`Preset ${preset.id} is on blocked ground.`);
    } else if (!reachable.has(cellIndex(COLUMNS, preset.cell))) {
      problems.push(`Preset ${preset.id} cannot be reached.`);
    }
  }
  return problems;
}

/** Which hazard covers this cell once it is known, or null. */
export function hazardAt(map: NavigationMap, cell: Cell): Hazard | null {
  const index = cellIndex(COLUMNS, cell);
  for (const hazard of map.hazards) {
    if (hazard.blockedCells.some((blocked) => cellIndex(COLUMNS, blocked) === index)) {
      return hazard;
    }
  }
  return null;
}

/** The grid the planner uses once some hazards have been discovered. */
export function knownGridWith(map: NavigationMap, discovered: readonly string[]): NavGrid {
  if (discovered.length === 0) {
    return map.known;
  }
  const blocked = new Set<number>(map.known.blocked);
  for (const hazard of map.hazards) {
    if (discovered.includes(hazard.id)) {
      for (const cell of hazard.blockedCells) {
        blocked.add(cellIndex(COLUMNS, cell));
      }
    }
  }
  return { columns: map.known.columns, rows: map.known.rows, blocked };
}

/** Walkable in the full-safety sense, and inside the start's connected region. */
const reachableCache = new WeakMap<NavGrid, Map<number, ReadonlySet<number>>>();

/** The safety grid never changes, so each start cell's reachable set is built once. */
function reachableFrom(grid: NavGrid, from: Cell): ReadonlySet<number> {
  let byStart = reachableCache.get(grid);
  if (!byStart) {
    byStart = new Map();
    reachableCache.set(grid, byStart);
  }
  const key = cellIndex(COLUMNS, from);
  let reachable = byStart.get(key);
  if (!reachable) {
    reachable = reachableCells(grid, from);
    byStart.set(key, reachable);
  }
  return reachable;
}

export function isSupportedDestination(map: NavigationMap, cell: Cell, from: Cell): boolean {
  if (!isWalkable(map.safety, cell)) {
    return false;
  }
  return reachableFrom(map.safety, from).has(cellIndex(COLUMNS, cell));
}

/** Expands corner points of an axis-aligned path into every cell along it. */
function polyline(points: ReadonlyArray<readonly [number, number]>): Cell[] {
  const out: Cell[] = [{ col: points[0][0], row: points[0][1] }];
  for (let i = 1; i < points.length; i += 1) {
    let [col, row] = [out[out.length - 1].col, out[out.length - 1].row];
    const [toCol, toRow] = points[i];
    while (col !== toCol || row !== toRow) {
      col += Math.sign(toCol - col);
      row += Math.sign(toRow - row);
      out.push({ col, row });
    }
  }
  return out;
}

/**
 * Percy's opening drive: in from below the board, a lazy lap across the clear
 * lower field, and back to the start cell. It is paced over the narration, so
 * he keeps rolling the whole time the narrator speaks. Only the first cell is
 * off the board; the rest is open ground.
 */
export const OPENING_ROUTE: readonly Cell[] = polyline([
  [16, 24],
  [16, 19],
  [9, 19],
  [9, 22],
  [23, 22],
  [23, 19],
  [16, 19],
  [16, 20],
]);
