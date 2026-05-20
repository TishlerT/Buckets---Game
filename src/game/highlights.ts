/**
 * highlights.ts — capture and persist the best moment of a match.
 *
 * The game loop records "highlight candidates" as they happen:
 *   - contested makes (worth 5pt)
 *   - perfect blocks
 *
 * After the match, the single best candidate is pulled from the buffer
 * and rendered on the HighlightScreen. The HighlightScreen replays the
 * captured moment as a deterministic 3-second looping pixel animation
 * (shooter wind-up + flash + ball arc + confetti), then offers a
 * Save-to-Camera-Roll / Share action.
 *
 * Why no actual video capture? On the Cloud Linux VM we cannot verify
 * an end-to-end ffmpeg + view-shot encode, and the spec explicitly
 * pre-approves a screenshot-based fallback. The replay is animated
 * in-app from stored data, and the export is a single PNG screenshot.
 */

import { HIGHLIGHT_PLAYBACK_LOOP_SEC } from '@/constants/gameConfig';

export type HighlightKind = 'contested_make' | 'perfect_block';

export interface HighlightSnapshot {
  /** When the moment occurred (Date.now() ms). */
  timestamp: number;
  /** What kind of highlight this is. */
  kind: HighlightKind;
  /** Points scored on the play (0 for blocks). */
  points: number;
  /** A "score" used to compare candidates — bigger = better. */
  scoreWeight: number;
  /** Player's running total at the moment (for overlay text). */
  playerTotal: number;
  /** Opponent's running total at the moment. */
  oppTotal: number;
  /** Optional flavor: which defender level the bot was using. */
  defenderLevel: 1 | 2 | 3 | 4;
}

/**
 * Pick the best of a list. Returns null if the list is empty. We weight
 * perfect blocks more than contested makes because blocks are rarer.
 */
export function pickBestHighlight(buf: HighlightSnapshot[]): HighlightSnapshot | null {
  if (buf.length === 0) return null;
  let best = buf[0]!;
  for (const s of buf) {
    if (s.scoreWeight > best.scoreWeight) best = s;
  }
  return best;
}

/** Score weighting factors. */
export function weightFor(kind: HighlightKind, points: number): number {
  if (kind === 'perfect_block') return 100;
  if (kind === 'contested_make') return 80 + points;
  return 0;
}

/** Convenience constructor. */
export function makeContestedMake(opts: {
  points: number;
  playerTotal: number;
  oppTotal: number;
  defenderLevel: 1 | 2 | 3 | 4;
}): HighlightSnapshot {
  return {
    timestamp: Date.now(),
    kind: 'contested_make',
    points: opts.points,
    scoreWeight: weightFor('contested_make', opts.points),
    playerTotal: opts.playerTotal,
    oppTotal: opts.oppTotal,
    defenderLevel: opts.defenderLevel,
  };
}

export function makePerfectBlock(opts: {
  playerTotal: number;
  oppTotal: number;
  defenderLevel: 1 | 2 | 3 | 4;
}): HighlightSnapshot {
  return {
    timestamp: Date.now(),
    kind: 'perfect_block',
    points: 0,
    scoreWeight: weightFor('perfect_block', 0),
    playerTotal: opts.playerTotal,
    oppTotal: opts.oppTotal,
    defenderLevel: opts.defenderLevel,
  };
}

/** Loop length helper exposed for tests / UI. */
export function loopDurationMs(): number {
  return HIGHLIGHT_PLAYBACK_LOOP_SEC * 1000;
}
