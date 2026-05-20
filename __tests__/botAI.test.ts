import {
  botShotResult,
  pickWindupMs,
  shouldFake,
  tickDefender,
} from '@/game/botAI';
import { BOT_DEFENDER_BY_LEVEL, DEFENDER_LEVELS } from '@/constants/gameConfig';

function seq(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('tickDefender', () => {
  test('frozen defender does not move regardless of inputs', () => {
    const out = tickDefender(4, 0.2, 0.9, 0.1, 800, true);
    expect(out).toBe(0.2);
  });

  test('moves toward target but stops near maxDistance', () => {
    const arc = 800;
    const next = tickDefender(2, 0.2, 0.8, 1.0, arc, false);
    // With closeOutSpeed=140 px/s and dt=1s, defender can move 140/800 ≈ 0.175 norm.
    // It heads toward the target, should be > 0.2.
    expect(next).toBeGreaterThan(0.2);
    expect(next).toBeLessThan(0.8);
  });

  test('stays in [0,1] range when target is at edges', () => {
    const out1 = tickDefender(1, 0.99, 1.5, 0.5, 1, false);
    expect(out1).toBeLessThanOrEqual(1);
    const out2 = tickDefender(1, 0.01, -0.5, 0.5, 1, false);
    expect(out2).toBeGreaterThanOrEqual(0);
  });

  test('higher level defender closes out faster', () => {
    const arc = 800, dt = 0.1, current = 0.2, target = 0.9;
    const slow = tickDefender(1, current, target, dt, arc, false);
    const fast = tickDefender(4, current, target, dt, arc, false);
    expect(fast - current).toBeGreaterThan(slow - current);
  });
});

describe('shouldFake', () => {
  test('Level 1 (Grandpa) never fakes', () => {
    expect(shouldFake(1, () => 0.0)).toBe(false);
    expect(shouldFake(1, () => 0.99)).toBe(false);
  });

  test('Level 4 (Alien) fakes on at least half of attempts (rng=0)', () => {
    expect(shouldFake(4, () => 0.0)).toBe(true);
  });

  test('Level 3 honors fakeChance threshold', () => {
    const cfg = DEFENDER_LEVELS[3];
    expect(shouldFake(3, () => cfg.fakeChance - 0.001)).toBe(true);
    expect(shouldFake(3, () => cfg.fakeChance + 0.001)).toBe(false);
  });
});

describe('pickWindupMs', () => {
  test('result is at least 150ms (sanity floor)', () => {
    for (let i = 0; i < 50; i++) {
      const ms = pickWindupMs(4, Math.random);
      expect(ms).toBeGreaterThanOrEqual(150);
    }
  });

  test('Level 1 average is greater than Level 4 average', () => {
    const N = 200;
    let sum1 = 0, sum4 = 0;
    for (let i = 0; i < N; i++) {
      sum1 += pickWindupMs(1, Math.random);
      sum4 += pickWindupMs(4, Math.random);
    }
    expect(sum1 / N).toBeGreaterThan(sum4 / N);
  });

  test('Level 4 has wider jitter than Level 1', () => {
    const N = 200;
    const collect = (lvl: 1 | 4) => {
      const arr: number[] = [];
      for (let i = 0; i < N; i++) arr.push(pickWindupMs(lvl, Math.random));
      const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
      const variance = arr.reduce((a, b) => a + (b - mean) * (b - mean), 0) / arr.length;
      return Math.sqrt(variance);
    };
    expect(collect(4)).toBeGreaterThan(collect(1));
  });
});

describe('botShotResult', () => {
  test('rng below makeProb → make', () => {
    const cfg = DEFENDER_LEVELS[2];
    expect(botShotResult(2, () => cfg.botMakeProb - 0.001)).toBe('make');
  });
  test('rng above makeProb → miss', () => {
    const cfg = DEFENDER_LEVELS[2];
    expect(botShotResult(2, () => cfg.botMakeProb + 0.001)).toBe('miss');
  });
});

describe('config sanity for bot', () => {
  test('every level has defender close-out speed > 0', () => {
    for (const lvl of [1, 2, 3, 4] as const) {
      expect(BOT_DEFENDER_BY_LEVEL[lvl].closeOutSpeed).toBeGreaterThan(0);
    }
  });
});
