import { Canvas, Fill, Group, Paint, RuntimeShader, Shader, useClock } from '@shopify/react-native-skia';
import { type ReactNode, useMemo } from 'react';
import { PixelRatio, StyleSheet, useWindowDimensions } from 'react-native';
import { useDerivedValue, useReducedMotion } from 'react-native-reanimated';

import { crt, grid, hexToRgb01, motion, palette } from '@/design/tokens';

import { computeArtGrid } from './art-grid';
import { crtEffect, swirlEffect } from './effects';

const swirlColors = {
  uC0: hexToRgb01(palette.dusk),
  uC1: hexToRgb01(palette.twilight),
  uC2: hexToRgb01(palette.plum),
  uC3: hexToRgb01(palette.heather),
  uC4: hexToRgb01(palette.teal),
};
const frameColor = hexToRgb01(palette.night);

interface DuskSceneProps {
  /** Skia content drawn on the scene grid; it gets the full CRT treatment. */
  readonly children?: ReactNode;
}

// Full-screen swirl + CRT ("scene" preset). Everything runs on the UI thread: the clock and
// uniforms are shared values, so React never re-renders per frame.
export function DuskScene({ children }: DuskSceneProps) {
  const { width, height } = useWindowDimensions();
  const density = PixelRatio.get();
  const art = useMemo(() => computeArtGrid(width, height, density), [width, height, density]);
  const reduceMotion = useReducedMotion();
  const clock = useClock();

  const swirlUniforms = useDerivedValue(() => ({
    uRes: [grid.scene.w, grid.scene.h],
    uOrigin: [art.originX, art.originY],
    uUnit: art.unitPt,
    uTime: reduceMotion ? 0 : (clock.value / 1000) * motion.swirl.speedIdle,
    uDim: 0,
    ...swirlColors,
  }));

  const crtUniforms = useDerivedValue(() => ({
    uRes: [width, height],
    uShake: [0, 0],
    uFrame: frameColor,
    uCurv: crt.curvature,
    uScan: crt.scanline,
    uChroma: crt.chromaArtPx * art.unitPt,
    uVig: crt.vignette,
    uNoise: crt.noise,
    uBright: 1,
    uUnit: art.unitPt,
    uDensity: density,
    // Frozen noise under Reduce Motion: no flicker.
    uTime: reduceMotion ? 0 : clock.value / 1000,
  }));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group
        layer={
          <Paint>
            <RuntimeShader source={crtEffect} uniforms={crtUniforms} />
          </Paint>
        }>
        <Fill>
          <Shader source={swirlEffect} uniforms={swirlUniforms} />
        </Fill>
        {children}
      </Group>
    </Canvas>
  );
}
