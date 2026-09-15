import { applyMerge, boardKey, isCleared, legalTargets, occupied, type Board, type Point } from './board';

/**
 * Shortest-solution search.
 *
 * A level of n tiles always takes exactly n-1 merges to clear, so "shortest" is
 * not about move count — every solution is the same length. What the search
 * actually decides is whether a clearing sequence exists **at all**, which is
 * the property the generator must guarantee: a level that cannot be cleared is
 * indistinguishable, to the player, from one they are simply failing.
 *
 * Depth-first with memoised dead positions. The branching factor is small (a
 * tile has at most four neighbours) and the depth is fixed, so this terminates
 * quickly where a breadth-first frontier would hold thousands of boards.
 */

export interface Solution {
  moves: { from: Point; to: Point }[];
}

export function solve(start: Board, maxVisits = 200_000): Solution | null {
  const dead = new Set<string>();
  let visits = 0;

  const walk = (board: Board): { from: Point; to: Point }[] | null => {
    if (isCleared(board)) return [];
    if (visits++ > maxVisits) return null;
    const key = boardKey(board);
    if (dead.has(key)) return null;

    for (const from of occupied(board)) {
      for (const to of legalTargets(board, from)) {
        const { board: next } = applyMerge(board, from, to);
        const rest = walk(next);
        if (rest) return [{ from, to }, ...rest];
      }
    }
    dead.add(key);
    return null;
  };

  const moves = walk(start);
  return moves ? { moves } : null;
}

/** Whether the level can still be cleared from here. */
export function isSolvable(board: Board): boolean {
  return solve(board) !== null;
}

/** The next move of a clearing sequence, or null when there is none. */
export function hintFor(board: Board): { from: Point; to: Point } | null {
  return solve(board)?.moves[0] ?? null;
}
