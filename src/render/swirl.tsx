import { Canvas, Fill, Shader, useClock } from '@shopify/react-native-skia';
import { useCallback, useMemo, useState } from 'react';
import { type LayoutChangeEvent, PixelRatio, StyleSheet, useWindowDimensions, View } from 'react-native';
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

export interface CanvasSize {
  readonly width: number;
  readonly height: number;
}

export type SizedArtGrid = ArtGrid & CanvasSize & { readonly density: number };

/** The art grid for a canvas of `size` (default: the window), with the scene kept below `insetTop` pt. */
export function useArtGrid(size?: CanvasSize | null, insetTop = 0): SizedArtGrid {
  const win = useWindowDimensions();
  const width = size?.width ?? win.width;
  const height = size?.height ?? win.height;
  const density = PixelRatio.get();
  return useMemo(
    () => ({ ...computeArtGrid(width, height, density, insetTop), width, height, density }),
    [width, height, density, insetTop],
  );
}

/**
 * A canvas's own size from layout; null until the first layout, where callers fall back to the window. Attach the
 * handler to a View around the Canvas: Skia ignores Canvas onLayout on the new architecture.
 */
export function useCanvasSize(): [CanvasSize | null, (e: LayoutChangeEvent) => void] {
  const [size, setSize] = useState<CanvasSize | null>(null);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) => (prev?.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  return [size, onLayout];
}

/** Shared clock in seconds; frozen at 0 under Reduce Motion. */
export function useSceneTime() {
  const reduceMotion = useReducedMotion();
  const clock = useClock();
  return useDerivedValue(() => (reduceMotion ? 0 : clock.value / 1000));
}

/** 0 (scene) to ~0.5 (menus); 1 is near black. A shared value animates it, e.g. the welcome warm-up. */
export type SwirlDim = number | SharedValue<number>;

interface SwirlFillProps {
  readonly art: ArtGrid;
  readonly dim?: SwirlDim;
  /** Swirl phase in seconds, for scenes that change its speed; defaults to the shared scene clock. */
  readonly phase?: SharedValue<number>;
}

/** Swirl as a Skia <Fill>, for use inside a Canvas. */
export function SwirlFill({ art, dim = 0, phase }: SwirlFillProps) {
  const clock = useSceneTime();
  const time = phase ?? clock;
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
  const [size, onLayout] = useCanvasSize();
  const art = useArtGrid(size);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={onLayout}>
      <Canvas style={StyleSheet.absoluteFill}>
        <SwirlFill art={art} dim={dim} />
      </Canvas>
    </View>
  );
}
