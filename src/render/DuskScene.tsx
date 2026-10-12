import { Canvas, Fill, Group, Paint, RuntimeShader } from '@shopify/react-native-skia';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  type SharedValue,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';

import { useSetting } from '@/data/settings-store';
import { color, crt, hexToRgb01, menuSwirlDim, motion, palette } from '@/design/tokens';

import { CrtOverlay } from './CrtOverlay';
import { crtEffect } from './effects';
import { type SizedArtGrid, SwirlFill, useArtGrid, useCanvasSize, useSceneTime } from './swirl';

const frameColor = hexToRgb01(palette.night);

/** Per-frame scene effects a sequence can drive; every field defaults to the calm scene. */
export interface SceneFx {
  /** Screen shake in art px. */
  readonly shakeX: number;
  readonly shakeY: number;
  /** CRT brightness, 1 = normal. */
  readonly bright: number;
  /** Extra swirl dim, 0..1. */
  readonly dim: number;
  /** Swirl speed multiplier. */
  readonly speed: number;
}

export const CALM_FX: SceneFx = { shakeX: 0, shakeY: 0, bright: 1, dim: 0, speed: 1 };

interface DuskSceneProps {
  /** Skia content in scene art px (0..135 × 0..240); it gets the full CRT treatment. */
  readonly children?: ReactNode;
  readonly fx?: SharedValue<SceneFx>;
  /** A grid the screen already computed (to place touch targets over the art); default: fit to this canvas. */
  readonly art?: SizedArtGrid;
}

interface LayerProps extends Omit<DuskSceneProps, 'art'> {
  readonly art: SizedArtGrid;
}

// Full-screen swirl + CRT ("scene" preset). Screen effect Soft swaps in the menu preset (dimmed swirl, flat
// overlay, no CRT pass); Off draws the art on a flat surface.
export function DuskScene({ children, fx, art: given }: DuskSceneProps) {
  const effect = useSetting('screenEffect');
  const [size, onLayout] = useCanvasSize();
  const fitted = useArtGrid(size);
  const art = given ?? fitted;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={given ? undefined : onLayout}>
      {effect === 'full' ? (
        <FullScene fx={fx} art={art}>
          {children}
        </FullScene>
      ) : (
        <PlainScene soft={effect === 'soft'} fx={fx} art={art}>
          {children}
        </PlainScene>
      )}
    </View>
  );
}

/** Swirl phase that integrates fx.speed, so slowing down never jumps the pattern backwards. */
function useSwirlPhase(fx: SharedValue<SceneFx> | undefined) {
  const reduceMotion = useReducedMotion();
  const phase = useSharedValue(0);
  useFrameCallback((frame) => {
    if (reduceMotion) return;
    const dt = Math.min(frame.timeSincePreviousFrame ?? 16, 100) / 1000;
    phase.set(phase.value + dt * motion.swirl.speedIdle * (fx ? fx.value.speed : 1));
  });
  return phase;
}

function SceneArt({ children, art }: Pick<LayerProps, 'children' | 'art'>) {
  return (
    <Group
      transform={[
        { translateX: art.originX * art.unitPt },
        { translateY: art.originY * art.unitPt },
        { scale: art.unitPt },
      ]}>
      {children}
    </Group>
  );
}

function PlainScene({ soft, children, fx, art }: LayerProps & { readonly soft: boolean }) {
  const phase = useSwirlPhase(fx);
  const dim = useDerivedValue(() => menuSwirlDim + (fx ? fx.value.dim : 0));
  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {soft ? <SwirlFill art={art} dim={dim} phase={phase} /> : <Fill color={color.surface} />}
        <SceneArt art={art}>{children}</SceneArt>
      </Canvas>
      {soft && <CrtOverlay preset="flat" />}
    </>
  );
}

// Everything runs on the UI thread: the clock and uniforms are shared values, so React never re-renders per frame.
function FullScene({ children, fx, art }: LayerProps) {
  const time = useSceneTime();
  const phase = useSwirlPhase(fx);
  const dim = useDerivedValue(() => (fx ? fx.value.dim : 0));

  const crtUniforms = useDerivedValue(() => {
    const f = fx ? fx.value : CALM_FX;
    return {
      uRes: [art.width, art.height],
      uShake: [f.shakeX * art.unitPt, f.shakeY * art.unitPt],
      uFrame: frameColor,
      uCurv: crt.curvature,
      uScan: crt.scanline,
      uChroma: crt.chromaArtPx * art.unitPt,
      uVig: crt.vignette,
      uNoise: crt.noise,
      uBright: f.bright,
      uUnit: art.unitPt,
      uDensity: art.density,
      uTime: time.value,
    };
  });

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
      <Group
        layer={
          <Paint>
            <RuntimeShader source={crtEffect} uniforms={crtUniforms} />
          </Paint>
        }>
        <SwirlFill art={art} dim={dim} phase={phase} />
        <SceneArt art={art}>{children}</SceneArt>
      </Group>
    </Canvas>
  );
}
