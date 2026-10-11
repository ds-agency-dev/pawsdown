import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions } from 'react-native';
import { type SharedValue, useDerivedValue, useReducedMotion } from 'react-native-reanimated';

import { grid, hexToRgb01, motion, palette } from '@/design/tokens';

import { type ArtGrid, computeArtGrid } from './art-grid';
import { swirlEffect } from './effects';

const swirlColors = {
  uC0: hexToRgb01(palette.dusk),
  uC1: hexToRgb01(palette.twilight),
  uC2: hexToRgb01(palette.plum),
  uC3: hexToRgb01(palette.heather),
  uC4: hexToRgb01(palette.teal),
};

export function useArtGrid(): ArtGrid & { readonly width: number; readonly height: number; readonly density: number } {
  const { width, height } = useWindowDimensions();
  const density = PixelRatio.get();
  return useMemo(() => ({ ...computeArtGrid(width, height, density), width, height, density }), [width, height, density]);
}

/** Shared clock in seconds; frozen at 0 under Reduce Motion. */
export function useSceneTime() {
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  return useDerivedValue(() => (reduceMotion ? 0 : clock.value / 1000));
}

/** 0 (scene) to ~0.5 (menus); 1 is near black. A shared value animates it, e.g. the welcome warm-up. */
export type SwirlDim = number | SharedValue<number>;

/** Swirl as a Skia <Fill>, for use inside a Canvas. */
export function SwirlFill({ art, dim = 0 }: { readonly art: ArtGrid; readonly dim?: SwirlDim }) {
  const time = useSceneTime();
  const uniforms = useDerivedValue(() => ({
    uRes: [grid.scene.w, grid.scene.h],
    uOrigin: [art.originX, art.originY],
    uUnit: art.unitPt,
    uTime: time.value * motion.swirl.speedIdle,
    uDim: typeof dim === 'number' ? dim : dim.value,
    ...swirlColors,
  }));
  return (
    <Fill>
      <Shader source={swirlEffect} uniforms={uniforms} />
    </Fill>
  );
}

/** Standalone swirl backdrop behind RN content (menu preset). */
export function Swirl({ dim }: { readonly dim?: SwirlDim }) {
  const art = useArtGrid();
  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <SwirlFill art={art} dim={dim} />
    </Canvas>
  );
}
