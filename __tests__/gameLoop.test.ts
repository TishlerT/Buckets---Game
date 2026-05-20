import {
  decideWinner,
  flipCoinForMode,
  gameReducer,
  initGameState,
  maxTurns,
} from '@/game/gameLoop';
import { GAME_DURATION_SEC, TURN_DURATION_SEC } from '@/constants/gameConfig';

describe('initGameState', () => {
  test('starts in COIN_FLIP phase with full timer and zero scores', () => {
    const s = initGameState({ mode: 'vsBot', defenderLevel: 2 });
    expect(s.phase).toBe('COIN_FLIP');
    expect(s.mode).toBe('vsBot');
    expect(s.defenderLevel).toBe(2);
    expect(s.gameTimeRemainingSec).toBe(GAME_DURATION_SEC);
    expect(s.scores.P1.points).toBe(0);
    expect(s.scores.BOT.points).toBe(0);
    expect(s.coinFlipWinner).toBeNull();
    expect(s.winner).toBeNull();
  });
});

describe('flipCoinForMode', () => {
  test('vsBot returns P1 or BOT', () => {
    for (let i = 0; i < 20; i++) {
      const p = flipCoinForMode('vsBot', Math.random);
      expect(['P1', 'BOT']).toContain(p);
    }
  });
  test('local2P returns P1 or P2', () => {
    for (let i = 0; i < 20; i++) {
      const p = flipCoinForMode('local2P', Math.random);
      expect(['P1', 'P2']).toContain(p);
    }
  });
  test('rng=0 → P1; rng=0.99 → BOT (vsBot)', () => {
    expect(flipCoinForMode('vsBot', () => 0)).toBe('P1');
    expect(flipCoinForMode('vsBot', () => 0.99)).toBe('BOT');
  });
});

describe('gameReducer — COIN_FLIP_RESOLVED', () => {
  test('vs-bot, P1 wins: P1 starts on OFFENSE', () => {
    const s0 = initGameState({ mode: 'vsBot' });
    const s1 = gameReducer(s0, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    expect(s1.phase).toBe('ANNOUNCE');
    expect(s1.activePlayer).toBe('P1');
    expect(s1.currentRole).toBe('OFFENSE');
    expect(s1.coinFlipWinner).toBe('P1');
  });

  test('vs-bot, BOT wins: P1 starts on DEFENSE (still active player, never BOT)', () => {
    const s0 = initGameState({ mode: 'vsBot' });
    const s1 = gameReducer(s0, { type: 'COIN_FLIP_RESOLVED', winner: 'BOT' });
    expect(s1.phase).toBe('ANNOUNCE');
    expect(s1.activePlayer).toBe('P1');
    expect(s1.currentRole).toBe('DEFENSE');
    expect(s1.coinFlipWinner).toBe('BOT');
  });

  test('local 2P, P2 wins: P2 starts on OFFENSE', () => {
    const s0 = initGameState({ mode: 'local2P' });
    const s1 = gameReducer(s0, { type: 'COIN_FLIP_RESOLVED', winner: 'P2' });
    expect(s1.activePlayer).toBe('P2');
    expect(s1.currentRole).toBe('OFFENSE');
    expect(s1.coinFlipWinner).toBe('P2');
  });
});

describe('gameReducer — ANNOUNCE_DONE', () => {
  test('OFFENSE role → phase=OFFENSE', () => {
    const s0 = initGameState({ mode: 'vsBot' });
    const s1 = gameReducer(s0, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    const s2 = gameReducer(s1, { type: 'ANNOUNCE_DONE' });
    expect(s2.phase).toBe('OFFENSE');
  });
});

describe('gameReducer — TURN_ENDED on offense', () => {
  test('credits points to active player and transitions to ANNOUNCE for defense', () => {
    let s = initGameState({ mode: 'vsBot' });
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' });
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 12, perfectBlocks: 0 });
    expect(s.scores.P1.points).toBe(12);
    expect(s.currentRole).toBe('DEFENSE');
    expect(s.activePlayer).toBe('P1');
    expect(s.phase).toBe('ANNOUNCE');
  });
});

describe('gameReducer — TURN_ENDED on defense', () => {
  test('vs-bot: credits blocks to P1, points to BOT, P1 stays active alternating roles', () => {
    let s = initGameState({ mode: 'vsBot' });
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' }); // OFFENSE
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 6, perfectBlocks: 0 });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' }); // DEFENSE
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 5, perfectBlocks: 1 }); // bot scored 5, P1 had 1 block
    expect(s.scores.P1.points).toBe(6);
    expect(s.scores.P1.perfectBlocks).toBe(1);
    expect(s.scores.BOT.points).toBe(5);
    // vs-bot: P1 alternates roles indefinitely; back to OFFENSE.
    expect(s.activePlayer).toBe('P1');
    expect(s.currentRole).toBe('OFFENSE');
    expect(s.phase).toBe('ANNOUNCE');
  });

  test('local2P: defense → swap → PASS_PHONE → ANNOUNCE', () => {
    let s = initGameState({ mode: 'local2P' });
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' }); // OFFENSE
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 5, perfectBlocks: 0 });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' }); // DEFENSE
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 0, perfectBlocks: 2 });
    expect(s.activePlayer).toBe('P2');
    expect(s.phase).toBe('PASS_PHONE');
    s = gameReducer(s, { type: 'PASS_PHONE_DONE' });
    expect(s.phase).toBe('ANNOUNCE');
  });
});

describe('gameReducer — game timer / END', () => {
  test('turn ends with timer at 0 → phase=END and winner is set', () => {
    let s: ReturnType<typeof initGameState> = initGameState({ mode: 'vsBot' });
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' });
    // Force timer to 0
    s = { ...s, gameTimeRemainingSec: 0 };
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 9, perfectBlocks: 0 });
    expect(s.phase).toBe('END');
    expect(s.winner).toBe('P1');
  });

  test('TIE if scores equal at game end', () => {
    let s: ReturnType<typeof initGameState> = initGameState({ mode: 'vsBot' });
    s = { ...s, gameTimeRemainingSec: 0 };
    s = { ...s, scores: { ...s.scores, P1: { points: 7, perfectBlocks: 0 }, BOT: { points: 7, perfectBlocks: 0 } } };
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' });
    s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: 0, perfectBlocks: 0 });
    expect(s.phase).toBe('END');
    expect(s.winner).toBe('TIE');
  });

  test('GAME_TIMER_TICK decrements and bottoms out at 0', () => {
    let s: ReturnType<typeof initGameState> = initGameState({ mode: 'vsBot' });
    s = { ...s, gameTimeRemainingSec: 3 };
    s = gameReducer(s, { type: 'GAME_TIMER_TICK' });
    expect(s.gameTimeRemainingSec).toBe(2);
    s = { ...s, gameTimeRemainingSec: 0 };
    s = gameReducer(s, { type: 'GAME_TIMER_TICK' });
    expect(s.gameTimeRemainingSec).toBe(0);
  });
});

describe('decideWinner', () => {
  test('vsBot: highest points wins', () => {
    const s: ReturnType<typeof initGameState> = {
      ...initGameState({ mode: 'vsBot' }),
      scores: {
        P1: { points: 12, perfectBlocks: 0 },
        BOT: { points: 5, perfectBlocks: 0 },
        P2: { points: 0, perfectBlocks: 0 },
      },
    };
    expect(decideWinner(s)).toBe('P1');
  });
  test('local2P: highest points wins', () => {
    const s: ReturnType<typeof initGameState> = {
      ...initGameState({ mode: 'local2P' }),
      scores: {
        P1: { points: 4, perfectBlocks: 1 },
        P2: { points: 11, perfectBlocks: 0 },
        BOT: { points: 0, perfectBlocks: 0 },
      },
    };
    expect(decideWinner(s)).toBe('P2');
  });
});

describe('maxTurns', () => {
  test('returns total game duration divided by per-turn duration', () => {
    expect(maxTurns()).toBe(Math.floor(GAME_DURATION_SEC / TURN_DURATION_SEC));
  });
});

describe('full game integration via reducer', () => {
  test('plays a clean vs-bot game end-to-end', () => {
    let s = initGameState({ mode: 'vsBot' });
    s = gameReducer(s, { type: 'COIN_FLIP_RESOLVED', winner: 'P1' });
    s = gameReducer(s, { type: 'ANNOUNCE_DONE' });

    // 6 turns total: 3 player offense, 3 player defense. Drop timer
    // proportionally each turn.
    for (let turn = 0; turn < 6; turn++) {
      s = { ...s, gameTimeRemainingSec: Math.max(0, GAME_DURATION_SEC - (turn + 1) * TURN_DURATION_SEC) };
      const points = s.currentRole === 'OFFENSE' && s.activePlayer === 'P1' ? 6 : 4;
      const blocks = s.currentRole === 'DEFENSE' && s.activePlayer === 'P1' ? 1 : 0;
      s = gameReducer(s, { type: 'TURN_ENDED', pointsScored: points, perfectBlocks: blocks });
      if (s.phase === 'END') break;
      if (s.phase === 'PASS_PHONE') s = gameReducer(s, { type: 'PASS_PHONE_DONE' });
      s = gameReducer(s, { type: 'ANNOUNCE_DONE' });
    }
    expect(['END']).toContain(s.phase);
    expect(s.winner).toBeTruthy();
  });
});
