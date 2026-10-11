import { Canvas, Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { palette, type PaletteName } from '@/design/tokens';
import { GLYPH_H, rasterizeText, textWidth } from '@/render/bitmap';
import { NEAREST, toImage } from '@/render/pixel-art';

interface PixelTextProps {
  /** Lowercase is drawn uppercase. */
  readonly text: string;
  /** Points per font pixel: 2 for labels, 3 for counters, 4 for the clock. Whole numbers keep it crisp. */
  readonly px?: number;
  readonly color?: PaletteName;
  /** 1 font-px drop shadow down-right; use 'night' over the swirl. */
  readonly shadow?: PaletteName;
  /** Hide from VoiceOver when a parent already names it. */
  readonly decorative?: boolean;
}

/** Dusk 5×7 bitmap text as an RN view, for menu-preset UI. Inside DuskScene use SceneText instead. */
export function PixelText({ text, px = 2, color = 'paper', shadow, decorative = false }: PixelTextProps) {
  const image = useMemo(() => toImage(rasterizeText(text, palette[color])), [text, color]);
  const shadowImage = useMemo(() => (shadow ? toImage(rasterizeText(text, palette[shadow])) : null), [text, shadow]);
  const w = Math.max(1, textWidth(text)) * px;
  const h = GLYPH_H * px;
  const pad = shadow ? px : 0;

  return (
    <View
      style={{ width: w + pad, height: h + pad }}
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
      accessibilityRole="text"
      accessibilityLabel={decorative ? undefined : text}>
      <Canvas style={{ width: w + pad, height: h + pad }} pointerEvents="none">
        {shadowImage && <Image image={shadowImage} x={px} y={px} width={w} height={h} sampling={NEAREST} />}
        <Image image={image} x={0} y={0} width={w} height={h} sampling={NEAREST} />
      </Canvas>
    </View>
  );
}
