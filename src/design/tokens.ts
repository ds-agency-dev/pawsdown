import tokensJson from './tokens.json';

// tokens.json is the shared source of truth with the style lab and video renderer, so it stays JSON;
// this module is the only place the app reads it.

export type PaletteName = keyof typeof tokensJson.palette;

export const palette = Object.fromEntries(
  Object.entries(tokensJson.palette).map(([name, entry]) => [name, entry.hex]),
) as Record<PaletteName, string>;

export const color = {
  surface: palette.dusk,
  surfaceRaised: palette.twilight,
  surfaceDeep: palette.night,
  ink: palette.paper,
  accent: palette.lamp,
  success: palette.mint,
} as const;

export type Rgb01 = readonly [number, number, number];

export function hexToRgb01(hex: string): Rgb01 {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match?.[1] || !match[2] || !match[3]) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return [parseInt(match[1], 16) / 255, parseInt(match[2], 16) / 255, parseInt(match[3], 16) / 255];
}

export const grid = {
  scene: { w: tokensJson.grid.scene.w, h: tokensJson.grid.scene.h },
  sprites: tokensJson.grid.sprites,
} as const;

export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass: number;
}

const { springs } = tokensJson.motion;

export const motion = {
  springs: {
    snap: { stiffness: springs.snap.stiffness, damping: springs.snap.damping, mass: springs.snap.mass },
    settle: { stiffness: springs.settle.stiffness, damping: springs.settle.damping, mass: springs.settle.mass },
    float: { stiffness: springs.float.stiffness, damping: springs.float.damping, mass: springs.float.mass },
  } satisfies Record<string, SpringConfig>,
  durationsMs: tokensJson.motion.durationsMs,
  amplitudesArtPx: tokensJson.motion.amplitudesArtPx,
  idle: tokensJson.motion.idle,
  swirl: tokensJson.motion.swirl,
} as const;

// Design system README: menu screens dim the swirl "0.35 to 0.5"; pick the middle.
export const menuSwirlDim = 0.42;

export const sequence = tokensJson.sequence;

export const crt = {
  curvature: tokensJson.crt.curvature,
  scanline: tokensJson.crt.scanline,
  chromaArtPx: tokensJson.crt.chromaArtPx,
  vignette: tokensJson.crt.vignette,
  noise: tokensJson.crt.noise,
  pulseMax: tokensJson.crt.pulseMax,
} as const;

export const fonts = {
  ui: 'AtkinsonHyperlegible-Regular',
  uiBold: 'AtkinsonHyperlegible-Bold',
  display: 'PixelifySans-Regular',
  displayBold: 'PixelifySans-Bold',
} as const;

// Menu-preset UI (RN views over the swirl) uses the design system's CSS px as points, where one art px
// is 3 px (tokens grid.unitPt.phone). Unlike the scene, it is not tied to the 135×240 grid.
const menuArtPt = tokensJson.grid.unitPt.phone;

export const menu = {
  artPt: menuArtPt,
  /** Font px per art px for pixel labels and counters (design system PixelText `px`). */
  textPx: { label: 2, counter: 3 },
  /** Panels glide 1 art px over 3.2 s (smooth, not the CSS step; see motion/float); the primary button glows for the last 12% of 2.4 s. */
  float: { halfPeriodMs: 1600, liftPt: menuArtPt * tokensJson.motion.amplitudesArtPx.idleBob },
  pulse: { restMs: 2112, glowMs: 288 },
  /**
   * Choice cards sway between two tilts (deg) at rest, one preset per `index % 3` so a row never sways in step
   * (design CSS dcSway0-2, ease-in-out). Picking lifts the card 3 art px and kicks it from a tilt and pop.
   */
  sway: [
    { fromDeg: -1.5, toDeg: -0.5, periodMs: 4800 },
    { fromDeg: 1, toDeg: 2, periodMs: 5400 },
    { fromDeg: -0.5, toDeg: 0.5, periodMs: 4200 },
  ],
  /** The active tab's icon hops this many points as it is picked. */
  tabs: { hopPt: 2 * menuArtPt },
  /** A pip that lights up pops in from this scale. */
  pips: { popScale: 1.6 },
  /** The pet types one character per `charMs` and blips every `blipEvery` characters (every 2nd still caused a
   * faint hitch on device); the cursor blinks on/off each `blinkMs`. */
  speech: { charMs: 25, blipEvery: 3, blinkMs: 500 },
  /** The toggle knob stretches this much mid-travel and squashes as the spring lands past its stop. */
  toggle: { stretch: 0.3 },
  /** Each OptionCycler step pops the value in from this scale on the snap spring. */
  cycler: { popScale: 1.15 },
  pick: { liftPt: 3 * menuArtPt, kickDeg: -3, popScale: 1.08, stampDeg: 8, stampPopScale: 1.6 },
  minTouchPt: 44,
  /**
   * Clock-out editors (desk object lifted to edit): the backdrop dims the desk to this opacity (user: 0.72 left too
   * much going on), the return is an eased glide of `returnMs`, and the flight kicks this much tilt at its middle.
   * The desk object and the lifted copy hand over edge-on (user found a crossfade cheap): turning edge-on takes
   * `edgeOnMs`, turning face-up `faceUpMs` (user: 110 ms halves felt slow). Under Reduce Motion there's no turn; the
   * copy crossfades over the last `crossfade` of the travel.
   */
  lift: { backdrop: 0.9, returnMs: 420, edgeOnMs: 70, faceUpMs: 120, crossfade: 0.35, kickDeg: -4 },
  /**
   * Welcome screen CRT power-on, in ms from mount. Eased timings, no springs: hardware switching on shouldn't
   * wobble. A dot stretches into the beam, the picture opens out of it overexposed while the swirl warms up,
   * the pets hop in, the title stamps letter by letter, and the button drops in last. A tap skips to the end.
   */
  powerOn: {
    dotAtMs: 120,
    beamMs: 220,
    /** Matches the thunk in powerOn.wav (260 ms in, which starts at dotAtMs). */
    thunkMs: 260,
    openAtMs: 380,
    openMs: 240,
    flashOpacity: 0.55,
    flashMs: 420,
    warmFromDim: 0.9,
    warmMs: 1000,
    petAtMs: [560, 660],
    /** The hop lands at 1, then squashes until `hopEnd`. */
    hopMs: 300,
    hopEnd: 1.3,
    hopFromPt: 6 * menuArtPt,
    hopPeakPt: 4 * menuArtPt,
    squash: 0.15,
    titleAtMs: 780,
    letterMs: 60,
    letterPopScale: 1.5,
    titlePopScale: 1.06,
    titlePopMs: 160,
    taglineAtMs: 1300,
    fadeMs: 300,
    footerAtMs: 1420,
    footerMs: 180,
    footerDropPt: 5 * menuArtPt,
    /** Each pet blinks on its own period so they never blink together. */
    blinkEveryMs: [3400, 4700],
    blinkMs: 140,
  },
} as const;

/** UI sounds are a garnish under the haptics: quiet, and silent when the ringer switch is off. */
export const sound = { volume: 0.5 } as const;
