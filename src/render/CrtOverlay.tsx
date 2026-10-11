import { Canvas, Fill, Shader } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { hexToRgb01, palette } from '@/design/tokens';

import { overlayEffect } from './effects';
import { useArtGrid } from './swirl';

// Values from the design system's CrtOverlay CSS (points): 3pt scanline period with a 1pt dark row,
// tube = rounded inset frame with an inner shadow. "flat" drops the tube for sheets / Soft mode.
const PRESETS = {
  menu: { scanAlpha: 0.16, inset: 6, radius: 30, frame: 1, shadowAlpha: 0.62, shadowSpread: 12, shadowBlur: 72 },
  flat: { scanAlpha: 0.16, inset: 0, radius: 0, frame: 0, shadowAlpha: 0.5, shadowSpread: 8, shadowBlur: 60 },
} as const;

export type CrtOverlayPreset = keyof typeof PRESETS;

/**
 * Scanlines, vignette and tube edge laid over RN UI. Nothing bends or splits, so text stays sharp.
 * Static: Skia only redraws on resize, so scrolling underneath costs compositing only.
 */
export function CrtOverlay({ preset = 'menu' }: { readonly preset?: CrtOverlayPreset }) {
  const art = useArtGrid();
  const uniforms = useMemo(() => {
    const p = PRESETS[preset];
    return {
      uRes: [art.width, art.height],
      uNight: hexToRgb01(palette.night),
      uScanAlpha: p.scanAlpha,
      uInset: p.inset,
      uRadius: p.radius,
      uFrame: p.frame,
      uShadowAlpha: p.shadowAlpha,
      uShadowSpread: p.shadowSpread,
      uShadowBlur: p.shadowBlur,
    };
  }, [art.width, art.height, preset]);

  return (
    <Canvas style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Fill>
        <Shader source={overlayEffect} uniforms={uniforms} />
      </Fill>
    </Canvas>
  );
}
