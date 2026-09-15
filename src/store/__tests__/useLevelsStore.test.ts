import AsyncStorage from '@react-native-async-storage/async-storage';

import { useLevelsStore } from '../useLevelsStore';

const KEY = 'foldup.levels.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  useLevelsStore.getState().resetForTests();
  jest.restoreAllMocks();
});

describe('hydrate', () => {
  it('starts empty', async () => {
    await useLevelsStore.getState().hydrate();
    expect(useLevelsStore.getState()).toMatchObject({ results: {}, isHydrated: true });
  });

  it('restores saved results', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ 3: { moves: 12, stars: 2 } }));
    await useLevelsStore.getState().hydrate();
    expect(useLevelsStore.getState().results[3]).toEqual({ moves: 12, stars: 2 });
  });

  it('survives a corrupt blob', async () => {
    await AsyncStorage.setItem(KEY, 'not json');
    await useLevelsStore.getState().hydrate();
    expect(useLevelsStore.getState()).toMatchObject({ results: {}, isHydrated: true });
  });

  it('becomes hydrated even when the store cannot be read', async () => {
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('locked'));
    await useLevelsStore.getState().hydrate();
    expect(useLevelsStore.getState().isHydrated).toBe(true);
  });
});

describe('recordClear', () => {
  it('records a clear with its star rating', () => {
    useLevelsStore.getState().recordClear(1, 10, 10);
    expect(useLevelsStore.getState().results[1]).toEqual({ moves: 10, stars: 3 });
  });

  it('persists it', async () => {
    useLevelsStore.getState().recordClear(2, 15, 12);
    const raw = await AsyncStorage.getItem(KEY);
    expect(JSON.parse(raw!)['2'].moves).toBe(15);
  });

  it('keeps the better result when a level is replayed worse', () => {
    const { recordClear } = useLevelsStore.getState();
    recordClear(1, 10, 10);
    recordClear(1, 40, 10);
    expect(useLevelsStore.getState().results[1]).toEqual({ moves: 10, stars: 3 });
  });

  it('improves the record when the replay is better', () => {
    const { recordClear } = useLevelsStore.getState();
    recordClear(1, 40, 10);
    recordClear(1, 10, 10);
    expect(useLevelsStore.getState().results[1]).toEqual({ moves: 10, stars: 3 });
  });

  it('does not throw when persistence fails', () => {
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    expect(() => useLevelsStore.getState().recordClear(1, 10, 10)).not.toThrow();
  });
});

describe('highestCleared / totalStars', () => {
  it('is zero with nothing cleared', () => {
    expect(useLevelsStore.getState().highestCleared()).toBe(0);
    expect(useLevelsStore.getState().totalStars()).toBe(0);
  });

  it('reports the furthest level reached and the stars earned', () => {
    const { recordClear } = useLevelsStore.getState();
    recordClear(1, 10, 10);
    recordClear(2, 20, 10);
    recordClear(3, 11, 10);
    expect(useLevelsStore.getState().highestCleared()).toBe(3);
    expect(useLevelsStore.getState().totalStars()).toBe(3 + 1 + 2);
  });
});
