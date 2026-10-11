import { Skia, type SkRuntimeEffect } from '@shopify/react-native-skia';

import { CRT_SKSL, SWIRL_SKSL } from './sksl';

// sksl.test.ts compiles these with CanvasKit, so a null here means a native/CanvasKit mismatch.
function compile(name: string, sksl: string): SkRuntimeEffect {
  const effect = Skia.RuntimeEffect.Make(sksl);
  if (!effect) throw new Error(`Skia failed to compile the ${name} shader`);
  return effect;
}

export const swirlEffect = compile('swirl', SWIRL_SKSL);
export const crtEffect = compile('CRT', CRT_SKSL);
