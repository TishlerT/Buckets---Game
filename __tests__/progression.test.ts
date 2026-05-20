import {
  COURT_UNLOCK_COST,
  DEFENDER_UNLOCK_COST,
  UNLOCK_POINTS_PER_LEVEL,
  XP_LOSS,
  XP_PERFECT_BLOCK_BONUS,
  XP_WIN,
} from '@/constants/gameConfig';
import {
  applyXp,
  defaultProgression,
  isUnlocked,
  levelFromXp,
  loadProgression,
  lookupCost,
  purchaseUnlock,
  saveProgression,
  selectItem,
  STORAGE_KEY,
  xpForGameResult,
  xpProgressInLevel,
  xpThresholdForLevel,
} from '@/game/progression';

const AsyncStorage = require('@react-native-async-storage/async-storage');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('defaultProgression', () => {
  test('starts at level 1 with playground/grandpa/classic unlocked', () => {
    const p = defaultProgression();
    expect(p.totalXp).toBe(0);
    expect(p.unlockPoints).toBe(0);
    expect(p.unlocked.courts).toEqual(['playground']);
    expect(p.unlocked.defenders).toEqual(['grandpa']);
    expect(p.unlocked.skins).toEqual(['classic']);
    expect(p.selected.court).toBe('playground');
  });
});

describe('xpThresholdForLevel', () => {
  test('level 1 = 0 XP', () => {
    expect(xpThresholdForLevel(1)).toBe(0);
  });
  test('thresholds are strictly increasing', () => {
    let prev = -1;
    for (let n = 1; n <= 10; n++) {
      const t = xpThresholdForLevel(n);
      expect(t).toBeGreaterThan(prev);
      prev = t;
    }
  });
  test('cumulative gap from level N to N+1 grows', () => {
    let prevGap = -1;
    for (let n = 1; n <= 5; n++) {
      const gap = xpThresholdForLevel(n + 1) - xpThresholdForLevel(n);
      expect(gap).toBeGreaterThanOrEqual(prevGap);
      prevGap = gap;
    }
  });
});

describe('levelFromXp', () => {
  test('0 xp = level 1', () => {
    expect(levelFromXp(0)).toBe(1);
  });
  test('threshold for L2 -1 = level 1, threshold for L2 = level 2', () => {
    const t2 = xpThresholdForLevel(2);
    expect(levelFromXp(t2 - 1)).toBe(1);
    expect(levelFromXp(t2)).toBe(2);
  });
  test('large XP yields level > 1', () => {
    expect(levelFromXp(100_000)).toBeGreaterThan(5);
  });
});

describe('xpProgressInLevel', () => {
  test('returns level + xpInLevel + xpForNextLevel for a known XP', () => {
    const t2 = xpThresholdForLevel(2);
    const p = xpProgressInLevel(t2 + 5);
    expect(p.level).toBe(2);
    expect(p.xpInLevel).toBe(5);
    expect(p.xpForNextLevel).toBe(xpThresholdForLevel(3) - t2);
  });
});

describe('xpForGameResult', () => {
  test('win + 0 blocks = XP_WIN', () => {
    const r = xpForGameResult({ win: true, perfectBlocks: 0 });
    expect(r.total).toBe(XP_WIN);
  });
  test('loss + N blocks = XP_LOSS + N*bonus', () => {
    const r = xpForGameResult({ win: false, perfectBlocks: 3 });
    expect(r.total).toBe(XP_LOSS + 3 * XP_PERFECT_BLOCK_BONUS);
  });
});

describe('applyXp', () => {
  test('no level change when XP is small', () => {
    const p0 = defaultProgression();
    const r = applyXp(p0, 10);
    expect(r.next.totalXp).toBe(10);
    expect(r.levelsGained).toBe(0);
    expect(r.pointsGained).toBe(0);
  });

  test('crossing one level grants UNLOCK_POINTS_PER_LEVEL', () => {
    const p0 = defaultProgression();
    const t2 = xpThresholdForLevel(2);
    const r = applyXp(p0, t2);
    expect(r.levelsGained).toBe(1);
    expect(r.pointsGained).toBe(UNLOCK_POINTS_PER_LEVEL);
    expect(r.next.unlockPoints).toBe(UNLOCK_POINTS_PER_LEVEL);
  });

  test('crossing multiple levels in one game grants the right total', () => {
    const p0 = defaultProgression();
    const t4 = xpThresholdForLevel(4);
    const r = applyXp(p0, t4);
    expect(r.levelsGained).toBe(3);
    expect(r.pointsGained).toBe(3 * UNLOCK_POINTS_PER_LEVEL);
  });
});

describe('purchaseUnlock', () => {
  test('buys gym when affordable; subtracts cost; flag unlocked', () => {
    let p = defaultProgression();
    p = { ...p, unlockPoints: COURT_UNLOCK_COST.gym + 1 };
    const after = purchaseUnlock(p, 'court', 'gym');
    expect(after).not.toBeNull();
    expect(isUnlocked(after!, 'court', 'gym')).toBe(true);
    expect(after!.unlockPoints).toBe(1);
  });

  test('refuses when broke', () => {
    let p = defaultProgression();
    p = { ...p, unlockPoints: 0 };
    const after = purchaseUnlock(p, 'court', 'gym');
    expect(after).toBeNull();
  });

  test('refuses double-purchase', () => {
    let p = defaultProgression();
    p = { ...p, unlockPoints: 100 };
    p = purchaseUnlock(p, 'defender', 'recLeague')!;
    const dup = purchaseUnlock(p, 'defender', 'recLeague');
    expect(dup).toBeNull();
    // points were spent only once
    expect(p.unlockPoints).toBe(100 - DEFENDER_UNLOCK_COST.recLeague);
  });

  test('zero-cost items (already unlocked at start) cannot be bought', () => {
    const p = defaultProgression();
    expect(purchaseUnlock(p, 'court', 'playground')).toBeNull();
  });
});

describe('selectItem', () => {
  test('selects unlocked court', () => {
    let p = defaultProgression();
    p = { ...p, unlockPoints: 10 };
    p = purchaseUnlock(p, 'court', 'gym')!;
    const sel = selectItem(p, 'court', 'gym');
    expect(sel?.selected.court).toBe('gym');
  });
  test('refuses to select locked item', () => {
    const p = defaultProgression();
    expect(selectItem(p, 'court', 'space')).toBeNull();
  });
});

describe('lookupCost', () => {
  test('returns numeric cost or null for unknown', () => {
    expect(lookupCost('court', 'space')).toBe(COURT_UNLOCK_COST.space);
    expect(lookupCost('defender', 'alien')).toBe(DEFENDER_UNLOCK_COST.alien);
    expect(lookupCost('court', 'nope-not-a-court')).toBeNull();
  });
});

describe('persistence', () => {
  test('load on empty storage returns defaults', async () => {
    const p = await loadProgression();
    expect(p.totalXp).toBe(0);
    expect(p.unlocked.courts).toEqual(['playground']);
  });

  test('save then load round-trip preserves state', async () => {
    let p = defaultProgression();
    p = { ...p, unlockPoints: 7, totalXp: 1500 };
    await saveProgression(p);
    const loaded = await loadProgression();
    expect(loaded.totalXp).toBe(1500);
    expect(loaded.unlockPoints).toBe(7);
  });

  test('corrupted storage value falls back to defaults', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, 'not-json');
    const loaded = await loadProgression();
    expect(loaded.totalXp).toBe(0);
  });

  test('older schemaVersion falls back to defaults', async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ schemaVersion: 0, totalXp: 99999, unlockPoints: 99 })
    );
    const loaded = await loadProgression();
    expect(loaded.totalXp).toBe(0);
  });
});
