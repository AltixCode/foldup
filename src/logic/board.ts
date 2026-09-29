/**
 * Foldup — lift a tile, drop it on its twin, the pair folds into the next power
 * of two.
 *
 * Deliberately NOT a falling grid: no gravity, no sliding, no timer. The board
 * is bounded and the level ends when one tile is left. That keeps it a puzzle
 * with a par rather than an endless arcade run.
 *
 * Pure: no React, no React Native, no Expo.
 */

export interface Tile {
  /** Always a power of two. */
  value: number;
  /** Stable across merges, so the UI can animate a tile rather than a cell. */
  id: number;
}

export type Cell = Tile | null;
export type Board = Cell[][];

export interface Point {
  r: number;
  c: number;
}

export const samePoint = (a: Point, b: Point): boolean =>
  a.r === b.r && a.c === b.c;

export function tileAt(board: Board, at: Point): Cell {
  return board[at.r]?.[at.c] ?? null;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/** Every occupied cell, in reading order. */
export function occupied(board: Board): Point[] {
  const out: Point[] = [];
  board.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell) out.push({ r, c });
    }),
  );
  return out;
}

export function tileCount(board: Board): number {
  return occupied(board).length;
}

/**
 * Where a tile can be dropped: any orthogonally adjacent cell holding a tile of
 * the same value.
 *
 * Adjacency only — reaching across the board would make every level a search
 * rather than a plan, and the whole appeal is that the next move is visible.
 */
export function legalTargets(board: Board, from: Point): Point[] {
  const tile = tileAt(board, from);
  if (!tile) return [];
  const deltas = [
    { r: 1, c: 0 },
    { r: -1, c: 0 },
    { r: 0, c: 1 },
    { r: 0, c: -1 },
  ];
  return deltas
    .map((d) => ({ r: from.r + d.r, c: from.c + d.c }))
    .filter((to) => {
      const other = tileAt(board, to);
      return other !== null && other.value === tile.value;
    });
}

export interface MergeResult {
  board: Board;
  /** Points scored: the value of the tile created. */
  gained: number;
}

/** Folds `from` into `to`. Callers must check `legalTargets` first. */
export function applyMerge(board: Board, from: Point, to: Point): MergeResult {
  const source = tileAt(board, from);
  const target = tileAt(board, to);
  if (
    !source ||
    !target ||
    source.value !== target.value ||
    samePoint(from, to)
  ) {
    return { board, gained: 0 };
  }
  const next = cloneBoard(board);
  const merged = target.value * 2;
  next[to.r]![to.c] = { value: merged, id: target.id };
  next[from.r]![from.c] = null;
  return { board: next, gained: merged };
}

/** The level is cleared when exactly one tile is left. */
export function isCleared(board: Board): boolean {
  return tileCount(board) === 1;
}

/** No legal merge anywhere — the player must undo or restart. */
export function isStuck(board: Board): boolean {
  if (isCleared(board)) return false;
  return occupied(board).every(
    (from) => legalTargets(board, from).length === 0,
  );
}

/** A canonical key: values by position. Ids are not part of a position. */
export function boardKey(board: Board): string {
  return board
    .map((row) => row.map((cell) => cell?.value ?? 0).join(","))
    .join("|");
}

export function emptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, (): Cell => null),
  );
}

/**
 * Swipe-to-fold: a fling from a tile in one of the four directions is the same
 * "lift, then drop on a neighbour" move the two-tap interaction makes, just
 * expressed in one gesture instead of two taps.
 */
export type SwipeDirection = "up" | "down" | "left" | "right";

const SWIPE_DELTAS: Record<SwipeDirection, Point> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
};

/**
 * The cell a swipe from `from` in `direction` points at. Not necessarily a
 * legal fold target — callers still check that with `legalTargets`, exactly
 * as the tap flow does.
 */
export function swipeTarget(from: Point, direction: SwipeDirection): Point {
  const delta = SWIPE_DELTAS[direction];
  return { r: from.r + delta.r, c: from.c + delta.c };
}

/**
 * Which of the four directions a raw pan gesture points in, or `null` when the
 * finger has not travelled far enough to mean anything — the same "tap that
 * wandered" case the tap flow already tolerates via its own touch slop.
 *
 * Ties (an exactly diagonal drag) resolve to the horizontal axis; a real board
 * swipe is rarely a perfect 45 degrees, so this only ever matters for a
 * fabricated event, and picking one axis deterministically beats the gesture
 * silently doing nothing.
 */
export function directionFromTranslation(
  dx: number,
  dy: number,
  threshold: number,
): SwipeDirection | null {
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}
