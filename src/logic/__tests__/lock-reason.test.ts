import { FREE_LEVELS, TOTAL_LEVELS, lockReason } from '@/logic/stars';

/**
 * A level can be shut for two completely different reasons, and the app was
 * treating them as one.
 *
 * On a fresh install, levels 2 to 50 are shut because the player has not
 * reached them yet -- ordinary progression in a level-based puzzle. Level 51
 * is shut because it is behind the purchase. Both drew a padlock, and tapping
 * either one opened the paywall.
 *
 * Which means the screen said "The first 50 are always free" directly above a
 * grid where tapping level 2 asked for money. That reads as bait and switch to
 * a player, and to a reviewer it is a plain contradiction between the app's own
 * copy and its behaviour.
 */
describe('lockReason', () => {
  it('opens the next level after the one just cleared', () => {
    expect(lockReason(1, 0, false)).toBe('open');
    expect(lockReason(2, 1, false)).toBe('open');
  });

  it('calls a not-yet-reached free level progress, never premium', () => {
    // The exact case agent 3 photographed: fresh install, level 2.
    expect(lockReason(2, 0, false)).toBe('progress');
    expect(lockReason(50, 0, false)).toBe('progress');
    expect(lockReason(FREE_LEVELS, 10, false)).toBe('progress');
  });

  it('calls the first level past the free run premium', () => {
    // Cleared every free level: the only thing in the way now is the purchase.
    expect(lockReason(FREE_LEVELS + 1, FREE_LEVELS, false)).toBe('premium');
  });

  it('does not sell to someone who has already bought', () => {
    expect(lockReason(FREE_LEVELS + 1, FREE_LEVELS, true)).toBe('open');
    // Still progression-locked for a buyer who has not got there yet.
    expect(lockReason(FREE_LEVELS + 5, FREE_LEVELS, true)).toBe('progress');
  });

  it('never reports progress for a level that does not exist', () => {
    expect(lockReason(TOTAL_LEVELS + 1, TOTAL_LEVELS, true)).toBe('progress');
    expect(lockReason(0, 0, true)).toBe('progress');
  });
});
