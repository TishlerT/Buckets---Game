import {
  DEFENDER_LEVELS,
  FAKE_COOLDOWN_MS,
  POST_RESULT_PAUSE_MS,
} from '@/constants/gameConfig';
import {
  initDefenseState,
  processSwipe,
  tickDefense,
} from '@/game/defenseLogic';

function rng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length]!;
}

// Helper: drive the FSM a chain of ticks.
function driveTo(state: ReturnType<typeof initDefenseState>, nowMs: number, _rng = rng([0.99])) {
  return tickDefense(state, nowMs, _rng);
}

describe('initDefenseState', () => {
  test('starts in IDLE phase', () => {
    const s = initDefenseState(2, 1000);
    expect(s.phase).toBe('IDLE');
    expect(s.lastOutcome).toBeNull();
  });
});

describe('tickDefense — non-fake path (Level 1, no fakes)', () => {
  test('IDLE → WINDUP after the initial pause', () => {
    let s = initDefenseState(1, 0);
    s = driveTo(s, 5000); // way past phase end
    expect(s.phase).toBe('WINDUP');
    expect(s.releaseAtMs).not.toBeNull();
    expect(s.willFake).toBe(false);
  });

  test('WINDUP → RELEASE at the scheduled release time', () => {
    let s = initDefenseState(1, 0);
    s = driveTo(s, 5000); // → WINDUP
    const rel = s.releaseAtMs!;
    s = driveTo(s, rel + 1);
    expect(s.phase).toBe('RELEASE');
    expect(s.releaseAtMs).toBe(rel);
  });

  test('RELEASE auto-resolves to LATE if no swipe within lateWindow', () => {
    const cfg = DEFENDER_LEVELS[1];
    let s = initDefenseState(1, 0);
    s = driveTo(s, 5000); // WINDUP
    const rel = s.releaseAtMs!;
    s = driveTo(s, rel + 1); // RELEASE
    s = driveTo(s, rel + cfg.lateWindowMs + 5); // expire RELEASE phase
    expect(s.phase).toBe('RESULT');
    expect(s.lastOutcome).toBe('LATE');
  });

  test('after RESULT pause expires, FSM returns to IDLE → WINDUP', () => {
    let s = initDefenseState(1, 0);
    s = driveTo(s, 5000); // IDLE → WINDUP
    const rel = s.releaseAtMs!;
    s = driveTo(s, rel + 1); // WINDUP → RELEASE
    // Tick 1: RELEASE → RESULT (auto-late, since no swipe).
    s = driveTo(s, rel + 1000);
    expect(s.phase).toBe('RESULT');
    // Tick 2: after RESULT phase fully expires, go back to IDLE.
    s = driveTo(s, s.phaseEndsAtMs + 10);
    expect(s.phase).toBe('IDLE');
    // Tick 3: after IDLE pause expires, start next WINDUP.
    s = driveTo(s, s.phaseEndsAtMs + 10);
    expect(s.phase).toBe('WINDUP');
  });
});

describe('tickDefense — fake path', () => {
  test('Level 4 with rng=0 fakes; phase goes WINDUP → FAKE_RESET → IDLE', () => {
    let s = initDefenseState(4, 0);
    s = tickDefense(s, 5000, rng([0])); // → WINDUP (fake true)
    expect(s.willFake).toBe(true);
    expect(s.releaseAtMs).toBeNull(); // no release scheduled for fakes
    s = tickDefense(s, s.phaseEndsAtMs + 1, rng([0])); // → FAKE_RESET
    expect(s.phase).toBe('FAKE_RESET');
    s = tickDefense(s, s.phaseEndsAtMs + 1, rng([0])); // → IDLE
    expect(s.phase).toBe('IDLE');
  });

  test('Level 1 (Grandpa) never fakes regardless of rng', () => {
    let s = initDefenseState(1, 0);
    s = tickDefense(s, 5000, rng([0]));
    expect(s.willFake).toBe(false);
    expect(s.releaseAtMs).not.toBeNull();
  });
});

describe('processSwipe — timing classification', () => {
  // Use level 2 for clean numbers
  const lvl = 2 as 2;
  const cfg = DEFENDER_LEVELS[lvl];

  function inRelease(release: number) {
    return {
      phase: 'RELEASE' as const,
      level: lvl,
      phaseStartedAtMs: release,
      phaseEndsAtMs: release + cfg.lateWindowMs,
      releaseAtMs: release,
      willFake: false,
      swipeCooldownUntilMs: 0,
      lastOutcome: null as null,
    };
  }

  test('PERFECT at exactly release time', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000);
    expect(r.outcome).toBe('PERFECT');
    expect(r.state.lastOutcome).toBe('PERFECT');
  });

  test('PERFECT at the edge of perfect window', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000 + cfg.perfectWindowMs);
    expect(r.outcome).toBe('PERFECT');
  });

  test('LATE just past perfect window', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000 + cfg.perfectWindowMs + 1);
    expect(r.outcome).toBe('LATE');
  });

  test('EARLY in the early band before release', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000 - cfg.perfectWindowMs - 5);
    expect(r.outcome).toBe('EARLY');
  });

  test('IGNORED far before release (outside any window)', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000 - cfg.earlyWindowMs - cfg.perfectWindowMs - 100);
    expect(r.outcome).toBe('IGNORED');
  });

  test('IGNORED far after release (outside late window)', () => {
    const s = inRelease(1000);
    const r = processSwipe(s, 1000 + cfg.perfectWindowMs + cfg.lateWindowMs + 200);
    expect(r.outcome).toBe('IGNORED');
  });
});

describe('processSwipe — fake bait', () => {
  const lvl = 3;
  function midFake(start: number) {
    return {
      phase: 'FAKE_RESET' as const,
      level: lvl as 3,
      phaseStartedAtMs: start,
      phaseEndsAtMs: start + 1000,
      releaseAtMs: null,
      willFake: true,
      swipeCooldownUntilMs: 0,
      lastOutcome: null,
    };
  }

  test('swiping during a fake = BAITED + cooldown applied', () => {
    const s = midFake(1000);
    const r = processSwipe(s, 1100);
    expect(r.outcome).toBe('BAITED');
    expect(r.state.swipeCooldownUntilMs).toBe(1100 + FAKE_COOLDOWN_MS);
  });

  test('a second swipe during cooldown is also BAITED', () => {
    const s = midFake(1000);
    const r1 = processSwipe(s, 1100);
    expect(r1.outcome).toBe('BAITED');
    const r2 = processSwipe(r1.state, 1100 + FAKE_COOLDOWN_MS / 2);
    expect(r2.outcome).toBe('BAITED');
  });
});

describe('processSwipe — IGNORED in IDLE/RESULT', () => {
  test('swipe during IDLE is IGNORED (no release anchor)', () => {
    const s = initDefenseState(2, 1000);
    const r = processSwipe(s, 1500);
    expect(r.outcome).toBe('IGNORED');
  });

  test('swipe during RESULT is IGNORED', () => {
    const lvl = 2 as 2;
    const cfg = DEFENDER_LEVELS[lvl];
    const s = {
      phase: 'RESULT' as const,
      level: lvl,
      phaseStartedAtMs: 0,
      phaseEndsAtMs: POST_RESULT_PAUSE_MS,
      releaseAtMs: null,
      willFake: false,
      swipeCooldownUntilMs: 0,
      lastOutcome: 'PERFECT' as const,
    };
    expect(cfg).toBeTruthy(); // sanity
    const r = processSwipe(s, 200);
    expect(r.outcome).toBe('IGNORED');
  });
});

describe('processSwipe — boundary monotonicity across levels', () => {
  // Stricter levels have smaller perfect windows. A swipe that's PERFECT on
  // level 1 may be LATE on level 4 because the window is smaller.
  test('a 100ms-late swipe is PERFECT on level 1, LATE on level 4', () => {
    const release = 1000;

    const s1 = {
      phase: 'RELEASE' as const,
      level: 1 as const,
      phaseStartedAtMs: release,
      phaseEndsAtMs: release + 250,
      releaseAtMs: release,
      willFake: false,
      swipeCooldownUntilMs: 0,
      lastOutcome: null,
    };
    const r1 = processSwipe(s1, release + 100);
    expect(r1.outcome).toBe('PERFECT'); // level 1 perfect = ±180 (after retune)

    const s4 = { ...s1, level: 4 as const };
    const r4 = processSwipe(s4, release + 100);
    expect(r4.outcome).toBe('LATE'); // level 4 perfect = ±70, 100 is past it
  });
});
