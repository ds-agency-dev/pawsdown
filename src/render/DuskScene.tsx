import { Canvas, Group, Paint, RuntimeShader } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { crt, hexToRgb01, palette } from '@/design/tokens';

import { crtEffect } from './effects';
import { SwirlFill, useArtGrid, useSceneTime } from './swirl';

const frameColor = hexToRgb01(palette.night);

interface DuskSceneProps {
  /** Skia content in scene art px (0..135 × 0..240); it gets the full CRT treatment. */
  readonly children?: ReactNode;
}

// Full-screen swirl + CRT ("scene" preset). Everything runs on the UI thread: the clock and
// uniforms are shared values, so React never re-renders per frame.
export function DuskScene({ children }: DuskSceneProps) {
  const art = useArtGrid();
  const time = useSceneTime();

  const crtUniforms = useDerivedValue(() => ({
    uRes: [art.width, art.height],
    uShake: [0, 0],
    uFrame: frameColor,
    uCurv: crt.curvature,
    uScan: crt.scanline,
    uChroma: crt.chromaArtPx * art.unitPt,
    uVig: crt.vignette,
    uNoise: crt.noise,
    uBright: 1,
    uUnit: art.unitPt,
    uDensity: art.density,
    uTime: time.value,
  }));

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group
        layer={
          <Paint>
            <RuntimeShader source={crtEffect} uniforms={crtUniforms} />
          </Paint>
        }>
        <SwirlFill art={art} />
        <Group
          transform={[
            { translateX: art.originX * art.unitPt },
            { translateY: art.originY * art.unitPt },
            { scale: art.unitPt },
          ]}>
          {children}
        </Group>
      </Group>
    </Canvas>
  );
}
