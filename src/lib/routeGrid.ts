export type CellType = 'wall' | 'floor' | 'room' | 'entrance';

export interface Cell {
  row: number;
  col: number;
  type: CellType;
  roomId?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  row: number;
  col: number;
}

const LAYOUT = [
  '#########',
  '#A.....B#',
  '#.#..##.#',
  '#.....#.#',
  '#C.....D#',
  '####E####',
];

export const ROOMS: RoomInfo[] = [
  { id: 'A', name: 'Gamification Lab', row: 1, col: 1 },
  { id: 'B', name: 'Aula Magna', row: 1, col: 7 },
  { id: 'C', name: 'DigiLab', row: 4, col: 1 },
  { id: 'D', name: 'E-learning Lab', row: 4, col: 7 },
];

export const ENTRANCE_ID = 'E';
export const GRID_ROWS = LAYOUT.length;
export const GRID_COLS = LAYOUT[0].length;

function cellTypeFor(ch: string): CellType {
  if (ch === '#') return 'wall';
  if (ch === '.') return 'floor';
  if (ch === 'E') return 'entrance';
  return 'room';
}

export const CELLS: Cell[] = [];
for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    const ch = LAYOUT[row][col];
    const type = cellTypeFor(ch);
    const cell: Cell = { row, col, type };
    if (type === 'room' || type === 'entrance') cell.roomId = ch;
    CELLS.push(cell);
  }
}

function cellAt(row: number, col: number): Cell | undefined {
  return CELLS.find((c) => c.row === row && c.col === col);
}

export function cellByRoomId(id: string): Cell {
  const cell = CELLS.find((c) => c.roomId === id);
  if (!cell) throw new Error(`unknown room id ${id}`);
  return cell;
}

function key(row: number, col: number): string {
  return `${row},${col}`;
}

export interface PathResult {
  path: Cell[];
  visitedOrder: Cell[];
}

/** A real A* search over the grid above, 4-directional, Manhattan heuristic. */
export function findPath(startId: string, endId: string): PathResult | null {
  const start = cellByRoomId(startId);
  const end = cellByRoomId(endId);
  const startKey = key(start.row, start.col);
  const endKey = key(end.row, end.col);

  if (startKey === endKey) {
    return { path: [start], visitedOrder: [start] };
  }

  const h = (a: Cell, b: Cell) => Math.abs(a.row - b.row) + Math.abs(a.col - b.col);

  /* Tie-break toward the straight line to end, so equal-length routes
     staircase through open ground instead of detouring blockily. */
  const dxEnd = start.col - end.col;
  const dyEnd = start.row - end.row;
  const tieBreak = (cell: Cell) => {
    const dx = cell.col - end.col;
    const dy = cell.row - end.row;
    return Math.abs(dx * dyEnd - dy * dxEnd) * 0.001;
  };

  /* Passing through a non-destination room costs more than a corridor
     step, so the router goes around it when an equal-length path exists. */
  const stepCost = (cell: Cell) => {
    if ((cell.type === 'room' || cell.type === 'entrance') && cell.roomId !== endId) {
      return 1.4;
    }
    return 1;
  };

  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, h(start, end) + tieBreak(start)]]);
  const cameFrom = new Map<string, string>();
  const openSet = new Set<string>([startKey]);
  const visitedOrder: Cell[] = [];

  while (openSet.size) {
    let currentKey = '';
    let bestF = Infinity;
    for (const k of openSet) {
      const f = fScore.get(k) ?? Infinity;
      if (f < bestF) {
        bestF = f;
        currentKey = k;
      }
    }
    openSet.delete(currentKey);

    const [cr, cc] = currentKey.split(',').map(Number);
    const currentCell = cellAt(cr, cc)!;
    visitedOrder.push(currentCell);

    if (currentKey === endKey) {
      const path: Cell[] = [currentCell];
      let k = currentKey;
      while (cameFrom.has(k)) {
        k = cameFrom.get(k)!;
        const [pr, pc] = k.split(',').map(Number);
        path.unshift(cellAt(pr, pc)!);
      }
      return { path, visitedOrder };
    }

    const neighbors: [number, number][] = [
      [cr - 1, cc],
      [cr + 1, cc],
      [cr, cc - 1],
      [cr, cc + 1],
    ];

    for (const [nr, nc] of neighbors) {
      const neighborCell = cellAt(nr, nc);
      if (!neighborCell || neighborCell.type === 'wall') continue;
      const nk = key(nr, nc);
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + stepCost(neighborCell);
      if (tentativeG < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, currentKey);
        gScore.set(nk, tentativeG);
        fScore.set(nk, tentativeG + h(neighborCell, end) + tieBreak(neighborCell));
        openSet.add(nk);
      }
    }
  }

  return null;
}

/* ---------------- voice / text resolver ---------------- */

export interface ResolveResult {
  roomId: string | null;
  roomName: string | null;
  confidence: number;
}

const FILLERS = [
  'portami al',
  'portami alla',
  'portami a',
  "voglio andare all'",
  'voglio andare al',
  'voglio andare alla',
  'dove si trova',
  'voglio vedere',
  'cerco',
  'vai al',
  'vai alla',
  'take me to the',
  'take me to',
  'i want to go to the',
  'i want to go to',
  'where is the',
  'where is',
  "where's the",
  'go to the',
  'go to',
  'find the',
  'find',
  'show me the',
  'show me',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripFillers(s: string): string {
  let out = ` ${s} `;
  for (const f of FILLERS) {
    out = out.replace(new RegExp(`\\b${f}\\b`, 'g'), ' ');
  }
  return out.replace(/\s+/g, ' ').trim();
}

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const costs: number[] = [];
  for (let j = 0; j <= b.length; j++) costs[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let lastValue = i;
    for (let j = 1; j <= b.length; j++) {
      let newValue = costs[j - 1];
      if (a[i - 1] !== b[j - 1]) newValue = Math.min(newValue, lastValue, costs[j]) + 1;
      costs[j - 1] = lastValue;
      lastValue = newValue;
    }
    costs[b.length] = lastValue;
  }
  return costs[b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  return 1 - levenshtein(a, b) / maxLen;
}

/** Real fuzzy matching against the 4 rooms above: normalize, strip fillers, score. */
export function resolveQuery(rawQuery: string): ResolveResult {
  const cleaned = stripFillers(normalize(rawQuery));
  if (!cleaned) return { roomId: null, roomName: null, confidence: 0 };

  let best: { room: RoomInfo; score: number } | null = null;
  for (const room of ROOMS) {
    const roomNorm = normalize(room.name);
    let score: number;
    if (roomNorm === cleaned) {
      score = 1;
    } else if (roomNorm.includes(cleaned) || cleaned.includes(roomNorm)) {
      score = 0.85;
    } else {
      const qTokens = cleaned.split(' ');
      const rTokens = roomNorm.split(' ');
      let total = 0;
      for (const qt of qTokens) {
        let maxSim = 0;
        for (const rt of rTokens) maxSim = Math.max(maxSim, similarity(qt, rt));
        total += maxSim;
      }
      score = total / qTokens.length;
    }
    if (!best || score > best.score) best = { room, score };
  }

  if (best && best.score >= 0.55) {
    return { roomId: best.room.id, roomName: best.room.name, confidence: best.score };
  }
  return { roomId: null, roomName: null, confidence: best?.score ?? 0 };
}
