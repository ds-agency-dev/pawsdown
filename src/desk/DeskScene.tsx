import { createPicture, Picture, useClock } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { type SharedValue, useDerivedValue, useReducedMotion } from 'react-native-reanimated';

import type { Pet } from '@/data/profile';
import { crt, grid, palette } from '@/design/tokens';
import { ALL_COATS, rasterizeText } from '@/render/bitmap';
import { CALM_FX, DuskScene, type SceneFx } from '@/render/DuskScene';
import { spriteImage, toImage } from '@/render/pixel-art';
import type { SizedArtGrid } from '@/render/swirl';

import { cardLines, type DeskImages, type DeskScript, deskTexts, drawDesk, textKey, textSizes, winLines } from './draw';
import { lightsOutFx, swirlDim, swirlSpeed } from './timeline';

interface DeskSceneProps {
  readonly script: DeskScript;
  readonly pet: Pet;
  readonly art: SizedArtGrid;
  /** Sequence time in ms since Shut down, or IDLE. Driven on the UI thread by the screen. */
  readonly seq: SharedValue<number>;
  /** Finger-down on the idle button, 0..1. */
  readonly held: SharedValue<number>;
  /** The lifted object's turn on the desk, 1 face-up → 0 edge-on. */
  readonly flip: SharedValue<number>;
}

/**
 * The desk: header, window, pet, laptop, drawer, tomorrow's cards, win ticket and button, plus the whole shutdown
 * sequence. One Skia picture is recorded per frame on the UI thread from `seq` and the clock; React only re-renders
 * when the script (text, cards, pet) changes.
 */
export function DeskScene({ script, pet, art, seq, held, flip }: DeskSceneProps) {
  const reduced = useReducedMotion();
  const clock = useClock();
  const sizes = useMemo(() => textSizes(art.unitPx), [art.unitPx]);

  const coat = ALL_COATS.find((c) => c.coat.key === `${pet.species}.${pet.coat}`)?.coat;
  if (!coat) throw new Error(`Unknown coat ${pet.species}.${pet.coat}`);

  const sprites = useMemo(
    () => ({
      pet: {
        sit: spriteImage(`${pet.species}_sit`, coat.key, coat.recolor),
        blink: spriteImage(`${pet.species}_blink`, coat.key, coat.recolor),
        sleep: spriteImage(`${pet.species}_sleep`, coat.key, coat.recolor),
      },
      moon: spriteImage('moon', '', {}),
      laptopOpen: spriteImage('laptop_open', '', {}),
      laptopClosed: spriteImage('laptop_closed', '', {}),
    }),
    [pet.species, coat],
  );

  const text = useMemo(
    () =>
      Object.fromEntries(
        deskTexts(script, sizes).map(([str, c]) => [textKey(str, c), toImage(rasterizeText(str, palette[c]))]),
      ),
    [script, sizes],
  );
  const images: DeskImages = useMemo(() => ({ ...sprites, text }), [sprites, text]);
  const cardText = useMemo(() => script.tasks.map((task) => cardLines(task, sizes)), [script.tasks, sizes]);
  const winText = useMemo(() => (script.win ? winLines(script.win, sizes) : []), [script.win, sizes]);

  const picture = useDerivedValue(() =>
    createPicture(
      (canvas) =>
        drawDesk(canvas, {
          t: seq.value,
          now: clock.value,
          reduced,
          held: held.value,
          script,
          cardText,
          winText,
          sizes,
          images,
          flip: flip.value,
        }),
      { width: grid.scene.w, height: grid.scene.h },
    ),
  );

  const fx = useDerivedValue<SceneFx>(() => {
    const t = seq.value;
    if (t < 0) return CALM_FX;
    const { shakeX, shakeY, bright } = lightsOutFx(t, reduced, crt.pulseMax);
    return { shakeX, shakeY, bright, dim: swirlDim(t), speed: swirlSpeed(t) };
  });

  return (
    <DuskScene fx={fx} art={art}>
      <Picture picture={picture} />
    </DuskScene>
  );
}
