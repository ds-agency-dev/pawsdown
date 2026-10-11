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
