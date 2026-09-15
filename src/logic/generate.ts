import { makeRng, shuffled, type Rng } from './rng';
import { solve } from './solve';
import { emptyBoard, isStuck, tileCount, type Board, type Point } from './board';

/**
 * Generates a clearable Foldup level by UNMERGING backwards from a single tile.
 *
 * Every split is the exact inverse of a legal merge — a tile of value v becomes
 * two of v/2, one staying put and one moving to an empty orthogonal neighbour —
 * so the forward sequence that undoes the splits is a legal clearing sequence by
 * construction. The solver then only has to confirm it, which it does quickly.
 *
 * Working forwards instead (scatter powers of two and hope) produces boards that
 * are usually unclearable, and an unclearable level is indistinguishable, to the
 * player, from one they are simply failing.
 */

export interface GeneratedLevel {
  board: Board;
  /** Merges needed to clear: always tiles - 1. */
  par: number;
}

export interface LevelShape {
  rows: number;
  cols: number;
  /** Tiles on the board at the start. */
  tiles: number;
}

/**
 * Difficulty by level number: a bigger board, then more tiles on it.
 *
 * Kept gentle early — the appeal is a five-minute session with a visible next
 * move, and a level 5 that needs real search loses the players who came for that.
 */
export function shapeForLevel(level: number): LevelShape {
  const side = level < 12 ? 3 : level < 40 ? 4 : 5;
  const maxTiles = side * side - 1;
  const tiles = Math.min(maxTiles, 4 + Math.floor(level / 3));
  return { rows: side, cols: side, tiles };
}

const NEIGHBOURS = [
  { r: 1, c: 0 },
  { r: -1, c: 0 },
  { r: 0, c: 1 },
  { r: 0, c: -1 },
];

/** Splits one tile into two halves, the new one on an empty neighbour. */
function unmerge(board: Board, at: Point, nextId: () => number, rng: Rng): boolean {
  const tile = board[at.r]?.[at.c];
  // Below 4 a split would produce a value of 1, and the board's smallest tile
  // should be 2 — the value players expect to start from.
  if (!tile || tile.value < 4) return false;

  const empties = shuffled(
    NEIGHBOURS.map((d) => ({ r: at.r + d.r, c: at.c + d.c })).filter(
      (p) =>
        p.r >= 0 && p.r < board.length && p.c >= 0 && p.c < board[0]!.length && board[p.r]![p.c] === null,
    ),
    rng,
  );
  const spot = empties[0];
  if (!spot) return false;

  const half = tile.value / 2;
  board[at.r]![at.c] = { value: half, id: tile.id };
  board[spot.r]![spot.c] = { value: half, id: nextId() };
  return true;
}

export function generateLevel(level: number, seed: number): GeneratedLevel {
  const shape = shapeForLevel(level);
  const rng = makeRng(seed);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    let id = 1;
    const nextId = () => id++;
    const board = emptyBoard(shape.rows, shape.cols);

    // Start from one tile big enough to split down to the tile count wanted.
    const start = 2 ** Math.ceil(Math.log2(shape.tiles)) * 2;
    const centre = { r: Math.floor(shape.rows / 2), c: Math.floor(shape.cols / 2) };
    board[centre.r]![centre.c] = { value: start, id: nextId() };

    let guard = 0;
    while (tileCount(board) < shape.tiles && guard++ < shape.tiles * 40) {
      const candidates = shuffled(
        board
          .flatMap((row, r) => row.map((cell, c) => ({ cell, r, c })))
          .filter((x) => x.cell !== null && x.cell.value >= 4)
          .map((x) => ({ r: x.r, c: x.c })),
        rng,
      );
      let split = false;
      for (const at of candidates) {
        if (unmerge(board, at, nextId, rng)) {
          split = true;
          break;
        }
      }
      if (!split) break;
    }

    if (tileCount(board) < Math.max(4, shape.tiles - 1)) continue;
    // A board with no legal merge is a dead level, not a hard one.
    if (isStuck(board)) continue;
    if (!solve(board)) continue;

    return { board, par: tileCount(board) - 1 };
  }

  throw new Error(`Foldup: no clearable level ${level} for seed ${seed}`);
}
