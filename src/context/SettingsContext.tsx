import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setHapticsEnabled as setHapticsEnabledGlobal } from '@/game/haptics';

export interface Settings {
  muted: boolean;
  hapticsEnabled: boolean;
}

const DEFAULTS: Settings = {
  muted: false,
  hapticsEnabled: true,
};

const STORAGE_KEY = '@buckets/settings/v1';

interface SettingsContextValue {
  settings: Settings;
  loading: boolean;
  setMuted: (muted: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
}

const Ctx = React.createContext<SettingsContextValue | null>(null);

/**
 * Persists user-facing toggles (mute, haptics) to AsyncStorage. The audio
 * module reads `muted` synchronously via `getMuted()` so SFX dispatch
 * can short-circuit without re-render cycles.
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = React.useState<Settings>(DEFAULTS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled) {
          if (raw) {
            const parsed = JSON.parse(raw);
            const merged = { ...DEFAULTS, ...parsed };
            setSettings(merged);
            mutedFlag = merged.muted;
            setHapticsEnabledGlobal(merged.hapticsEnabled);
          }
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = (next: Settings) => {
    setSettings(next);
    mutedFlag = next.muted;
    setHapticsEnabledGlobal(next.hapticsEnabled);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const setMuted = (muted: boolean) => persist({ ...settings, muted });
  const setHapticsEnabled = (hapticsEnabled: boolean) =>
    persist({ ...settings, hapticsEnabled });

  return (
    <Ctx.Provider value={{ settings, loading, setMuted, setHapticsEnabled }}>
      {children}
    </Ctx.Provider>
  );
};

export function useSettings(): SettingsContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be inside <SettingsProvider>');
  return ctx;
}

// ---------------------------------------------------------------------------
// Synchronous mute flag — read by the audio module without context overhead.
// ---------------------------------------------------------------------------

let mutedFlag = false;
export function getMuted(): boolean {
  return mutedFlag;
}
