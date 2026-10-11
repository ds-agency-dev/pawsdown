import {
  AlphaType,
  ColorType,
  FilterMode,
  Group,
  Image,
  MipmapMode,
  Skia,
  type SkImage,
} from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { palette } from '@/design/tokens';
import sprites from '@/design/sprites.json';

import { type Bitmap, type CodeMap, type Coat, rasterizeSprite, rasterizeText, textWidth } from './bitmap';

export const NEAREST = { filter: FilterMode.Nearest, mipmap: MipmapMode.None } as const;

export type SpriteName = keyof typeof sprites.sprites;

export function toImage(bitmap: Bitmap): SkImage {
  const image = Skia.Image.MakeImage(
    { width: bitmap.width, height: bitmap.height, alphaType: AlphaType.Unpremul, colorType: ColorType.RGBA_8888 },
    Skia.Data.fromBytes(bitmap.data),
    bitmap.width * 4,
  );
  if (!image) throw new Error(`Skia could not create a ${bitmap.width}×${bitmap.height} image`);
  return image;
}

// Sprites × coats is a small closed set, so images live for the app's lifetime.
const spriteCache = new Map<string, SkImage>();

export function spriteImage(name: SpriteName, coatKey: string, recolor: CodeMap): SkImage {
  const key = `${name}:${coatKey}`;
  let image = spriteCache.get(key);
  if (!image) {
    image = toImage(rasterizeSprite(sprites.sprites[name], sprites.codes, recolor));
    spriteCache.set(key, image);
  }
  return image;
}

interface PixelSpriteProps {
  readonly name: SpriteName;
  /** Position in scene art px (top-left). */
  readonly x: number;
  readonly y: number;
  /** Whole-number art scale; tokens say pets and props draw at 2. */
  readonly scale?: number;
  readonly coat?: Coat;
}

/** Draws inside DuskScene, whose children use scene art-pixel coordinates. */
export function PixelSprite({ name, x, y, scale = 1, coat }: PixelSpriteProps) {
  const coatKey = coat?.key ?? '';
  const recolor = coat?.recolor;
  const image = useMemo(() => spriteImage(name, coatKey, recolor ?? {}), [name, coatKey, recolor]);
  const { w, h } = sprites.sprites[name];
  return <Image image={image} x={x} y={y} width={w * scale} height={h * scale} sampling={NEAREST} />;
}

interface SceneTextProps {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly color?: string;
  /** Drop shadow 1 font px down-right, as in the engine. */
  readonly shadow?: string;
  readonly align?: 'left' | 'center' | 'right';
  /** Art px per font px. */
  readonly scale?: number;
}

export function SceneText({ text, x, y, color = palette.paper, shadow, align = 'left', scale = 1 }: SceneTextProps) {
  const image = useMemo(() => toImage(rasterizeText(text, color)), [text, color]);
  const shadowImage = useMemo(() => (shadow ? toImage(rasterizeText(text, shadow)) : null), [text, shadow]);
  const w = textWidth(text) * scale;
  const h = image.height() * scale;
  const left = Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
  return (
    <Group>
      {shadowImage && (
        <Image image={shadowImage} x={left + scale} y={y + scale} width={w} height={h} sampling={NEAREST} />
      )}
      <Image image={image} x={left} y={y} width={w} height={h} sampling={NEAREST} />
    </Group>
  );
}
