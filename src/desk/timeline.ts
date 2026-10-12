import { grid, motion, sequence, type SpringConfig } from '@/design/tokens';
import type { BeatCue } from '@/motion/feedback';

// The desk scene's motion as pure functions of time, ported from the starter kit's engine (dusk-scene.js) so the
// shutdown matches the style lab and video renderer beat for beat. Every function is a worklet: the scene records
// a Skia picture per frame on the UI thread.
//
// `t` is sequence time in ms since Shut down was pressed, or IDLE before it; `now` is a free-running clock in ms
// for idle loops (blink, bob, stars). Positions are scene art px.

export const IDLE = -1;
export const SEQ_TOTAL = sequence.totalMs;

const { springs, durationsMs: D, amplitudesArtPx: AMP, idle } = motion;

/** Beat times by id, e.g. BEAT['lights-out'] = 1360. */
export const BEAT = Object.fromEntries(sequence.beats.map((b) => [b.id, b.t])) as Record<string, number>;
const beat = (id: string) => BEAT[id] ?? 0;

export const LIGHTS_OUT = beat('lights-out');
export const REWARD = beat('reward');
const DRAWER_OPEN = beat('drawer-open');
const DRAWER_SHUT = beat('drawer-shut');
const STAMP = beat('win-stamp');
const TALLY = beat('tally');
const HOP = beat('hop');
const FIRST_CARD = beat('card-1');
/** Act one ends here: the stats stay up and the button waits for LIGHTS OUT. */
export const HOLD = beat('hold');
export const CLEAR_OUT = beat('clear-out');
const TALLY_ROW_STAGGER = D.tallyStagger;

export function clamp(v: number, lo: number, hi: number) {
  'worklet';
  return Math.max(lo, Math.min(hi, v));
}
export function lerp(a: number, b: number, k: number) {
  'worklet';
  return a + (b - a) * k;
}
export function easeOutCubic(k: number) {
  'worklet';
  const c = clamp(k, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}
export function easeInOut(k: number) {
  'worklet';
  const c = clamp(k, 0, 1);
  return c < 0.5 ? 2 * c * c : 1 - Math.pow(-2 * c + 2, 2) / 2;
}
/** Deterministic 0..1 noise, for star and spark placement that never jumps between frames. */
export function hash(n: number) {
  'worklet';
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Closed-form damped spring from 0 to 1 (overshoots when underdamped), so any frame can be computed directly. */
export function springAt(ms: number, cfg: SpringConfig) {
  'worklet';
  if (ms <= 0) return 0;
  const s = ms / 1000;
  const w0 = Math.sqrt(cfg.stiffness / cfg.mass);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * s) * (Math.cos(wd * s) + ((zeta * w0) / wd) * Math.sin(wd * s));
  }
  return 1 - Math.exp(-w0 * s) * (1 + w0 * s);
}

// ---- Layout (art px) -----------------------------------------------------------------------------------------------

export const CARD = grid.sprites.cards;
export const FAN = [
  { x: 30, y: 162, r: -0.12 },
  { x: 67.5, y: 159, r: 0 },
  { x: 105, y: 162, r: 0.12 },
] as const;
/**
 * Filing: each card flies to its own lane above the open drawer (centre y), then falls `depth` art px through the
 * slot behind the drawer front. At `scale` the card is 18×24, so it hovers just above the slot and ends below the
 * front's top edge, fully hidden; card 3 lands before drawer-shut.
 */
const DROP = { x: 67.5, y: 94, spread: 30, depth: 30, scale: 0.5, flyMs: 220, fallMs: 170 } as const;
export const BUTTON = { x: 12, y: 214, w: 111, h: 18 } as const;
export const WINDOW = { x: 84, y: 30, w: 42, h: 40 } as const;
export const PET = { x: 10, y: 36 } as const;
export const TICKET = { x: 17, y: 192, w: 101, h: 17 } as const;
/** The boundary sticky note on the open laptop lid (y is its top with the lid fully open). */
export const NOTE = { x: 83, y: 75, w: 10, h: 10 } as const;
export const TALLY_BOX = { x: 14, y: 132, w: 107, h: 56 } as const;
export const REWARD_BOX = { x: 19.5, w: 96, h: 78, restY: 126, startY: 244 } as const;

// ---- Pieces ---------------------------------------------------------------------------------------------------------

/** 0 shut → 1 open, with spring overshoot either way. */
export function drawerOpen(t: number) {
  'worklet';
  let open = 0;
  if (t >= DRAWER_OPEN) open = springAt(t - DRAWER_OPEN, springs.settle);
  if (t >= DRAWER_SHUT) open = 1 - springAt(t - DRAWER_SHUT, springs.snap);
  return clamp(open, -0.2, 1.2);
}

export interface CardFrame {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  /** Horizontal scale; negative means the flip has passed edge-on and the back shows. */
  readonly sx: number;
  readonly scale: number;
  readonly alpha: number;
  /** Falling through the slot: drawn behind the drawer front. */
  readonly inDrawer: boolean;
}

/**
 * Card i flips (snap spring) and arcs to its lane over the drawer, then drops in behind the front; idle cards sway.
 * Under Reduce Motion it slides without flipping or arcing and fades out instead of dropping.
 */
export function cardFrame(i: number, t: number, now: number, reduced: boolean): CardFrame {
  'worklet';
  const hidden = { visible: false, x: 0, y: 0, rot: 0, sx: 1, scale: 1, alpha: 0, inDrawer: false };
  const fan = FAN[i] ?? FAN[1];
  const since = t - (FIRST_CARD + D.stagger * i);
  const p = t < 0 ? 0 : springAt(since, springs.snap);
  // Safety net for skips: anything filed is gone once the drawer has shut.
  if (t >= DRAWER_SHUT && p > 0.6) return hidden;
  const fall = t < 0 || reduced ? 0 : clamp((since - DROP.flyMs) / DROP.fallMs, 0, 1);
  if (fall >= 1 || (reduced && t >= 0 && since >= DROP.flyMs)) return hidden;
  const q = clamp(p, 0, 1.2);
  const k = clamp(q, 0, 1);
  let y = lerp(fan.y, DROP.y, Math.min(q, 1));
  if (!reduced) y -= Math.sin(Math.PI * k) * 22;
  // Gravity: eases in, so it hangs over the slot for a beat and then drops.
  y += fall * fall * DROP.depth;
  let rot = lerp(fan.r, (i - 1) * 0.08, k);
  if (t < 0 && !reduced) rot += Math.sin(now * 0.0012 + i) * 0.012;
  return {
    visible: true,
    x: lerp(fan.x, DROP.x + (i - 1) * DROP.spread, Math.min(q, 1)),
    y,
    rot,
    sx: reduced ? 1 : Math.cos(Math.PI * k),
    scale: lerp(1, DROP.scale, k),
    alpha: reduced ? 1 - clamp((q - 0.5) * 2, 0, 1) : 1,
    inDrawer: fall > 0,
  };
}

/** When card i lands in the drawer, in sequence ms (for the dip and its tick). */
export function cardLanded(i: number) {
  'worklet';
  return FIRST_CARD + D.stagger * i + DROP.flyMs + DROP.fallMs;
}

/** The drawer front dips half an art px as each card lands, as if it caught it. */
export function drawerDip(t: number, reduced: boolean) {
  'worklet';
  if (reduced || t < 0) return 0;
  let dip = 0;
  for (let i = 0; i < 3; i++) {
    const a = t - cardLanded(i);
    if (a >= 0 && a < 120) dip = Math.max(dip, 0.5 * Math.sin((Math.PI * a) / 120));
  }
  return dip;
}

export type PetPose = 'sit' | 'blink' | 'sleep';

export interface PetFrame {
  readonly pose: PetPose;
  readonly x: number;
  readonly y: number;
  /** Squash and stretch around the feet. */
  readonly sx: number;
  readonly sy: number;
}

// Blinks land at irregular gaps inside idle.blinkEveryMs, the same for every frame of a given gap.
const BLINK_SLOT = idle.blinkEveryMs[1] ?? 5600;
const BLINK_MIN = idle.blinkEveryMs[0] ?? 3200;
function blinking(now: number) {
  'worklet';
  const slot = Math.floor(now / BLINK_SLOT);
  const at = slot * BLINK_SLOT + hash(slot) * (BLINK_SLOT - BLINK_MIN);
  return now >= at && now < at + idle.blinkMs;
}

/** Idle bob and blink; at the hop beat: squash, jump, curl up asleep at the apex, land. */
export function petFrame(t: number, now: number, reduced: boolean, asleep: boolean): PetFrame {
  'worklet';
  let pose: PetPose = blinking(now) ? 'blink' : 'sit';
  let y: number = PET.y;
  let sx = 1;
  let sy = 1;
  if (t < 0) {
    if (asleep) return { pose: 'sleep', x: PET.x, y, sx, sy };
    // A smooth 1 art px rise, not the engine's rounded step (stepped bobs read as broken on device).
    if (!reduced) y -= ((1 - Math.cos((now / idle.bobPeriodMs) * Math.PI * 2)) / 2) * AMP.idleBob;
  }
  if (t >= HOP) {
    const a = t - HOP;
    if (reduced) pose = t >= HOP + 260 ? 'sleep' : 'sit';
    else {
      if (a < 80) {
        sy = 1 - 0.1 * (a / 80);
        sx = 1 + 0.08 * (a / 80);
      } else if (a < 460) {
        const s = Math.sin((Math.PI * (a - 80)) / 380);
        y -= s * AMP.hop;
        sy = 1 + 0.06 * s;
        sx = 1 - 0.04 * s;
      } else if (a < 560) {
        const s = Math.sin((Math.PI * (a - 460)) / 100);
        sy = 1 - 0.08 * s;
        sx = 1 + 0.06 * s;
      }
      pose = a >= 270 ? 'sleep' : 'sit';
    }
  }
  return { pose, x: PET.x, y, sx, sy };
}

/** 1 open → 0 shut; the lid folds toward the hinge over lidClose ms at lights out. */
export function lidOpen(t: number, asleep: boolean) {
  'worklet';
  if (t < 0) return asleep ? 0 : 1;
  if (t < LIGHTS_OUT) return 1;
  return 1 - easeInOut((t - LIGHTS_OUT) / D.lidClose);
}

/** 0 dusk → 1 night in the window (stars and moon fade in). */
export function nightness(t: number, asleep: boolean) {
  'worklet';
  if (t < 0) return asleep ? 1 : 0;
  return t >= LIGHTS_OUT ? easeInOut((t - LIGHTS_OUT) / 500) : 0;
}

export interface TicketFrame {
  readonly visible: boolean;
  readonly y: number;
  readonly alpha: number;
  readonly stamped: boolean;
  /** LOGGED stamp: slams in from 2.2× on a snap spring. */
  readonly stampScale: number;
  readonly stampAlpha: number;
  /** Seconds since the stamp, for the spark burst; null once the sparks are gone. */
  readonly sparkAge: number | null;
}

export function ticketFrame(t: number, reduced: boolean): TicketFrame {
  'worklet';
  const out = t >= CLEAR_OUT ? easeInOut((t - CLEAR_OUT) / 260) : 0;
  const stamped = t >= STAMP;
  const p = stamped ? springAt(t - STAMP, springs.snap) : 0;
  const age = (t - STAMP) / 1000;
  return {
    visible: out < 1,
    y: TICKET.y + out * 60,
    alpha: 1 - out,
    stamped,
    stampScale: reduced ? 1 : lerp(2.2, 1, clamp(p, 0, 1.3)),
    stampAlpha: (1 - out) * clamp(p * 2, 0, 1),
    sparkAge: stamped && !reduced && age < 0.6 ? age : null,
  };
}

export interface TallyFrame {
  readonly visible: boolean;
  readonly y: number;
  readonly alpha: number;
}

export function tallyFrame(t: number): TallyFrame {
  'worklet';
  if (t < TALLY || t > CLEAR_OUT + 250) return { visible: false, y: 0, alpha: 0 };
  const fin = t > CLEAR_OUT ? 1 - easeInOut((t - CLEAR_OUT) / 250) : 1;
  const inn = easeOutCubic((t - TALLY) / 180);
  return { visible: true, y: TALLY_BOX.y + (1 - inn) * 6, alpha: inn * fin };
}

/** Row i's count-up from `from` to `to`, and its pop scale just after it lands. */
export function tallyRow(i: number, t: number, from: number, to: number) {
  'worklet';
  const start = TALLY + i * TALLY_ROW_STAGGER;
  const value = Math.round(lerp(from, to, easeOutCubic((t - start) / D.countUp)));
  const since = t - start - D.countUp;
  const pop = since > 0 && since < 160 ? 1 + 0.25 * Math.sin((Math.PI * since) / 160) : 1;
  return { value, pop };
}

export interface Cue {
  readonly t: number;
  readonly cue: BeatCue;
}

/**
 * The shutdown's sounds and haptics in time order, for what tonight actually filed: a flick and a drop per card,
 * the drawer, the LOGGED stamp only with a win, and for each tally row that changes two counting ticks and a pop
 * as its number lands. A row that stays put (no win) is silent.
 */
export function shutdownCues(filled: readonly boolean[], win: boolean, evenings: number): Cue[] {
  // Runs on JS; marked like the rest of the timeline so the worklet guard (and any future UI-thread use) holds.
  'worklet';
  const cues: Cue[] = [];
  filled.forEach((on, i) => {
    if (on) cues.push({ t: FIRST_CARD + D.stagger * i, cue: 'cardFlip' }, { t: cardLanded(i), cue: 'cardDrop' });
  });
  if (filled.some(Boolean)) cues.push({ t: DRAWER_SHUT, cue: 'drawerShut' });
  if (win) cues.push({ t: STAMP, cue: 'stamp' });
  cues.push({ t: TALLY, cue: 'tallyIn' });
  const rows = [filled.filter(Boolean).length, win ? 1 : 0, Math.min(1, evenings)];
  rows.forEach((change, row) => {
    if (change <= 0) return;
    const start = TALLY + row * TALLY_ROW_STAGGER;
    cues.push(
      { t: start + D.countUp / 3, cue: 'count' },
      { t: start + (D.countUp * 2) / 3, cue: 'count' },
      { t: start + D.countUp, cue: 'countPop' },
    );
  });
  cues.push({ t: LIGHTS_OUT, cue: 'lightsOut' }, { t: REWARD, cue: 'reward' });
  return cues.sort((a, b) => a.t - b.t);
}
export interface RewardFrame {
  readonly visible: boolean;
  readonly y: number;
  readonly alpha: number;
}

/** Tonight's panel floats up from below the screen on the float spring. */
export function rewardFrame(t: number, reduced: boolean): RewardFrame {
  'worklet';
  if (t < REWARD) return { visible: false, y: REWARD_BOX.startY, alpha: 0 };
  const fade = clamp((t - REWARD) / 250, 0, 1);
  const p = reduced ? fade : springAt(t - REWARD, springs.float);
  return { visible: true, y: lerp(REWARD_BOX.startY, REWARD_BOX.restY, p), alpha: reduced ? fade : 1 };
}

/**
 * Button squash: a quick press in, then a snap release. `held` is the finger-down amount (0..1), which drives it
 * whenever the button waits for a tap: idle, and on LIGHTS OUT at the hold.
 */
export function buttonPress(t: number, held: number) {
  'worklet';
  if (t < 0 || t >= HOLD) return held;
  const press = t < 70 ? t / 70 : 1 - springAt(t - 70, springs.snap);
  return clamp(press, -0.3, 1);
}

/** Screen shake in art px and the single CRT brightness pulse at lights out (WCAG 2.3.1: one flash). */
export function lightsOutFx(t: number, reduced: boolean, pulseMax: number) {
  'worklet';
  let shakeX = 0;
  let shakeY = 0;
  let bright = 1;
  if (!reduced && t >= LIGHTS_OUT && t < LIGHTS_OUT + D.shake) {
    const a = (t - LIGHTS_OUT) / D.shake;
    const amp = AMP.shake * (1 - a);
    shakeX = Math.sin(a * 44) * amp;
    shakeY = Math.cos(a * 37) * amp * 0.6;
  }
  if (!reduced && t >= LIGHTS_OUT && t < LIGHTS_OUT + D.flicker) {
    bright = 1 + pulseMax * Math.sin((Math.PI * (t - LIGHTS_OUT)) / D.flicker);
  }
  return { shakeX, shakeY, bright };
}

/** Swirl speed multiplier: full until the end, then winds down to speedAfter. */
export function swirlSpeed(t: number) {
  'worklet';
  if (t < SEQ_TOTAL) return 1;
  return lerp(1, motion.swirl.speedAfter, easeInOut((t - SEQ_TOTAL) / D.swirlWindDown));
}

/** Swirl dim after the sequence: 0 → 0.35. */
export function swirlDim(t: number) {
  'worklet';
  return t > SEQ_TOTAL ? easeInOut((t - SEQ_TOTAL) / D.swirlWindDown) * 0.35 : 0;
}

/** Skipping jumps to the final frame: past the end and the wind-down. */
export const SKIP_TO = SEQ_TOTAL + D.swirlWindDown;
