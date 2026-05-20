// Procedurally generate chiptune-style SFX as 16-bit mono WAV files,
// committed to src/assets/sounds/. Re-run any time tunings change.
//
//   node scripts/generate-sfx.mjs
//
// Each function returns Float32 samples in [-1, 1]; we encode to 22.05kHz
// 16-bit mono WAV at the end. Keeps file sizes small (~5-25KB each).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '..', 'src', 'assets', 'sounds');
fs.mkdirSync(OUT_DIR, { recursive: true });

const SR = 22050;

// ----- Oscillators -----
function square(t, freq) {
  return Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1;
}
function triangle(t, freq) {
  const phase = (t * freq) % 1;
  return phase < 0.5 ? 4 * phase - 1 : 3 - 4 * phase;
}
function noise() {
  return Math.random() * 2 - 1;
}

// ----- ADSR envelope -----
function adsr(t, dur, { a = 0.01, d = 0.05, s = 0.7, r = 0.1 } = {}) {
  if (t < 0 || t > dur) return 0;
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < dur - r) return s;
  return s * (1 - (t - (dur - r)) / r);
}

// ----- SFX recipes -----
const sounds = {
  swish: {
    duration: 0.45,
    render: (t) => {
      // descending whoosh + filtered noise
      const f = 1200 - 1100 * (t / 0.45);
      const tone = triangle(t, f) * 0.4;
      const ns = noise() * 0.18 * Math.exp(-t * 5);
      return (tone + ns) * adsr(t, 0.45, { a: 0.005, d: 0.05, s: 0.5, r: 0.2 });
    },
  },
  brick: {
    duration: 0.32,
    render: (t) => {
      // dull thud — square at 110hz fading fast
      return square(t, 110) * 0.55 * adsr(t, 0.32, { a: 0.001, d: 0.08, s: 0.2, r: 0.18 });
    },
  },
  block: {
    duration: 0.5,
    render: (t) => {
      // chunky percussive 'whamp' + uplift sweep
      const sweep = 800 + 1200 * Math.min(1, t / 0.18);
      const main = square(t, sweep) * 0.5;
      const sub = square(t, 80) * 0.35;
      return (main + sub) * adsr(t, 0.5, { a: 0.005, d: 0.08, s: 0.6, r: 0.25 });
    },
  },
  powerup: {
    duration: 0.32,
    render: (t) => {
      // rising arpeggio: 400 → 600 → 900 hz triangles
      const seg = Math.floor(t / 0.1);
      const f = [400, 600, 900][Math.min(seg, 2)];
      return triangle(t, f) * 0.45 * adsr(t, 0.32, { a: 0.002, d: 0.04, s: 0.7, r: 0.05 });
    },
  },
  cheer: {
    duration: 0.6,
    render: (t) => {
      // pseudo-crowd: filtered noise + bell-like tone
      const ns = noise() * 0.25 * Math.exp(-t * 1.4);
      const bell = Math.sin(2 * Math.PI * 880 * t) * 0.2 * Math.exp(-t * 3.2);
      return (ns + bell) * adsr(t, 0.6, { a: 0.01, d: 0.1, s: 0.7, r: 0.2 });
    },
  },
  beep: {
    duration: 0.12,
    render: (t) => {
      return square(t, 880) * 0.5 * adsr(t, 0.12, { a: 0.002, d: 0.02, s: 0.6, r: 0.04 });
    },
  },
  fanfare: {
    duration: 1.0,
    render: (t) => {
      // 4 ascending notes over 1s: G4 B4 D5 G5
      const notes = [392, 494, 587, 784];
      const seg = Math.min(notes.length - 1, Math.floor(t / 0.22));
      const f = notes[seg];
      const tone = triangle(t, f) * 0.5 + square(t, f * 2) * 0.15;
      return tone * adsr(t, 1.0, { a: 0.005, d: 0.06, s: 0.6, r: 0.18 });
    },
  },
  // 8 bar simple chiptune loop @ 120 bpm = 4 sec
  music: {
    duration: 4.0,
    render: (t) => {
      // 16th-note bassline: C E G E (×2) over 2s, repeats
      const bassNotes = [131, 165, 196, 165];
      const beat = Math.floor((t * 4) % bassNotes.length);
      const bass = square(t, bassNotes[beat]) * 0.18;
      // Lead arpeggio: C E G C5 (32nd notes)
      const leadNotes = [262, 330, 392, 523];
      const lbeat = Math.floor((t * 8) % leadNotes.length);
      const lead = triangle(t, leadNotes[lbeat]) * 0.18;
      // Soft hi-hat on every 16th
      const hatPhase = (t * 8) % 1;
      const hat = hatPhase < 0.05 ? noise() * 0.06 : 0;
      return (bass + lead + hat) * 0.85;
    },
  },
};

// ----- WAV encoder (16-bit mono PCM) -----
function encodeWav(samples, sampleRate = SR) {
  const numSamples = samples.length;
  const bytesPerSample = 2;
  const dataLen = numSamples * bytesPerSample;
  const buf = Buffer.alloc(44 + dataLen);
  let p = 0;
  buf.write('RIFF', p); p += 4;
  buf.writeUInt32LE(36 + dataLen, p); p += 4;
  buf.write('WAVE', p); p += 4;
  buf.write('fmt ', p); p += 4;
  buf.writeUInt32LE(16, p); p += 4; // fmt chunk size
  buf.writeUInt16LE(1, p); p += 2;  // PCM
  buf.writeUInt16LE(1, p); p += 2;  // mono
  buf.writeUInt32LE(sampleRate, p); p += 4;
  buf.writeUInt32LE(sampleRate * bytesPerSample, p); p += 4;
  buf.writeUInt16LE(bytesPerSample, p); p += 2; // block align
  buf.writeUInt16LE(16, p); p += 2;  // bits per sample
  buf.write('data', p); p += 4;
  buf.writeUInt32LE(dataLen, p); p += 4;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE((s * 32767) | 0, p);
    p += 2;
  }
  return buf;
}

for (const [name, def] of Object.entries(sounds)) {
  const numSamples = Math.floor(def.duration * SR);
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    const t = i / SR;
    samples[i] = def.render(t);
  }
  const wav = encodeWav(samples);
  const file = path.join(OUT_DIR, `${name}.wav`);
  fs.writeFileSync(file, wav);
  console.log(`wrote ${file} (${wav.length} bytes)`);
}
