/** Free players may finish this many levels before the unlock is needed. */
export const FREE_LEVELS = 30;

/** Levels the app ships. */
export const TOTAL_LEVELS = 300;

/**
 * Stars for finishing a level in `moves` against `par`.
 *
 * Three for par (or better — the solver's par is the shortest solution, so
 * "better" should be impossible, but a rule that punishes an unexpected route
 * is worse than one that rewards it), two within a quarter over, one otherwise.
 * Finishing always earns at least one: this genre has no fail state, and a
 * zero-star result reads as a loss.
 */
export function starsFor(moves: number, par: number): 1 | 2 | 3 {
  if (moves <= par) return 3;
  if (moves <= Math.ceil(par * 1.25)) return 2;
  return 1;
}

export function isLevelUnlocked(level: number, highestCleared: number, isPremium: boolean): boolean {
  if (level < 1 || level > TOTAL_LEVELS) return false;
  // Never gate a level the player has already reached by playing.
  if (level <= highestCleared + 1 && level <= FREE_LEVELS) return true;
  return isPremium && level <= highestCleared + 1;
}
