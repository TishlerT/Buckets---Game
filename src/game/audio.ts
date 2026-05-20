/**
 * audio.ts — chiptune SFX dispatch with mute support.
 *
 * Each SFX uses a small WAV bundled at build time (see scripts/generate-sfx.mjs).
 * We pre-create AudioPlayer instances on first import so that dispatch is
 * effectively synchronous — gameplay events shouldn't block on file I/O.
 *
 * Mute is read synchronously from SettingsContext via getMuted(); when muted
 * we no-op every play() call.
 */

import { createAudioPlayer, AudioPlayer, setAudioModeAsync } from 'expo-audio';
import { getMuted } from '@/context/SettingsContext';

export type SfxKey =
  | 'swish'      // clean make
  | 'brick'      // miss
  | 'block'      // perfect block
  | 'powerup'    // walk into a power-up
  | 'cheer'      // big moment (contested make, perfect block)
  | 'beep'       // countdown tick
  | 'fanfare';   // level-up / win

const SOURCES: Record<SfxKey, number> = {
  swish: require('@/assets/sounds/swish.wav'),
  brick: require('@/assets/sounds/brick.wav'),
  block: require('@/assets/sounds/block.wav'),
  powerup: require('@/assets/sounds/powerup.wav'),
  cheer: require('@/assets/sounds/cheer.wav'),
  beep: require('@/assets/sounds/beep.wav'),
  fanfare: require('@/assets/sounds/fanfare.wav'),
};

const players: Partial<Record<SfxKey, AudioPlayer>> = {};
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  // Configure audio mode so SFX still play when phone is on silent + others.
  setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  }).catch(() => {});
  for (const key of Object.keys(SOURCES) as SfxKey[]) {
    try {
      players[key] = createAudioPlayer(SOURCES[key]);
    } catch {
      // platform may not support require()'d sound assets; we just no-op.
    }
  }
}

/** Play an SFX. No-op when muted. */
export function playSfx(key: SfxKey, opts?: { volume?: number }): void {
  if (getMuted()) return;
  ensureInit();
  const p = players[key];
  if (!p) return;
  try {
    p.volume = opts?.volume ?? 1;
    // expo-audio: player methods may exist as `seekTo` / `play`.
    // Some versions allow `playFromPosition(0)`. Defensive try.
    if (typeof (p as unknown as { seekTo?: (s: number) => void }).seekTo === 'function') {
      (p as unknown as { seekTo: (s: number) => void }).seekTo(0);
    }
    p.play();
  } catch {
    // ignore playback errors — never crash gameplay over an SFX.
  }
}

// ---------------------------------------------------------------------------
// Background music (separate player, looped)
// ---------------------------------------------------------------------------

const MUSIC_SRC = require('@/assets/sounds/music.wav');
let musicPlayer: AudioPlayer | null = null;
let musicPlaying = false;

export function startMusic(volume = 0.4): void {
  if (getMuted()) return;
  if (musicPlaying && musicPlayer) {
    musicPlayer.volume = volume;
    return;
  }
  ensureInit();
  try {
    if (!musicPlayer) {
      musicPlayer = createAudioPlayer(MUSIC_SRC);
      musicPlayer.loop = true;
    }
    musicPlayer.volume = volume;
    musicPlayer.play();
    musicPlaying = true;
  } catch {}
}

export function stopMusic(): void {
  if (!musicPlayer) return;
  try {
    musicPlayer.pause();
  } catch {}
  musicPlaying = false;
}

/** React to mute state changes from outside (e.g. SettingsScreen toggle). */
export function applyMute(muted: boolean): void {
  if (muted) {
    stopMusic();
  }
}
