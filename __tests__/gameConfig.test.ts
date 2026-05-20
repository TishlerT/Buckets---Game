import {
  DEFENDER_LEVELS,
  GAME_DURATION_SEC,
  POINTS_CONTESTED_MAKE,
  POINTS_OPEN_MAKE,
  POINTS_PERFECT_RELEASE_BONUS,
  TURN_DURATION_SEC,
  XP_LOSS,
  XP_WIN,
} from '@/constants/gameConfig';

describe('gameConfig invariants', () => {
  test('contested makes are worth strictly more than open makes', () => {
    expect(POINTS_CONTESTED_MAKE).toBeGreaterThan(POINTS_OPEN_MAKE);
  });

  test('perfect release bonus is non-negative', () => {
    expect(POINTS_PERFECT_RELEASE_BONUS).toBeGreaterThanOrEqual(0);
  });

  test('winning earns strictly more XP than losing', () => {
    expect(XP_WIN).toBeGreaterThan(XP_LOSS);
  });

  test('game length is divisible into at least two pairs of turns', () => {
    expect(GAME_DURATION_SEC).toBeGreaterThanOrEqual(TURN_DURATION_SEC * 4);
  });

  test('defender difficulty increases monotonically: shorter wind-up, smaller perfect window', () => {
    const levels = [1, 2, 3, 4] as const;
    for (let i = 0; i < levels.length - 1; i++) {
      const a = DEFENDER_LEVELS[levels[i]!]!;
      const b = DEFENDER_LEVELS[levels[i + 1]!]!;
      expect(b.windupMsMin).toBeLessThanOrEqual(a.windupMsMin);
      expect(b.perfectWindowMs).toBeLessThanOrEqual(a.perfectWindowMs);
      expect(b.fakeChance).toBeGreaterThanOrEqual(a.fakeChance);
    }
  });

  test('all defender levels have non-overlapping ear/perfect/late windows that sum positively', () => {
    for (const lvl of Object.values(DEFENDER_LEVELS)) {
      expect(lvl.earlyWindowMs + lvl.perfectWindowMs + lvl.lateWindowMs).toBeGreaterThan(0);
      expect(lvl.windupMsMin).toBeGreaterThan(0);
      expect(lvl.windupMsMax).toBeGreaterThanOrEqual(lvl.windupMsMin);
    }
  });
});
