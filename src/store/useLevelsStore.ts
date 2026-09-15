import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { starsFor } from '@/logic/stars';

const STORAGE_KEY = 'foldup.levels.v1';

/** Best result per level, keyed by level number. */
export type LevelResults = Record<number, { moves: number; stars: 1 | 2 | 3 }>;

interface LevelsState {
  results: LevelResults;
  isHydrated: boolean;

  hydrate: () => Promise<void>;
  recordClear: (level: number, moves: number, par: number) => void;
  highestCleared: () => number;
  totalStars: () => number;
  resetForTests: () => void;
}

async function persist(results: LevelResults): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(results));
  } catch {
    // A failed write costs this session's progress, not the app.
  }
}

export const useLevelsStore = create<LevelsState>((set, get) => ({
  results: {},
  isHydrated: false,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : {};
      const results =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as LevelResults) : {};
      set({ results, isHydrated: true });
    } catch {
      set({ results: {}, isHydrated: true });
    }
  },

  recordClear(level, moves, par) {
    const results = get().results;
    const previous = results[level];
    // Replaying a level must never make the record worse.
    if (previous && previous.moves <= moves) return;
    const next: LevelResults = { ...results, [level]: { moves, stars: starsFor(moves, par) } };
    set({ results: next });
    void persist(next);
  },

  highestCleared() {
    const levels = Object.keys(get().results).map(Number);
    return levels.length === 0 ? 0 : Math.max(...levels);
  },

  totalStars() {
    return Object.values(get().results).reduce((sum, r) => sum + r.stars, 0);
  },

  resetForTests() {
    set({ results: {}, isHydrated: false });
  },
}));
