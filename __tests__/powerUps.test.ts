import {
  applyPowerUp,
  consumeDoubleJump,
  consumeOnShot,
  EMPTY_EFFECTS,
  isActive,
  pickRandomPowerUpKind,
  pickSpawnDelayMs,
  spawnPowerUp,
} from '@/game/powerUps';
import {
  GHOST_SHOT_DURATION_MS,
  ICE_DEFENDER_DURATION_MS,
  POWERUP_LIFETIME_MS,
  POWERUP_SPAWN_INTERVAL_MS_MAX,
  POWERUP_SPAWN_INTERVAL_MS_MIN,
  POWERUP_WEIGHTS_OFFENSE,
  SPEED_BOOST_DURATION_MS,
} from '@/constants/gameConfig';

describe('pickRandomPowerUpKind', () => {
  test('returns one of the configured kinds', () => {
    const kinds = Object.keys(POWERUP_WEIGHTS_OFFENSE);
    for (let i = 0; i < 50; i++) {
      const k = pickRandomPowerUpKind(Math.random);
      expect(kinds).toContain(k);
    }
  });

  test('weighted distribution converges over many samples', () => {
    const counts = { biggerRim: 0, doubleJump: 0, speedBoost: 0, iceDefender: 0, ghostShot: 0 };
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const k = pickRandomPowerUpKind(Math.random);
      counts[k]++;
    }
    // biggerRim has the highest weight; should be most common.
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    expect(sorted[0]![0]).toBe('biggerRim');
  });
});

describe('pickSpawnDelayMs', () => {
  test('always within configured bounds', () => {
    for (let i = 0; i < 100; i++) {
      const ms = pickSpawnDelayMs(Math.random);
      expect(ms).toBeGreaterThanOrEqual(POWERUP_SPAWN_INTERVAL_MS_MIN);
      expect(ms).toBeLessThanOrEqual(POWERUP_SPAWN_INTERVAL_MS_MAX);
    }
  });
});

describe('spawnPowerUp', () => {
  test('respects forcedKind', () => {
    const pu = spawnPowerUp(Math.random, 'ghostShot');
    expect(pu.kind).toBe('ghostShot');
  });

  test('lifetime initialized to POWERUP_LIFETIME_MS', () => {
    const pu = spawnPowerUp(Math.random);
    expect(pu.lifetimeRemainingMs).toBe(POWERUP_LIFETIME_MS);
  });

  test('arc position is in [0.1, 0.9]', () => {
    for (let i = 0; i < 50; i++) {
      const pu = spawnPowerUp(Math.random);
      expect(pu.arcPos).toBeGreaterThanOrEqual(0.1);
      expect(pu.arcPos).toBeLessThanOrEqual(0.9);
    }
  });
});

describe('applyPowerUp', () => {
  const NOW = 1_000_000;

  test('biggerRim flips a one-shot flag', () => {
    const e = applyPowerUp(EMPTY_EFFECTS, 'biggerRim', NOW);
    expect(e.biggerRimNextShot).toBe(true);
  });

  test('speedBoost sets expiration for SPEED_BOOST_DURATION_MS', () => {
    const e = applyPowerUp(EMPTY_EFFECTS, 'speedBoost', NOW);
    expect(e.speedBoostExpiresAt).toBe(NOW + SPEED_BOOST_DURATION_MS);
  });

  test('iceDefender sets expiration for ICE_DEFENDER_DURATION_MS', () => {
    const e = applyPowerUp(EMPTY_EFFECTS, 'iceDefender', NOW);
    expect(e.iceDefenderExpiresAt).toBe(NOW + ICE_DEFENDER_DURATION_MS);
  });

  test('ghostShot sets expiration for GHOST_SHOT_DURATION_MS', () => {
    const e = applyPowerUp(EMPTY_EFFECTS, 'ghostShot', NOW);
    expect(e.ghostShotExpiresAt).toBe(NOW + GHOST_SHOT_DURATION_MS);
  });

  test('doubleJump sets availability', () => {
    const e = applyPowerUp(EMPTY_EFFECTS, 'doubleJump', NOW);
    expect(e.doubleJumpAvailable).toBe(true);
  });

  test('returns a NEW object (immutable)', () => {
    const e1 = applyPowerUp(EMPTY_EFFECTS, 'biggerRim', NOW);
    expect(e1).not.toBe(EMPTY_EFFECTS);
    expect(EMPTY_EFFECTS.biggerRimNextShot).toBe(false);
  });
});

describe('isActive', () => {
  test('null = inactive', () => expect(isActive(null, 1000)).toBe(false));
  test('expired = inactive', () => expect(isActive(900, 1000)).toBe(false));
  test('future = active', () => expect(isActive(2000, 1000)).toBe(true));
});

describe('consumeOnShot', () => {
  test('clears biggerRim and ghostShot', () => {
    const start = applyPowerUp(applyPowerUp(EMPTY_EFFECTS, 'biggerRim', 0), 'ghostShot', 0);
    const after = consumeOnShot(start);
    expect(after.biggerRimNextShot).toBe(false);
    expect(after.ghostShotExpiresAt).toBeNull();
  });

  test('preserves speedBoost and iceDefender', () => {
    const NOW = 100;
    const start = applyPowerUp(applyPowerUp(EMPTY_EFFECTS, 'speedBoost', NOW), 'iceDefender', NOW);
    const after = consumeOnShot(start);
    expect(after.speedBoostExpiresAt).toBe(NOW + SPEED_BOOST_DURATION_MS);
    expect(after.iceDefenderExpiresAt).toBe(NOW + ICE_DEFENDER_DURATION_MS);
  });
});

describe('consumeDoubleJump', () => {
  test('clears the flag', () => {
    const start = applyPowerUp(EMPTY_EFFECTS, 'doubleJump', 0);
    const after = consumeDoubleJump(start);
    expect(after.doubleJumpAvailable).toBe(false);
  });
});
