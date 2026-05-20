import {
  PERFECT_RELEASE_WINDOW_MS,
  PULL_MAX_PX,
  PULL_MIN_FOR_RELEASE_PX,
  RELEASE_HOLD_TARGET_MS,
  RIM_HITBOX_SIZE,
  SHOT_FLIGHT_MS_MAX,
  SHOT_FLIGHT_MS_MIN,
} from '@/constants/gameConfig';
import {
  aimFromPull,
  classifyShot,
  computeFlight,
  isCancelledRelease,
  isPerfectRelease,
  pointsFor,
  pullToPower,
  resolveShot,
  sampleFlight,
  vlen,
} from '@/game/shotPhysics';

// Deterministic RNG factory used in classifyShot tests.
function fixedRng(value: number) {
  return () => value;
}

const PLAYER = { x: 200, y: 700 };
const RIM = { x: 200, y: 200 };

describe('pullToPower', () => {
  test('zero pull yields zero power', () => {
    expect(pullToPower(0)).toBe(0);
  });
  test('pull below deadzone yields zero', () => {
    expect(pullToPower(5)).toBe(0);
  });
  test('max pull clamps to power max (≈1)', () => {
    expect(pullToPower(PULL_MAX_PX)).toBeCloseTo(1, 1);
  });
  test('overpull does not exceed max', () => {
    expect(pullToPower(PULL_MAX_PX + 500)).toBeCloseTo(1, 1);
  });
  test('mid pull is between min and max power', () => {
    const mid = pullToPower(PULL_MAX_PX / 2);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });
});

describe('isCancelledRelease', () => {
  test('flick below the threshold cancels (no shot)', () => {
    expect(isCancelledRelease(PULL_MIN_FOR_RELEASE_PX - 1)).toBe(true);
  });
  test('past threshold = real shot', () => {
    expect(isCancelledRelease(PULL_MIN_FOR_RELEASE_PX + 1)).toBe(false);
  });
});

describe('aimFromPull', () => {
  test('pulling straight down produces a launch direction pointing straight up', () => {
    const aim = aimFromPull({ x: 0, y: 100 });
    expect(aim.x).toBeCloseTo(0, 6);
    expect(aim.y).toBeLessThan(0); // up = negative y
    expect(vlen(aim)).toBeCloseTo(1, 6);
  });

  test('pulling down-and-right launches up-and-left (slingshot mirror)', () => {
    const aim = aimFromPull({ x: 60, y: 100 });
    expect(aim.x).toBeLessThan(0);
    expect(aim.y).toBeLessThan(0);
  });

  test('pulling up still launches up (degenerate flip guard)', () => {
    const aim = aimFromPull({ x: 0, y: -100 });
    expect(aim.y).toBeLessThan(0);
  });

  test('aim is clamped to AIM_MAX_DEG of vertical', () => {
    // Extreme horizontal pull
    const aim = aimFromPull({ x: 500, y: 1 });
    // Angle from vertical = atan2(|x|, |y|), with y<0 meaning up.
    const angleFromUpDeg = Math.atan2(Math.abs(aim.x), Math.abs(aim.y)) * (180 / Math.PI);
    expect(angleFromUpDeg).toBeLessThanOrEqual(36); // AIM_MAX_DEG=35 +1 fp slack
  });
});

describe('computeFlight', () => {
  test('flight duration scales with power within configured bounds', () => {
    const aim = { x: 0, y: -1 };
    const weak = computeFlight(PLAYER, RIM, aim, 0.4);
    const strong = computeFlight(PLAYER, RIM, aim, 1.0);
    expect(weak.durationMs).toBeGreaterThanOrEqual(SHOT_FLIGHT_MS_MIN);
    expect(strong.durationMs).toBeLessThanOrEqual(SHOT_FLIGHT_MS_MAX);
    expect(strong.durationMs).toBeGreaterThan(weak.durationMs);
  });

  test('apex sits between start and end on x, above both on y', () => {
    const aim = { x: 0, y: -1 };
    const flight = computeFlight(PLAYER, RIM, aim, 0.7);
    const minX = Math.min(flight.start.x, flight.end.x);
    const maxX = Math.max(flight.start.x, flight.end.x);
    expect(flight.apex.x).toBeGreaterThanOrEqual(minX - 0.001);
    expect(flight.apex.x).toBeLessThanOrEqual(maxX + 0.001);
    expect(flight.apex.y).toBeLessThan(Math.min(flight.start.y, flight.end.y));
  });

  test('straight-up aim from player below rim lands at rim X (open shot scenario)', () => {
    const aim = { x: 0, y: -1 };
    const flight = computeFlight(PLAYER, RIM, aim, 0.7);
    expect(flight.end.x).toBeCloseTo(PLAYER.x, 1);
    expect(flight.end.y).toBeCloseTo(RIM.y, 1);
  });

  test('off-angle aim shifts landing x in the aim direction', () => {
    const aim = { x: 0.3, y: -0.95 };
    const flight = computeFlight(PLAYER, RIM, aim, 0.7);
    expect(flight.end.x).toBeGreaterThan(PLAYER.x);
  });
});

describe('sampleFlight', () => {
  test('t=0 returns start, t=1 returns end', () => {
    const flight = computeFlight(PLAYER, RIM, { x: 0, y: -1 }, 0.7);
    const a = sampleFlight(flight, 0);
    const b = sampleFlight(flight, 1);
    expect(a.x).toBeCloseTo(flight.start.x, 5);
    expect(a.y).toBeCloseTo(flight.start.y, 5);
    expect(b.x).toBeCloseTo(flight.end.x, 5);
    expect(b.y).toBeCloseTo(flight.end.y, 5);
  });

  test('mid-flight is at or above apex baseline (curves over)', () => {
    const flight = computeFlight(PLAYER, RIM, { x: 0, y: -1 }, 1.0);
    const mid = sampleFlight(flight, 0.5);
    // At t=0.5 the bezier puts us above the start/end midpoint.
    expect(mid.y).toBeLessThan((flight.start.y + flight.end.y) / 2);
  });
});

describe('classifyShot', () => {
  const aimUp = { x: 0, y: -1 };

  test('dead-center shot makes (open)', () => {
    const flight = computeFlight(PLAYER, RIM, aimUp, 0.7);
    const out = classifyShot(flight, RIM, {
      biggerRimActive: false,
      defender: null,
      rng: fixedRng(0.5),
    });
    expect(out.result).toBe('make');
    expect(out.contested).toBe(false);
  });

  test('shot pulled hard off-angle lands far from rim and misses', () => {
    // Aim noticeably off-axis so the ball lands away from the rim.
    const aimOff = { x: 0.35, y: -0.94 };
    const flight = computeFlight(PLAYER, RIM, aimOff, 0.7);
    const out = classifyShot(flight, RIM, {
      biggerRimActive: false,
      defender: null,
      rng: fixedRng(0.5),
    });
    expect(out.result).toBe('miss');
    // Sanity: landing was significantly off-rim
    expect(Math.abs(flight.end.x - RIM.x)).toBeGreaterThan(RIM_HITBOX_SIZE * 2);
  });

  test('contested shot with defender in close range registers as contested', () => {
    const flight = computeFlight(PLAYER, RIM, aimUp, 0.7);
    const out = classifyShot(flight, RIM, {
      biggerRimActive: false,
      defender: { x: PLAYER.x + 30, y: PLAYER.y },
      rng: fixedRng(0.99), // beats penalty roll
    });
    expect(out.contested).toBe(true);
  });

  test('contested + bad rng roll = forced miss', () => {
    const flight = computeFlight(PLAYER, RIM, aimUp, 0.7);
    const out = classifyShot(flight, RIM, {
      biggerRimActive: false,
      defender: { x: PLAYER.x + 30, y: PLAYER.y },
      rng: fixedRng(0.01), // below CONTESTED_MAKE_PROB_PENALTY (0.25) → miss
    });
    expect(out.result).toBe('miss');
    expect(out.contested).toBe(true);
  });

  test('Bigger Rim doubles hitbox so a previously-missed shot makes', () => {
    // Aim slightly off so the ball lands ~1.4× the hitbox away from rim.
    // Without bigger rim: miss. With bigger rim: make.
    const aimSlightOff = { x: 0.075, y: -0.997 };
    const flightOff = computeFlight(PLAYER, RIM, aimSlightOff, 0.7);
    // Sanity-check: confirm we picked a flight that lands in the donut
    // between RIM_HITBOX_SIZE and 2×RIM_HITBOX_SIZE.
    const landingDist = Math.hypot(flightOff.end.x - RIM.x, flightOff.end.y - RIM.y);
    expect(landingDist).toBeGreaterThan(RIM_HITBOX_SIZE);
    expect(landingDist).toBeLessThan(RIM_HITBOX_SIZE * 2);

    const baseline = classifyShot(flightOff, RIM, {
      biggerRimActive: false,
      defender: null,
      rng: fixedRng(0.5),
    });
    const buffed = classifyShot(flightOff, RIM, {
      biggerRimActive: true,
      defender: null,
      rng: fixedRng(0.5),
    });
    expect(baseline.result).toBe('miss');
    expect(buffed.result).toBe('make');
  });
});

describe('isPerfectRelease', () => {
  test('exact target hold = perfect', () => {
    expect(isPerfectRelease(RELEASE_HOLD_TARGET_MS)).toBe(true);
  });
  test('within ±PERFECT_RELEASE_WINDOW_MS = perfect', () => {
    expect(isPerfectRelease(RELEASE_HOLD_TARGET_MS - PERFECT_RELEASE_WINDOW_MS + 1)).toBe(true);
    expect(isPerfectRelease(RELEASE_HOLD_TARGET_MS + PERFECT_RELEASE_WINDOW_MS - 1)).toBe(true);
  });
  test('outside the window = not perfect', () => {
    expect(isPerfectRelease(0)).toBe(false);
    expect(isPerfectRelease(RELEASE_HOLD_TARGET_MS * 4)).toBe(false);
  });
});

describe('pointsFor', () => {
  test('miss = 0', () => expect(pointsFor('miss', false, false)).toBe(0));
  test('miss with perfect release still 0', () => expect(pointsFor('miss', true, true)).toBe(0));
  test('open make = 3', () => expect(pointsFor('make', false, false)).toBe(3));
  test('open make + perfect = 4', () => expect(pointsFor('make', false, true)).toBe(4));
  test('contested make = 5', () => expect(pointsFor('make', true, false)).toBe(5));
  test('contested make + perfect = 6', () => expect(pointsFor('make', true, true)).toBe(6));
});

describe('resolveShot integration', () => {
  test('ghost shot guarantees a make even with defender on top', () => {
    const r = resolveShot(
      {
        player: PLAYER,
        rim: RIM,
        defender: { x: PLAYER.x, y: PLAYER.y },
        biggerRimActive: false,
        ghostShotActive: true,
        pull: { x: 0, y: 100 },
        heldMs: 200,
      },
      fixedRng(0)
    );
    expect(r.result).toBe('make');
    expect(r.points).toBeGreaterThanOrEqual(3);
  });

  test('a textbook straight-down pull at perfect timing scores ≥3 (open look)', () => {
    const r = resolveShot(
      {
        player: PLAYER,
        rim: RIM,
        defender: null,
        biggerRimActive: false,
        ghostShotActive: false,
        pull: { x: 0, y: 100 },
        heldMs: RELEASE_HOLD_TARGET_MS,
      },
      fixedRng(0.5)
    );
    expect(r.result).toBe('make');
    expect(r.perfectRelease).toBe(true);
    expect(r.points).toBe(4); // open make + perfect bonus
  });

  test('huge horizontal pull launches sideways and likely misses', () => {
    const r = resolveShot(
      {
        player: PLAYER,
        rim: RIM,
        defender: null,
        biggerRimActive: false,
        ghostShotActive: false,
        pull: { x: 200, y: 4 },
        heldMs: 200,
      },
      fixedRng(0.5)
    );
    expect(r.flight.end.x).not.toBeCloseTo(RIM.x, 1);
  });
});
