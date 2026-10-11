import { Canvas, Image } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import sprites from '@/design/sprites.json';
import type { Coat } from '@/render/bitmap';
import { NEAREST, spriteImage, type SpriteName } from '@/render/pixel-art';

interface SpriteProps {
  readonly name: SpriteName;
  /** Points per sprite pixel; the design system draws pets at 2. Whole numbers keep it crisp. */
  readonly scale?: number;
  readonly coat?: Coat;
  /** VoiceOver label; without one the sprite is decorative. */
  readonly label?: string;
}

/** A pixel sprite as an RN view, for menu-preset UI. Inside DuskScene use PixelSprite instead. */
export function Sprite({ name, scale = 2, coat, label }: SpriteProps) {
  const coatKey = coat?.key ?? '';
  const recolor = coat?.recolor;
  const image = useMemo(() => spriteImage(name, coatKey, recolor ?? {}), [name, coatKey, recolor]);
  const w = sprites.sprites[name].w * scale;
  const h = sprites.sprites[name].h * scale;

  return (
    <Canvas
      style={{ width: w, height: h }}
      pointerEvents="none"
      accessible={label !== undefined}
      accessibilityElementsHidden={label === undefined}
      accessibilityRole={label === undefined ? undefined : 'image'}
      accessibilityLabel={label}>
      <Image image={image} x={0} y={0} width={w} height={h} sampling={NEAREST} />
    </Canvas>
  );
}
