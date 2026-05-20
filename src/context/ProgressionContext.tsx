import React from 'react';
import {
  applyXp,
  defaultProgression,
  loadProgression,
  Progression,
  purchaseUnlock,
  saveProgression,
  selectItem,
  UnlockCategory,
} from '@/game/progression';
import { playSfx } from '@/game/audio';

interface ProgressionContextValue {
  progression: Progression;
  loading: boolean;
  /** Award XP from a finished match. Persists asynchronously. */
  awardXp: (xp: number) => Promise<{ levelsGained: number; pointsGained: number }>;
  /** Buy an unlock. Returns true on success. */
  buy: (category: UnlockCategory, id: string) => Promise<boolean>;
  /** Set the active selection. Returns true on success. */
  select: (category: UnlockCategory, id: string) => Promise<boolean>;
  /** Reset to defaults (dev / settings menu). */
  reset: () => Promise<void>;
}

const Ctx = React.createContext<ProgressionContextValue | null>(null);

/**
 * Loads progression on mount, exposes mutators that persist on every change.
 * Wraps every screen via App.tsx so HomeScreen/Game/ProgressionScreen all see
 * the same source of truth.
 */
export const ProgressionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progression, setProgression] = React.useState<Progression>(defaultProgression);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadProgression();
      if (!cancelled) {
        setProgression(loaded);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const awardXp: ProgressionContextValue['awardXp'] = async (xp) => {
    const r = applyXp(progression, xp);
    setProgression(r.next);
    saveProgression(r.next);
    if (r.levelsGained > 0) playSfx('fanfare');
    return { levelsGained: r.levelsGained, pointsGained: r.pointsGained };
  };

  const buy: ProgressionContextValue['buy'] = async (category, id) => {
    const next = purchaseUnlock(progression, category, id);
    if (!next) return false;
    setProgression(next);
    saveProgression(next);
    return true;
  };

  const select: ProgressionContextValue['select'] = async (category, id) => {
    const next = selectItem(progression, category, id);
    if (!next) return false;
    setProgression(next);
    saveProgression(next);
    return true;
  };

  const reset: ProgressionContextValue['reset'] = async () => {
    const fresh = defaultProgression();
    setProgression(fresh);
    saveProgression(fresh);
  };

  const value: ProgressionContextValue = {
    progression,
    loading,
    awardXp,
    buy,
    select,
    reset,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useProgression(): ProgressionContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useProgression must be inside <ProgressionProvider>');
  return ctx;
}
