// Generates the UI sound kit as small mono WAVs in assets/sounds/. Synthesised rather than sourced so the set
// stays cohesive (one soft retro voice), license-free and reproducible. Rerun after tweaking: node scripts/gen-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

const sine = (phase) => Math.sin(2 * Math.PI * phase);
const triangle = (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5);
// A 25% pulse is the classic chip voice; the low-pass below rounds it off so it reads warm, not buzzy.
const pulse = (phase) => (phase % 1 < 0.25 ? 1 : -1);

// Deterministic noise so regenerating gives byte-identical files.
let seed = 0x2f6b;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** One voice: a waveform gliding from `from` to `to` Hz with a quick attack and exponential decay. */
function tone({ wave, from, to = from, ms, amp, attackMs = 2, decay = 5 }) {
  const n = Math.round((RATE * ms) / 1000);
  const attack = (RATE * attackMs) / 1000;
  const out = new Float32Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    phase += (from * Math.pow(to / from, t)) / RATE;
    const env = Math.min(1, i / attack) * Math.exp(-decay * t) * (1 - t);
    out[i] = wave(phase) * env * amp;
  }
  return out;
}

function burst({ ms, amp }) {
  const n = Math.round((RATE * ms) / 1000);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = noise() * amp * Math.pow(1 - i / n, 3);
  return out;
}

function mix(...parts) {
  const out = new Float32Array(Math.max(...parts.map(({ at = 0, s }) => Math.round((RATE * at) / 1000) + s.length)));
  for (const { at = 0, s } of parts) {
    const off = Math.round((RATE * at) / 1000);
    for (let i = 0; i < s.length; i++) out[off + i] += s[i];
  }
  return out;
}

function lowpass(s, hz) {
  const a = 1 - Math.exp((-2 * Math.PI * hz) / RATE);
  let y = 0;
  return s.map((x) => (y += a * (x - y)));
}

function wav(samples) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((x, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x)) * 32767), 44 + i * 2));
  return buf;
}

const chirp = lowpass(
  mix(
    { s: tone({ wave: pulse, from: 659, ms: 55, amp: 0.22, decay: 3 }) },
    { at: 50, s: tone({ wave: pulse, from: 988, ms: 80, amp: 0.22, decay: 4 }) },
  ),
  3500,
);
// The PICKED stamp landing: a low thump with a papery scuff.
const thump = mix(
  { s: tone({ wave: sine, from: 150, to: 55, ms: 140, amp: 0.6, attackMs: 1, decay: 4 }) },
  { s: lowpass(burst({ ms: 35, amp: 0.25 }), 2500) },
);

// The welcome CRT: a low hum and faint whine rising for 260 ms, then the picture's thunk and a crackle of static.
const powerOn = mix(
  { s: lowpass(tone({ wave: triangle, from: 55, to: 110, ms: 300, amp: 0.3, attackMs: 40, decay: 0.5 }), 900) },
  { at: 40, s: tone({ wave: sine, from: 6000, to: 7800, ms: 260, amp: 0.025, attackMs: 60, decay: 1 }) },
  { at: 260, s: tone({ wave: sine, from: 130, to: 42, ms: 220, amp: 0.7, attackMs: 1, decay: 4 }) },
  { at: 260, s: lowpass(burst({ ms: 300, amp: 0.22 }), 3200) },
);

// ---- Clock-out beats. Defined after the UI kit so the seeded noise above stays byte-identical for older files.

// A card turning over: a dry papery flick with a faint upward tick.
const flick = mix(
  { s: lowpass(burst({ ms: 28, amp: 0.16 }), 5200) },
  { s: tone({ wave: triangle, from: 1100, to: 1500, ms: 20, amp: 0.05, decay: 6 }) },
);
// A card dropping into the drawer: a soft paper slide onto a low, woody bump.
const cardDrop = mix(
  { s: lowpass(burst({ ms: 70, amp: 0.2 }), 1800) },
  { at: 30, s: tone({ wave: sine, from: 190, to: 110, ms: 80, amp: 0.32, attackMs: 1, decay: 4 }) },
);
// The drawer shutting on them: a wooden thunk.
const drawerShut = mix(
  { s: tone({ wave: sine, from: 125, to: 58, ms: 170, amp: 0.65, attackMs: 1, decay: 4 }) },
  { s: lowpass(tone({ wave: triangle, from: 260, to: 190, ms: 60, amp: 0.2, decay: 5 }), 2000) },
  { s: lowpass(burst({ ms: 30, amp: 0.22 }), 1500) },
);
// LOGGED: the stamp's thump, then a small bright bell (C6 + G6).
const stamp = mix(
  { s: thump },
  { at: 30, s: tone({ wave: sine, from: 1047, ms: 320, amp: 0.16, attackMs: 3, decay: 3 }) },
  { at: 70, s: tone({ wave: sine, from: 1568, ms: 280, amp: 0.1, attackMs: 3, decay: 3.5 }) },
);
// The tally panel sliding up: a quick soft swell.
const tallyIn = lowpass(tone({ wave: triangle, from: 330, to: 660, ms: 130, amp: 0.16, attackMs: 25, decay: 2 }), 3000);
// One digit ticking during the count-up: quieter and rounder than the UI tick.
const count = lowpass(tone({ wave: pulse, from: 880, ms: 18, amp: 0.09, decay: 5 }), 3000);
// A row's number landing with its pop: two quick notes up (G5 → D6).
const countPop = lowpass(
  mix(
    { s: tone({ wave: pulse, from: 784, ms: 45, amp: 0.15, decay: 3 }) },
    { at: 40, s: tone({ wave: pulse, from: 1175, ms: 70, amp: 0.15, decay: 4 }) },
  ),
  3500,
);
// Lights out: a deep thump and a dying crackle, as the screen kicks.
const lightsOut = mix(
  { s: tone({ wave: sine, from: 95, to: 34, ms: 420, amp: 0.75, attackMs: 1, decay: 3 }) },
  { s: lowpass(burst({ ms: 140, amp: 0.18 }), 900) },
);
// Tonight's panel rising: a gentle C major arpeggio.
const reward = lowpass(
  mix(
    ...[523, 659, 784, 1047].map((hz, i) => ({
      at: i * 70,
      s: tone({ wave: triangle, from: hz, ms: 260, amp: 0.13, attackMs: 4, decay: 3 }),
    })),
  ),
  4000,
);

const SOUNDS = {
  // Button press: a soft downward chirp.
  tap: lowpass(tone({ wave: triangle, from: 880, to: 660, ms: 45, amp: 0.35 }), 6000),
  // Cycling options / switching tabs: a tiny high tick.
  tick: lowpass(tone({ wave: triangle, from: 1320, ms: 22, amp: 0.25, decay: 7 }), 7000),
  // Re-pressing the picked card: two rising notes (E5 → B5).
  pick: chirp,
  // Picking a card: the chirp plus the PICKED stamp's thump, in one sound so the press starts one player.
  pickStamp: mix({ s: chirp }, { s: thump }),
  toggleOn: lowpass(tone({ wave: pulse, from: 523, to: 784, ms: 60, amp: 0.2, decay: 3 }), 3500),
  toggleOff: lowpass(tone({ wave: pulse, from: 784, to: 523, ms: 60, amp: 0.2, decay: 3 }), 3500),
  // The pet "typing" a character: very short and quiet, it repeats every 25 ms.
  blip: lowpass(tone({ wave: pulse, from: 520, ms: 28, amp: 0.14, decay: 4 }), 2500),
  powerOn,
  flick,
  cardDrop,
  drawerShut,
  stamp,
  tallyIn,
  count,
  countPop,
  lightsOut,
  reward,
};

mkdirSync(OUT, { recursive: true });
for (const [name, samples] of Object.entries(SOUNDS)) {
  writeFileSync(join(OUT, `${name}.wav`), wav(samples));
  console.log(`${name}.wav  ${Math.round((samples.length / RATE) * 1000)} ms`);
}
