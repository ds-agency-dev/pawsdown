import { Canvas, Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Text, View } from 'react-native';

import { useSetting } from '@/data/settings-store';
import { fonts, palette, type PaletteName } from '@/design/tokens';
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
export function PixelText(props: PixelTextProps) {
  return useSetting('easyRead') ? <EasyText {...props} /> : <BitmapText {...props} />;
}

/** Pixelify for one-line labels, or Atkinson under Easy read (which swaps every pixel label). */
export function useDisplayFont() {
  return useSetting('easyRead') ? fonts.ui : fonts.display;
}

// Easy read: Atkinson Bold (closest to the bitmap's weight), never under the 17pt running-text minimum.
// Atkinson averages ~0.6 em per character, so `wrap` characters keep roughly the bitmap's line length.
const EASY_PT_PER_PX = 8.5;
const EASY_MIN_PT = 17;
const EASY_EM_PER_CHAR = 0.6;

function EasyText({ text, px = 2, color = 'paper', shadow, wrap = 0, decorative = false }: PixelTextProps) {
  const fontSize = Math.max(EASY_MIN_PT, Math.round(px * EASY_PT_PER_PX));
  return (
    <Text
      style={{
        fontFamily: fonts.uiBold,
        fontSize,
        lineHeight: Math.round(fontSize * 1.25),
        color: palette[color],
        maxWidth: wrap > 0 ? wrap * fontSize * EASY_EM_PER_CHAR : undefined,
        ...(shadow && { textShadowColor: palette[shadow], textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 0 }),
      }}
      accessible={!decorative}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}>
      {text}
    </Text>
  );
}

function BitmapText({ text, px = 2, color = 'paper', shadow, wrap = 0, decorative = false }: PixelTextProps) {
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
