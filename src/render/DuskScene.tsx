import { Canvas, Fill, Group, Paint, RuntimeShader } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue } from 'react-native-reanimated';

import { useSetting } from '@/data/settings-store';
import { color, crt, hexToRgb01, menuSwirlDim, palette } from '@/design/tokens';

import { CrtOverlay } from './CrtOverlay';
import { crtEffect } from './effects';
import { SwirlFill, useArtGrid, useSceneTime } from './swirl';

const frameColor = hexToRgb01(palette.night);

interface DuskSceneProps {
  /** Skia content in scene art px (0..135 × 0..240); it gets the full CRT treatment. */
  readonly children?: ReactNode;
}

// Full-screen swirl + CRT ("scene" preset). Screen effect Soft swaps in the menu preset (dimmed swirl, flat
// overlay, no CRT pass); Off draws the art on a flat surface.
export function DuskScene({ children }: DuskSceneProps) {
  const effect = useSetting('screenEffect');
  if (effect === 'full') return <FullScene>{children}</FullScene>;
  return <PlainScene soft={effect === 'soft'}>{children}</PlainScene>;
}

function SceneArt({ children }: DuskSceneProps) {
  const art = useArtGrid();
  return (
    <Group
      transform={[{ translateX: art.originX * art.unitPt }, { translateY: art.originY * art.unitPt }, { scale: art.unitPt }]}>
      {children}
    </Group>
  );
}

function PlainScene({ soft, children }: DuskSceneProps & { readonly soft: boolean }) {
  const art = useArtGrid();
  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {soft ? <SwirlFill art={art} dim={menuSwirlDim} /> : <Fill color={color.surface} />}
        <SceneArt>{children}</SceneArt>
      </Canvas>
      {soft && <CrtOverlay preset="flat" />}
    </>
  );
}

// Everything runs on the UI thread: the clock and uniforms are shared values, so React never re-renders per frame.
function FullScene({ children }: DuskSceneProps) {
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
        <SceneArt>{children}</SceneArt>
      </Group>
    </Canvas>
  );
}
