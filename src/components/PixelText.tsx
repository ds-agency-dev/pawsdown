import { Canvas, Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { View } from 'react-native';

import { palette, type PaletteName } from '@/design/tokens';
import { GLYPH_H, rasterizeText, textWidth, wrapText } from '@/render/bitmap';
import { NEAREST, toImage } from '@/render/pixel-art';

// Lines sit 9 font px apart (7 tall + 2 gap), as in the design system.
const LINE_GAP = 2;

interface PixelTextProps {
  /** Lowercase is drawn uppercase. */
  readonly text: string;
  /** Points per font pixel: 2 for labels, 3 for counters, 4 for the clock. Whole numbers keep it crisp. */
  readonly px?: number;
  readonly color?: PaletteName;
  /** 1 font-px drop shadow down-right; use 'night' over the swirl. */
  readonly shadow?: PaletteName;
  /** Wrap at this many characters per line; 0 keeps one line. */
  readonly wrap?: number;
  /** Hide from VoiceOver when a parent already names it. */
  readonly decorative?: boolean;
}

/** Dusk 5×7 bitmap text as an RN view, for menu-preset UI. Inside DuskScene use SceneText instead. */
export function PixelText({ text, px = 2, color = 'paper', shadow, wrap = 0, decorative = false }: PixelTextProps) {
  const lines = useMemo(() => (wrap > 0 ? wrapText(text, wrap) : [text]), [text, wrap]);
  const images = useMemo(() => lines.map((line) => toImage(rasterizeText(line, palette[color]))), [lines, color]);
  const shadowImages = useMemo(
    () => (shadow ? lines.map((line) => toImage(rasterizeText(line, palette[shadow]))) : []),
    [lines, shadow],
  );
  const pitch = (GLYPH_H + LINE_GAP) * px;
  const w = Math.max(1, ...lines.map(textWidth)) * px;
  const h = (Math.max(1, lines.length) * (GLYPH_H + LINE_GAP) - LINE_GAP) * px;
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
        {shadowImages.map((image, i) => (
          <Image
            key={`s${i}`}
            image={image}
            x={px}
            y={i * pitch + px}
            width={image.width() * px}
            height={GLYPH_H * px}
            sampling={NEAREST}
          />
        ))}
        {images.map((image, i) => (
          <Image
            key={i}
            image={image}
            x={0}
            y={i * pitch}
            width={image.width() * px}
            height={GLYPH_H * px}
            sampling={NEAREST}
          />
        ))}
      </Canvas>
    </View>
  );
}
