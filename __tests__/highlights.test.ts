import {
  HighlightSnapshot,
  loopDurationMs,
  makeContestedMake,
  makePerfectBlock,
  pickBestHighlight,
  weightFor,
} from '@/game/highlights';
import { HIGHLIGHT_PLAYBACK_LOOP_SEC } from '@/constants/gameConfig';

describe('weightFor', () => {
  test('perfect_block beats every contested_make', () => {
    expect(weightFor('perfect_block', 0)).toBeGreaterThan(weightFor('contested_make', 6));
  });
  test('higher-points contested_make beats lower-points', () => {
    expect(weightFor('contested_make', 6)).toBeGreaterThan(weightFor('contested_make', 5));
  });
});

describe('pickBestHighlight', () => {
  test('null when buffer empty', () => {
    expect(pickBestHighlight([])).toBeNull();
  });
  test('returns the highest-weight snapshot', () => {
    const a = makeContestedMake({ points: 5, playerTotal: 5, oppTotal: 0, defenderLevel: 1 });
    const b = makePerfectBlock({ playerTotal: 5, oppTotal: 0, defenderLevel: 1 });
    const c = makeContestedMake({ points: 6, playerTotal: 11, oppTotal: 0, defenderLevel: 1 });
    expect(pickBestHighlight([a, b, c])).toBe(b);
  });
  test('ties: first one wins', () => {
    const a = makeContestedMake({ points: 5, playerTotal: 5, oppTotal: 0, defenderLevel: 1 });
    const b = makeContestedMake({ points: 5, playerTotal: 10, oppTotal: 0, defenderLevel: 1 });
    expect(pickBestHighlight([a, b])).toBe(a);
  });
});

describe('makeContestedMake', () => {
  test('records kind, points, totals', () => {
    const s = makeContestedMake({ points: 6, playerTotal: 18, oppTotal: 9, defenderLevel: 3 });
    expect(s.kind).toBe('contested_make');
    expect(s.points).toBe(6);
    expect(s.playerTotal).toBe(18);
    expect(s.scoreWeight).toBe(weightFor('contested_make', 6));
  });
});

describe('makePerfectBlock', () => {
  test('records kind, totals; points = 0', () => {
    const s = makePerfectBlock({ playerTotal: 11, oppTotal: 5, defenderLevel: 4 });
    expect(s.kind).toBe('perfect_block');
    expect(s.points).toBe(0);
    expect(s.defenderLevel).toBe(4);
  });
});

describe('loopDurationMs', () => {
  test('matches gameConfig.HIGHLIGHT_PLAYBACK_LOOP_SEC', () => {
    expect(loopDurationMs()).toBe(HIGHLIGHT_PLAYBACK_LOOP_SEC * 1000);
  });
});
