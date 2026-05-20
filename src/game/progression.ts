/**
 * progression.ts — XP, levels, unlock shop, AsyncStorage persistence.
 *
 * The progression model:
 *   - Player earns XP per game (win/loss + perfect-block bonuses).
 *   - XP fills a per-level threshold; each level-up grants
 *     UNLOCK_POINTS_PER_LEVEL points.
 *   - Unlock points spend on Courts, Defenders, and player Skins; costs
 *     come from gameConfig (COURT_UNLOCK_COST etc).
 *   - All persisted to AsyncStorage under SCHEMA_KEY with a version field
 *     so future changes can migrate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CourtId,
  COURT_UNLOCK_COST,
  DefenderId,
  DEFENDER_UNLOCK_COST,
  SkinId,
  SKIN_UNLOCK_COST,
  UNLOCK_POINTS_PER_LEVEL,
  XP_LEVEL_EXP,
  XP_LOSS,
  XP_PER_LEVEL_BASE,
  XP_PERFECT_BLOCK_BONUS,
  XP_WIN,
} from '@/constants/gameConfig';

export const STORAGE_KEY = '@buckets/progression/v1';
export const SCHEMA_VERSION = 1;

export interface Progression {
  schemaVersion: number;
  /** Total cumulative XP earned. */
  totalXp: number;
  /** Currently spendable unlock points. */
  unlockPoints: number;
  /** Sets of unlocked items. */
  unlocked: {
    courts: CourtId[];
    defenders: DefenderId[];
    skins: SkinId[];
  };
  /** Currently selected items (must already be unlocked). */
  selected: {
    court: CourtId;
    defender: DefenderId;
    skin: SkinId;
  };
}

export function defaultProgression(): Progression {
  return {
    schemaVersion: SCHEMA_VERSION,
    totalXp: 0,
    unlockPoints: 0,
    unlocked: {
      courts: ['playground'],
      defenders: ['grandpa'],
      skins: ['classic'],
    },
    selected: {
      court: 'playground',
      defender: 'grandpa',
      skin: 'classic',
    },
  };
}

// ---------------------------------------------------------------------------
// XP / level math (pure)
// ---------------------------------------------------------------------------

/** XP required to reach `level` from level 1 (cumulative threshold). */
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 1; n < level; n++) {
    total += Math.round(XP_PER_LEVEL_BASE * Math.pow(n, XP_LEVEL_EXP));
  }
  return total;
}

/** Compute current level given total XP. Levels are 1-based. */
export function levelFromXp(totalXp: number): number {
  // Walk levels until threshold exceeds totalXp; return the previous level.
  let level = 1;
  while (xpThresholdForLevel(level + 1) <= totalXp) {
    level++;
    if (level > 999) break;
  }
  return level;
}

/** XP into the current level and XP needed for next level. */
export function xpProgressInLevel(totalXp: number): {
  level: number;
  xpInLevel: number;
  xpForNextLevel: number;
} {
  const level = levelFromXp(totalXp);
  const base = xpThresholdForLevel(level);
  const next = xpThresholdForLevel(level + 1);
  return {
    level,
    xpInLevel: totalXp - base,
    xpForNextLevel: next - base,
  };
}

/** Compute XP earned for a single match. */
export function xpForGameResult(args: {
  win: boolean;
  perfectBlocks: number;
}): { total: number; breakdown: { base: number; blockBonus: number } } {
  const base = args.win ? XP_WIN : XP_LOSS;
  const blockBonus = args.perfectBlocks * XP_PERFECT_BLOCK_BONUS;
  return { total: base + blockBonus, breakdown: { base, blockBonus } };
}

// ---------------------------------------------------------------------------
// Mutators (pure)
// ---------------------------------------------------------------------------

/**
 * Apply earned XP to the progression bag. Awards unlock points for every
 * level crossed. Returns the updated progression and a summary.
 */
export function applyXp(
  prog: Progression,
  earnedXp: number
): { next: Progression; levelsGained: number; pointsGained: number } {
  const before = levelFromXp(prog.totalXp);
  const after = levelFromXp(prog.totalXp + earnedXp);
  const levelsGained = Math.max(0, after - before);
  const pointsGained = levelsGained * UNLOCK_POINTS_PER_LEVEL;
  const next: Progression = {
    ...prog,
    totalXp: prog.totalXp + earnedXp,
    unlockPoints: prog.unlockPoints + pointsGained,
  };
  return { next, levelsGained, pointsGained };
}

export type UnlockCategory = 'court' | 'defender' | 'skin';

/** Spend points to unlock an item. Returns the new progression or null on failure. */
export function purchaseUnlock(
  prog: Progression,
  category: UnlockCategory,
  id: string
): Progression | null {
  const cost = lookupCost(category, id);
  if (cost === null) return null;
  if (prog.unlockPoints < cost) return null;

  const alreadyUnlocked = isUnlocked(prog, category, id);
  if (alreadyUnlocked) return null;

  const next: Progression = {
    ...prog,
    unlockPoints: prog.unlockPoints - cost,
    unlocked: { ...prog.unlocked },
  };
  if (category === 'court') {
    next.unlocked.courts = [...prog.unlocked.courts, id as CourtId];
  } else if (category === 'defender') {
    next.unlocked.defenders = [...prog.unlocked.defenders, id as DefenderId];
  } else if (category === 'skin') {
    next.unlocked.skins = [...prog.unlocked.skins, id as SkinId];
  }
  return next;
}

/** Set the player's current selection for a category. Returns null if not unlocked. */
export function selectItem(
  prog: Progression,
  category: UnlockCategory,
  id: string
): Progression | null {
  if (!isUnlocked(prog, category, id)) return null;
  const next: Progression = {
    ...prog,
    selected: { ...prog.selected },
  };
  if (category === 'court') next.selected.court = id as CourtId;
  if (category === 'defender') next.selected.defender = id as DefenderId;
  if (category === 'skin') next.selected.skin = id as SkinId;
  return next;
}

export function isUnlocked(
  prog: Progression,
  category: UnlockCategory,
  id: string
): boolean {
  if (category === 'court') return prog.unlocked.courts.includes(id as CourtId);
  if (category === 'defender') return prog.unlocked.defenders.includes(id as DefenderId);
  return prog.unlocked.skins.includes(id as SkinId);
}

export function lookupCost(category: UnlockCategory, id: string): number | null {
  if (category === 'court') {
    const k = id as CourtId;
    return COURT_UNLOCK_COST[k] ?? null;
  }
  if (category === 'defender') {
    const k = id as DefenderId;
    return DEFENDER_UNLOCK_COST[k] ?? null;
  }
  const k = id as SkinId;
  return SKIN_UNLOCK_COST[k] ?? null;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Load progression from AsyncStorage. Falls back to defaults on first run. */
export async function loadProgression(): Promise<Progression> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgression();
    const parsed: unknown = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return defaultProgression();
  }
}

/** Save progression atomically. */
export async function saveProgression(prog: Progression): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prog));
  } catch {
    // Storage failures are non-fatal; the in-memory state is still usable.
  }
}

/**
 * Migrate older schemas to the current one. For now, anything not at v1
 * is replaced with defaults; future versions add real migrations here.
 */
function migrate(parsed: unknown): Progression {
  if (!parsed || typeof parsed !== 'object') return defaultProgression();
  const obj = parsed as Partial<Progression>;
  if (obj.schemaVersion !== SCHEMA_VERSION) return defaultProgression();
  // Cheap shape validation
  if (
    typeof obj.totalXp !== 'number' ||
    typeof obj.unlockPoints !== 'number' ||
    !obj.unlocked ||
    !obj.selected
  ) {
    return defaultProgression();
  }
  return obj as Progression;
}
