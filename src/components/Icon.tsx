import { Canvas, Image, type SkImage } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { ICON_OUTLINE, ICONS, type IconName } from '@/design/icons';
import sprites from '@/design/sprites.json';
import type { PaletteName } from '@/design/tokens';
import { rasterizeSprite, type CodeMap } from '@/render/bitmap';
import { NEAREST, toImage } from '@/render/pixel-art';

// Icons × tints is a small closed set, so images live for the app's lifetime.
const cache = new Map<string, SkImage>();

function tintMap(rows: readonly string[], tint: PaletteName): CodeMap {
  const code = Object.entries(sprites.codes).find(([, name]) => name === tint)?.[0];
  if (!code) throw new Error(`No sprite color code for tint "${tint}"`);
  const fills = new Set(rows.join(''));
  return Object.fromEntries([...fills].filter((c) => c !== '.' && c !== ICON_OUTLINE).map((c) => [c, code]));
}

function iconImage(name: IconName, tint: PaletteName | undefined): SkImage {
  const key = `${name}:${tint ?? ''}`;
  let image = cache.get(key);
  if (!image) {
    const rows = ICONS[name];
    const source = { w: rows[0].length, h: rows.length, rows };
    image = toImage(rasterizeSprite(source, sprites.codes, tint ? tintMap(rows, tint) : {}));
    cache.set(key, image);
  }
  return image;
}

interface IconProps {
  readonly name: IconName;
  /** Points per icon pixel. Whole numbers keep it crisp. */
  readonly scale?: number;
  /** Recolors everything but the outline. */
  readonly tint?: PaletteName;
}

/** A decorative pixel icon; the control around it carries the accessible name. */
export function Icon({ name, scale = 3, tint }: IconProps) {
  const image = useMemo(() => iconImage(name, tint), [name, tint]);
  const w = image.width() * scale;
  const h = image.height() * scale;
  return (
    <Canvas style={{ width: w, height: h }} pointerEvents="none" accessibilityElementsHidden>
      <Image image={image} x={0} y={0} width={w} height={h} sampling={NEAREST} />
    </Canvas>
  );
}
