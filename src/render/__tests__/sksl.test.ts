/**
 * @jest-environment node
 */
import CanvasKitInit from 'canvaskit-wasm/bin/full/canvaskit';

import { CRT_SKSL, OVERLAY_SKSL, SWIRL_SKSL } from '../sksl';

// Compiles the SkSL with the same Skia compiler (via CanvasKit) so syntax errors fail CI, not the phone.
describe('SkSL shaders', () => {
  let compile: (sksl: string) => string[];

  beforeAll(async () => {
    // jest-expo installs Expo's UTF-8-only TextDecoder; CanvasKit needs UTF-16 to report errors.
    const nodeUtil = jest.requireActual<{ TextDecoder: typeof TextDecoder }>('util');
    Object.assign(globalThis, { TextDecoder: nodeUtil.TextDecoder });
    const ck = await CanvasKitInit();
    compile = (sksl) => {
      const errors: string[] = [];
      const effect = ck.RuntimeEffect.Make(sksl, (err) => errors.push(err));
      if (!effect && errors.length === 0) errors.push('compile returned null');
      effect?.delete();
      return errors;
    };
  });

  it('reports errors for invalid SkSL', () => {
    expect(compile('half4 main(float2 xy) { return nope; }')).not.toEqual([]);
  });

  it('compiles the swirl', () => {
    expect(compile(SWIRL_SKSL)).toEqual([]);
  });

  it('compiles the CRT pass', () => {
    expect(compile(CRT_SKSL)).toEqual([]);
  });

  it('compiles the menu overlay', () => {
    expect(compile(OVERLAY_SKSL)).toEqual([]);
  });
});
