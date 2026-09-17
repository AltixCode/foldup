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
/**
 * Why a level is shut, which is not the same question as whether it is shut.
 *
 * Two different closures were being treated as one. On a fresh install levels
 * 2 to 50 are shut because the player has not reached them -- ordinary
 * progression -- and level 51 is shut because it is behind the purchase. Both
 * drew a padlock, and tapping either opened the paywall. So the screen said
 * "The first 50 are always free" directly above a grid that asked for money on
 * level 2, which reads as bait and switch to a player and as a contradiction
 * between copy and behaviour to a reviewer.
 *
 * 'progress' is also the answer for a level that does not exist, because there
 * is nothing to sell there either.
 */
export type LockReason = 'open' | 'progress' | 'premium';

export function lockReason(
  level: number,
  highestCleared: number,
  isPremium: boolean,
): LockReason {
  if (isLevelUnlocked(level, highestCleared, isPremium)) return 'open';
  if (level < 1 || level > TOTAL_LEVELS) return 'progress';
  // Only the purchase stands in the way when the player has already reached
  // this level by playing and it is past the free run.
  if (!isPremium && level > FREE_LEVELS && level <= highestCleared + 1) return 'premium';
  return 'progress';
}
