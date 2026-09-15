import { FREE_LEVELS, TOTAL_LEVELS, isLevelUnlocked, starsFor } from '../stars';

describe('starsFor', () => {
  it('gives three for par', () => {
    expect(starsFor(10, 10)).toBe(3);
  });

  it('gives three for better than par rather than punishing a surprise route', () => {
    expect(starsFor(8, 10)).toBe(3);
  });

  it('gives two within a quarter over par', () => {
    expect(starsFor(12, 10)).toBe(2);
    expect(starsFor(13, 10)).toBe(2);
  });

  it('gives one beyond that — never zero, because finishing is not a loss', () => {
    expect(starsFor(30, 10)).toBe(1);
    expect(starsFor(1000, 10)).toBe(1);
  });

  it('handles a par of one', () => {
    expect(starsFor(1, 1)).toBe(3);
    expect(starsFor(2, 1)).toBe(2);
  });
});

describe('isLevelUnlocked', () => {
  it('always opens level 1', () => {
    expect(isLevelUnlocked(1, 0, false)).toBe(true);
  });

  it('opens the next level after the one just cleared', () => {
    expect(isLevelUnlocked(5, 4, false)).toBe(true);
    expect(isLevelUnlocked(6, 4, false)).toBe(false);
  });

  it('stops a free player at the free ceiling', () => {
    expect(isLevelUnlocked(FREE_LEVELS, FREE_LEVELS - 1, false)).toBe(true);
    expect(isLevelUnlocked(FREE_LEVELS + 1, FREE_LEVELS, false)).toBe(false);
  });

  it('lets a premium player carry on past it', () => {
    expect(isLevelUnlocked(FREE_LEVELS + 1, FREE_LEVELS, true)).toBe(true);
  });

  it('still requires premium players to play in order', () => {
    expect(isLevelUnlocked(150, 10, true)).toBe(false);
  });

  it('refuses a level outside the shipped range', () => {
    expect(isLevelUnlocked(0, 10, true)).toBe(false);
    expect(isLevelUnlocked(TOTAL_LEVELS + 1, TOTAL_LEVELS, true)).toBe(false);
  });
});
