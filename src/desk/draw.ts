import {
  ClipOp,
  FilterMode,
  MipmapMode,
  Skia,
  type SkCanvas,
  type SkImage,
  type SkPaint,
} from '@shopify/react-native-skia';

import { palette, type PaletteName } from '@/design/tokens';
import { ADVANCE, GLYPH_H, wrapText } from '@/render/bitmap';

import {
  BUTTON,
  CARD,
  type CardFrame,
  cardFrame,
  clamp,
  drawerDip,
  drawerOpen,
  easeOutCubic,
  FAN,
  hash,
  IDLE,
  lidOpen,
  LIGHTS_OUT,
  nightness,
  NOTE,
  petFrame,
  type PetPose,
  REWARD,
  REWARD_BOX,
  rewardFrame,
  TALLY_BOX,
  tallyFrame,
  tallyRow,
  TICKET,
  ticketFrame,
  WINDOW,
  buttonPress,
  CLEAR_OUT,
  HOLD,
} from './timeline';

// Records one frame of the desk scene onto a Skia canvas in scene art px, following the engine's draw order.
// Runs on the UI thread every frame, so it only draws prebuilt images and rects: all text is rasterised up front
// (deskTexts) into images keyed by text + colour.

/** A desk object the clock-out flow lifts into an editor. */
export type DeskPart = 'card0' | 'card1' | 'card2' | 'win' | 'boundary';
export const CARD_PARTS = ['card0', 'card1', 'card2'] as const;

/** The sticky note on the laptop: blank, a move picked, or picked and done. */
export type NoteState = 'blank' | 'set' | 'done';

/** What the scene shows; changes re-render React, while time and presses stay on the UI thread. */
export interface DeskScript {
  /** Header line 1, e.g. "5:12 PM". */
  readonly time: string;
  /** Header line 2, e.g. "Clock out at 5:30". */
  readonly ask: string;
  /** Tomorrow's three slots in order; '' is an empty slot. */
  readonly tasks: readonly string[];
  /** '' shows the blank ticket at idle and no ticket in the sequence. */
  readonly win: string;
  readonly note: NoteState;
  /** Lifted into an editor: drawn turned by `flip`, so the editor's copy and the desk hand over edge-on. */
  readonly editing: DeskPart | null;
  /** Evenings clocked out, including tonight's once the sequence runs. */
  readonly evenings: number;
  /** Idle button label; empty hides the button. */
  readonly button: string;
  readonly topLabel: string;
  readonly asleep: boolean;
  readonly panelTitle: string;
  readonly panelCaption: string;
}

export interface DeskImages {
  readonly pet: Readonly<Record<PetPose, SkImage>>;
  readonly moon: SkImage;
  readonly laptopOpen: SkImage;
  readonly laptopClosed: SkImage;
  /** Rasterised text by textKey(). */
  readonly text: Readonly<Record<string, SkImage>>;
}

/** Font px sizes in art px: big = 1; small and tiny follow the engine's device-px rounding so text stays crisp. */
export interface TextSizes {
  readonly big: number;
  readonly small: number;
  readonly tiny: number;
  /** "Shutdown complete." and the panel caption. */
  readonly title: number;
  readonly caption: number;
  /** Art px per device px, for snapping text to whole device pixels. */
  readonly devicePx: number;
}

export function textSizes(unitPx: number): TextSizes {
  const small = Math.max(2, Math.round((unitPx * 2) / 3));
  const tiny = Math.max(1, Math.round(small * 0.75));
  const title = Math.max(2, Math.round(unitPx * 0.8));
  const caption = Math.max(1, Math.round(small * 0.85));
  return {
    big: 1,
    small: small / unitPx,
    tiny: tiny / unitPx,
    title: title / unitPx,
    caption: caption / unitPx,
    devicePx: 1 / unitPx,
  };
}

export function textKey(text: string, color: PaletteName) {
  'worklet';
  return `${color}|${text.toUpperCase()}`;
}

const SPARK_COLORS: readonly PaletteName[] = ['glow', 'candle', 'mint', 'lamp'];
const HIDDEN_CARD: CardFrame = { visible: false, x: 0, y: 0, rot: 0, sx: 1, scale: 1, alpha: 0, inDrawer: false };
/** Act one's hold: header line 2 and the button that starts act two. */
export const READY = "Tonight's panel is ready.";
export const LIGHTS_OUT_LABEL = 'Lights out';

/** Card face text: wraps to the card's width and 4 lines, ending in '..' when it overflows. */
export function cardLines(text: string, sizes: TextSizes): string[] {
  const maxChars = Math.floor((CARD.w - 6 + sizes.small) / (6 * sizes.small));
  const lines = wrapText(text, maxChars);
  if (lines.length <= 4) return lines;
  const kept = lines.slice(0, 4);
  kept[3] = `${(kept[3] ?? '').slice(0, maxChars - 2)}..`;
  return kept;
}

export function winLines(win: string, sizes: TextSizes): string[] {
  return wrapText(`Win: ${win}`, Math.floor((60 + sizes.tiny) / (6 * sizes.tiny))).slice(0, 2);
}

export function doneLine(filed: number, wins: number, evenings: number) {
  'worklet';
  const nights = `${evenings} ${evenings === 1 ? 'evening' : 'evenings'}`;
  return wins > 0 ? `${filed} filed · ${wins} win · ${nights}` : `${filed} filed · ${nights}`;
}

/** Slots with a task: the cards that file. */
export function filedCount(tasks: readonly string[]) {
  'worklet';
  let n = 0;
  for (const task of tasks) if (task.length > 0) n++;
  return n;
}

export const BLANK_WIN = "+ Today's win";

/** Every (text, colour) the scene can draw for this script, so each can be rasterised once. */
export function deskTexts(script: DeskScript, sizes: TextSizes): [string, PaletteName][] {
  const out: [string, PaletteName][] = [
    [script.time, 'paper'],
    [script.time, 'night'],
    [script.ask, 'parchment'],
    [script.ask, 'night'],
    ['Shutdown complete.', 'glow'],
    ['Shutdown complete.', 'night'],
    [doneLine(filedCount(script.tasks), script.win ? 1 : 0, script.evenings), 'parchment'],
    [doneLine(filedCount(script.tasks), script.win ? 1 : 0, script.evenings), 'night'],
    [BLANK_WIN, 'smoke'],
    [script.topLabel, 'parchment'],
    [script.topLabel, 'night'],
    ['+', 'smoke'],
    ['Logged', 'night'],
    ['Loose ends filed', 'parchment'],
    ['Wins logged', 'parchment'],
    ['Evenings clocked out', 'parchment'],
    [script.panelTitle, 'plum'],
    [script.panelCaption, 'night'],
    [script.button, 'night'],
    ['Clocking out...', 'night'],
    [LIGHTS_OUT_LABEL, 'night'],
    [READY, 'parchment'],
    [READY, 'night'],
    ['Shutdown complete', 'night'],
    ['See you tomorrow', 'smoke'],
  ];
  for (let i = 0; i < 3; i++) out.push([`No.${i + 1}`, 'smoke'], [`No.${i + 1}`, 'plum']);
  for (const task of script.tasks) for (const line of cardLines(task, sizes)) out.push([line, 'night']);
  if (script.win) for (const line of winLines(script.win, sizes)) out.push([line, 'night']);
  for (let d = 0; d <= 9; d++) out.push([String(d), 'glow']);
  return out.filter(([text]) => text.length > 0);
}

export interface DeskFrameInput {
  readonly t: number;
  readonly now: number;
  readonly reduced: boolean;
  /** Idle finger-down on the button, 0..1. */
  readonly held: number;
  readonly script: DeskScript;
  readonly cardText: readonly (readonly string[])[];
  readonly winText: readonly string[];
  readonly sizes: TextSizes;
  readonly images: DeskImages;
  /** The lifted object's turn, 1 face-up → 0 edge-on (see `DeskScript.editing`). */
  readonly flip: number;
}

export function drawDesk(canvas: SkCanvas, input: DeskFrameInput) {
  'worklet';
  const { t, now, reduced, held, script, sizes, images } = input;
  // Horizontal scale of a desk object: the one lifted into an editor turns edge-on (0) while the editor has it.
  const turned = (part: DeskPart) => (script.editing === part ? input.flip : 1);
  const paint = Skia.Paint();
  paint.setAntiAlias(false);

  const color = (name: PaletteName, alpha = 1) => {
    paint.setColor(Skia.Color(palette[name]));
    paint.setAlphaf(alpha);
  };
  const rect = (x: number, y: number, w: number, h: number) => canvas.drawRect(Skia.XYWHRect(x, y, w, h), paint);
  // Stepped corner: two overlapping rects, 1 art px notch.
  const step = (x: number, y: number, w: number, h: number, c: PaletteName, alpha = 1) => {
    color(c, alpha);
    rect(x + 1, y, w - 2, h);
    rect(x, y + 1, w, h - 2);
  };
  const panel = (x: number, y: number, w: number, h: number, fill: PaletteName, line: PaletteName, alpha = 1) => {
    step(x, y, w, h, line, alpha);
    step(x + 1, y + 1, w - 2, h - 2, fill, alpha);
  };
  const image = (img: SkImage, x: number, y: number, w: number, h: number, alpha = 1, p: SkPaint = paint) => {
    p.setAlphaf(alpha);
    canvas.drawImageRectOptions(
      img,
      Skia.XYWHRect(0, 0, img.width(), img.height()),
      Skia.XYWHRect(x, y, w, h),
      FilterMode.Nearest,
      MipmapMode.None,
      p,
    );
  };
  const snap = (v: number) => Math.round(v / sizes.devicePx) * sizes.devicePx;
  const text = (
    str: string,
    c: PaletteName,
    x: number,
    y: number,
    fs: number,
    align: 'left' | 'center' | 'right' = 'left',
    alpha = 1,
    shadow?: PaletteName,
  ) => {
    if (shadow) text(str, shadow, x + fs, y + fs, fs, align, alpha);
    const img = images.text[textKey(str, c)];
    if (!img) return;
    const w = img.width() * fs;
    const left = snap(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x);
    image(img, left, snap(y), w, GLYPH_H * fs, alpha);
  };
  // Width of a string in art px at font size fs, for right-aligned numbers. Inline because this runs on the UI
  // thread: calling a plain JS helper (bitmap's textWidth) from a worklet crashes the app.
  const width = (str: string, fs: number) => (str.length ? str.length * ADVANCE - 1 : 0) * fs;

  // ---- Header
  if (t < LIGHTS_OUT) {
    const ask = t >= HOLD ? READY : script.ask;
    text(script.time, 'paper', 135 / 2, 6, sizes.big, 'center', 1, 'night');
    text(ask, 'parchment', 135 / 2, 17, sizes.small, 'center', 1, 'night');
  } else {
    const k = easeOutCubic((t - LIGHTS_OUT) / 300);
    text('Shutdown complete.', 'glow', 135 / 2, 6, sizes.title, 'center', k, 'night');
    if (t >= CLEAR_OUT) {
      text(
        doneLine(filedCount(script.tasks), script.win ? 1 : 0, script.evenings),
        'parchment',
        135 / 2,
        17,
        sizes.small,
        'center',
        easeOutCubic((t - CLEAR_OUT) / 300),
        'night',
      );
    }
  }

  // ---- Window: dusk bands, then night with twinkling stars and the moon
  const night = nightness(t, script.asleep);
  const W = WINDOW;
  panel(W.x, W.y, W.w, W.h, 'twilight', 'night');
  const bands: PaletteName[] = ['plum', 'heather', 'ember', 'lamp'];
  for (let i = 0; i < 4; i++) {
    color(bands[i] ?? 'plum');
    rect(W.x + 2, W.y + 2 + i * 9, W.w - 4, i === 3 ? W.h - 4 - 27 : 9);
  }
  if (night > 0) {
    color('dusk', night);
    rect(W.x + 2, W.y + 2, W.w - 4, W.h - 4);
    for (let s = 0; s < 9; s++) {
      const sx = W.x + 3 + Math.floor(hash(s * 3.1) * (W.w - 7));
      const sy = W.y + 3 + Math.floor(hash(s * 7.7) * (W.h - 12));
      color('candle', night * (reduced ? 1 : 0.45 + 0.55 * Math.abs(Math.sin(now * 0.0021 + s * 1.7))));
      rect(sx, sy, 1, 1);
    }
    image(images.moon, W.x + W.w - 16, W.y + 4, 12, 12, night);
  }
  color('night');
  rect(W.x + W.w / 2 - 0.5, W.y + 1, 1, W.h - 2);
  rect(W.x + 1, W.y + W.h / 2 - 0.5, W.w - 2, 1);

  // ---- Pet: scaled around its feet for squash and stretch
  const pet = petFrame(t, now, reduced, script.asleep);
  canvas.save();
  canvas.translate(pet.x + 32, pet.y + 64);
  canvas.scale(pet.sx, pet.sy);
  image(images.pet[pet.pose], -32, -64, 64, 64);
  canvas.restore();

  // ---- Laptop: the lid folds down toward the hinge; the cursor blinks while it's open and idle
  const lid = lidOpen(t, script.asleep);
  if (lid <= 0) image(images.laptopClosed, 80, 72, 48, 48);
  else {
    const L = images.laptopOpen;
    paint.setAlphaf(1);
    canvas.drawImageRectOptions(
      L,
      Skia.XYWHRect(0, 10, 24, 4),
      Skia.XYWHRect(80, 92, 48, 8),
      FilterMode.Nearest,
      MipmapMode.None,
      paint,
    );
    canvas.drawImageRectOptions(
      L,
      Skia.XYWHRect(0, 0, 24, 10),
      Skia.XYWHRect(80, 92 - 20 * lid, 48, Math.max(sizes.devicePx, 20 * lid)),
      FilterMode.Nearest,
      MipmapMode.None,
      paint,
    );
    if (t < 0 && !reduced && Math.floor(now / 530) % 2 === 0) {
      color('paper');
      rect(108, 86 - 20 * (1 - lid), 2, 2);
    }
    // Sticky note on the lid: tonight's boundary move (blank shows a faint +). It folds down with the lid.
    const noteTurn = turned('boundary');
    if (noteTurn > 0.01) {
      const blank = script.note === 'blank';
      const k = blank ? 0.55 : 1;
      canvas.save();
      canvas.translate(NOTE.x + NOTE.w / 2, 92 - 20 * lid + 3 * lid);
      canvas.scale(noteTurn, lid);
      canvas.translate(-NOTE.w / 2, 0);
      panel(0, 0, NOTE.w, NOTE.h, script.note === 'done' ? 'mint' : 'candle', 'night', k);
      color('night', k);
      if (blank) {
        rect(4, 2, 2, 6);
        rect(2, 4, 6, 2);
      } else {
        rect(2, 3, 6, 1);
        rect(2, 5, 4, 1);
      }
      canvas.restore();
    }
  }

  // ---- Desk top and one wide drawer, flush with the desk front (user: the design's labelled drawer looked stuck
  // on). Opening slides the face toward you, showing the dark inside above it; the pull is the only accent.
  color('parchment');
  rect(4, 100, 127, 4);
  color('night');
  rect(4, 104, 127, 1);
  panel(6, 104, 123, 20, 'twilight', 'night');
  const slot = 4 * drawerOpen(t);
  if (slot > 0.2) {
    color('night');
    rect(10, 107, 115, slot);
  }
  // The front dips as each card lands in it.
  const front = slot + drawerDip(t, reduced);

  // ---- Cards: frames once per draw; ones falling through the slot go behind the drawer front, clipped at its
  // bottom edge so they never peek out below it, and the front then shuts on them.
  const cw = CARD.w;
  const ch = CARD.h;
  // Empty slots don't file.
  const filed: CardFrame[] = [];
  for (let i = 0; i < 3; i++) {
    filed.push((script.tasks[i] ?? '').length > 0 ? cardFrame(i, t, now, reduced) : HIDDEN_CARD);
  }
  const card = (i: number, c: CardFrame) => {
    const turn = turned(CARD_PARTS[i] ?? 'card0');
    if (turn <= 0.01) return;
    canvas.save();
    canvas.translate(c.x, c.y);
    canvas.rotate((c.rot * 180) / Math.PI, 0, 0);
    canvas.scale(Math.max(0.02, Math.abs(c.sx)) * c.scale * turn, c.scale);
    const x = -cw / 2;
    const y = -ch / 2;
    if (c.sx >= 0) {
      panel(x, y, cw, ch, 'paper', 'night', c.alpha);
      text(`No.${i + 1}`, 'plum', x + 3, y + 3, sizes.tiny, 'left', c.alpha);
      step(x + cw - 8, y + 3, 5, 5, 'night', c.alpha);
      step(x + cw - 7, y + 4, 3, 3, 'lamp', c.alpha);
      color('parchment', c.alpha);
      rect(x + 3, y + 10, cw - 6, 1);
      const lines = input.cardText[i] ?? [];
      for (let l = 0; l < lines.length; l++) {
        text(lines[l] ?? '', 'night', x + 3, y + 14 + l * 9 * sizes.small, sizes.small, 'left', c.alpha);
      }
      color('lamp', c.alpha);
      rect(x + 3, y + ch - 6, 3, 3);
    } else {
      panel(x, y, cw, ch, 'plum', 'night', c.alpha);
      color('heather', c.alpha);
      for (let yy = 3; yy < ch - 3; yy += 4) {
        for (let xx = 3 + ((yy / 4) % 2) * 2; xx < cw - 3; xx += 4) rect(x + xx, y + yy, 1, 1);
      }
      step(-6, -6, 12, 12, 'night', c.alpha);
      step(-5, -5, 10, 10, 'candle', c.alpha);
      step(-3, -6, 8, 8, 'night', c.alpha);
    }
    canvas.restore();
  };
  canvas.save();
  canvas.clipRect(Skia.XYWHRect(0, 0, 135, 121 + front), ClipOp.Intersect, false);
  for (let i = 0; i < filed.length; i++) {
    const c = filed[i];
    if (c && c.visible && c.inDrawer) card(i, c);
  }
  canvas.restore();

  panel(9, 106 + front, 117, 15, 'twilight', 'night');
  color('plum');
  rect(11, 107 + front, 113, 1);
  step(57, 111 + front, 21, 4, 'night');
  color('lamp');
  rect(59, 112 + front, 17, 1);
  color('glow');
  rect(59, 112 + front, 4, 1);

  if (t < 0 && script.topLabel) text(script.topLabel, 'parchment', 135 / 2, 128, sizes.tiny, 'center', 1, 'night');

  // ---- Cards in front: empty slots (fading out once the sequence starts), the idle fan and cards in flight
  const slotAlpha = t < 0 ? 1 : 1 - clamp(t / 150, 0, 1);
  for (let j = 0; j < 3; j++) {
    const turn = turned(CARD_PARTS[j] ?? 'card0');
    if (slotAlpha <= 0 || turn <= 0.01 || (script.tasks[j] ?? '').length > 0) continue;
    const f = FAN[j] ?? FAN[1];
    canvas.save();
    canvas.translate(f.x, f.y);
    canvas.rotate((f.r * 180) / Math.PI, 0, 0);
    canvas.scale(turn, 1);
    panel(-cw / 2, -ch / 2, cw, ch, 'dusk', 'heather', slotAlpha);
    text(`No.${j + 1}`, 'smoke', -cw / 2 + 3, -ch / 2 + 3, sizes.tiny, 'left', slotAlpha);
    text('+', 'smoke', 0, -4, sizes.big, 'center', slotAlpha);
    canvas.restore();
  }
  for (let i = 0; i < filed.length; i++) {
    const c = filed[i];
    if (c && c.visible && !c.inDrawer) card(i, c);
  }

  // ---- Tally
  const tally = tallyFrame(t);
  if (tally.visible) {
    const B = TALLY_BOX;
    panel(B.x, tally.y, B.w, B.h, 'twilight', 'night', tally.alpha);
    const rows: [string, number, number][] = [
      ['Loose ends filed', 0, filedCount(script.tasks)],
      ['Wins logged', 0, script.win ? 1 : 0],
      ['Evenings clocked out', script.evenings - 1, script.evenings],
    ];
    for (let i = 0; i < rows.length; i++) {
      const [label, from, to] = rows[i] ?? ['', 0, 0];
      const row = tallyRow(i, t, from, to);
      const ry = tally.y + 8 + i * 16;
      text(label, 'parchment', 19, ry + 1, sizes.tiny, 'left', tally.alpha);
      const digits = String(row.value);
      canvas.save();
      canvas.translate(114, ry + 3.5);
      canvas.scale(row.pop, row.pop);
      let dx = -width(digits, sizes.big);
      for (const d of digits) {
        text(d, 'glow', dx, -3.5, sizes.big, 'left', tally.alpha);
        dx += 6 * sizes.big;
      }
      canvas.restore();
    }
  }

  // ---- Win ticket, stamped LOGGED with a spark burst; turns about its centre when lifted to edit
  const ticketTurn = turned('win');
  canvas.save();
  canvas.translate(TICKET.x + TICKET.w / 2, 0);
  canvas.scale(ticketTurn, 1);
  canvas.translate(-(TICKET.x + TICKET.w / 2), 0);
  if (script.win && ticketTurn > 0.01) {
    const tk = ticketFrame(t < 0 ? IDLE : t, reduced);
    if (tk.visible) {
      const T = TICKET;
      panel(T.x, tk.y, T.w, T.h, tk.stamped ? 'glow' : 'candle', 'night', tk.alpha);
      color('night', tk.alpha);
      for (let i = 0; i < 7; i++) {
        rect(T.x, tk.y + 2 + i * 2, 1, 1);
        rect(T.x + T.w - 1, tk.y + 2 + i * 2, 1, 1);
      }
      const wl = input.winText;
      for (let i = 0; i < wl.length; i++) {
        text(
          wl[i] ?? '',
          'night',
          22,
          tk.y + (wl.length > 1 ? 3 : 6) + i * 9 * sizes.tiny,
          sizes.tiny,
          'left',
          tk.alpha,
        );
      }
      if (tk.stamped) {
        canvas.save();
        canvas.translate(100, tk.y + 9);
        canvas.rotate((-0.18 * 180) / Math.PI, 0, 0);
        canvas.scale(tk.stampScale, tk.stampScale);
        panel(-15, -5, 30, 10, 'mint', 'night', tk.stampAlpha);
        text('Logged', 'night', 0, -2, sizes.tiny, 'center', tk.stampAlpha);
        canvas.restore();
        if (tk.sparkAge !== null) {
          const age = tk.sparkAge;
          for (let s = 0; s < 12; s++) {
            const ang = -Math.PI / 2 + (hash(s + 1) - 0.5) * 2.4;
            const sp = 45 + hash(s + 9) * 40;
            const px = 100 + Math.cos(ang) * sp * age;
            const py = tk.y + 9 + Math.sin(ang) * sp * age + 0.5 * 170 * age * age;
            color(SPARK_COLORS[s % 4] ?? 'glow', (1 - age / 0.6) * tk.alpha);
            rect(Math.round(px), Math.round(py), 1, 1);
          }
        }
      }
    }
  }

  // A blank ticket waits for today's win until the sequence starts.
  if (!script.win && ticketTurn > 0.01 && t < 0) {
    const T = TICKET;
    panel(T.x, T.y, T.w, T.h, 'dusk', 'heather');
    text(BLANK_WIN, 'smoke', T.x + T.w / 2, T.y + 6, sizes.tiny, 'center');
  }
  canvas.restore();

  // ---- Tonight's panel
  const rw = rewardFrame(t, reduced);
  if (rw.visible) {
    const R = REWARD_BOX;
    const x = R.x;
    const y = rw.y;
    // A slow holo sweep stands in for the style lab's pointer tilt.
    const tilt = reduced ? 0 : Math.sin(now * 0.0011) * 0.8;
    canvas.save();
    canvas.translate(x + R.w / 2, y + R.h / 2);
    canvas.skew(tilt * 0.06, 0);
    canvas.translate(-(x + R.w / 2), -(y + R.h / 2));
    panel(x, y, R.w, R.h, 'paper', 'night', rw.alpha);
    const ix = x + 4;
    const iy = y + 4;
    const iw = R.w - 8;
    const ih = 50;
    color('dusk', rw.alpha);
    rect(ix, iy, iw, ih);
    for (let s = 0; s < 12; s++) {
      const sx = ix + 2 + Math.floor(hash(s * 5.3 + 2) * (iw - 4));
      const sy = iy + 2 + Math.floor(hash(s * 2.9 + 7) * 22);
      color('candle', rw.alpha * (reduced ? 1 : 0.4 + 0.6 * Math.abs(Math.sin(now * 0.003 + s))));
      rect(sx, sy, 1, 1);
    }
    image(images.moon, ix + iw - 18, iy + 4, 12, 12, rw.alpha);
    color('plum', rw.alpha);
    rect(ix + 10, iy + 38, 56, 10);
    color('heather', rw.alpha);
    rect(ix + 8, iy + 32, 6, 16);
    rect(ix + 62, iy + 32, 6, 16);
    color('night', rw.alpha);
    rect(ix, iy + ih - 2, iw, 2);
    image(images.pet.sleep, ix + 22, iy + 14, 32, 32, rw.alpha);
    if (!reduced) {
      const band = (tilt * 0.5 + 0.5) * (iw + 40) - 20;
      for (let r = 0; r < ih; r++) {
        const bx = Math.round(band + r * 0.55);
        const a0 = clamp(bx - 7, 0, iw);
        const a1 = clamp(bx + 7, 0, iw);
        color('mint', 0.16 * rw.alpha);
        if (a1 > a0) rect(ix + a0, iy + r, a1 - a0, 1);
        const b0 = clamp(bx - 2, 0, iw);
        const b1 = clamp(bx + 2, 0, iw);
        color('candle', 0.22 * rw.alpha);
        if (b1 > b0) rect(ix + b0, iy + r, b1 - b0, 1);
      }
    }
    text(script.panelTitle, 'plum', x + R.w / 2, y + 57, sizes.tiny, 'center', rw.alpha);
    text(script.panelCaption, 'night', x + R.w / 2, y + 66, sizes.caption, 'center', rw.alpha);
    canvas.restore();
  }

  // ---- Button: squashes on press; becomes the quiet SEE YOU TOMORROW plate once the panel is in
  const Bt = BUTTON;
  if (t >= REWARD) {
    const k = easeOutCubic((t - REWARD) / 300);
    panel(Bt.x, Bt.y + 2, Bt.w, Bt.h - 2, 'twilight', 'night', k);
    text('See you tomorrow', 'smoke', Bt.x + Bt.w / 2, Bt.y + 7, sizes.small, 'center', k);
  } else if (t >= 0 || script.button) {
    const press = buttonPress(t, held);
    const drop = press * 2;
    const waiting = t < 0 || (t >= HOLD && t < LIGHTS_OUT);
    const glowing = waiting && !reduced && 0.5 + 0.5 * Math.sin(now * 0.004) > 0.85;
    canvas.save();
    canvas.translate(Bt.x + Bt.w / 2, Bt.y + Bt.h / 2);
    canvas.scale(1 + 0.03 * press, 1 - 0.06 * press);
    canvas.translate(-(Bt.x + Bt.w / 2), -(Bt.y + Bt.h / 2));
    step(Bt.x, Bt.y + 2, Bt.w, Bt.h, 'night');
    step(Bt.x + 1, Bt.y + 3, Bt.w - 2, Bt.h - 2, 'ember');
    step(Bt.x, Bt.y + drop, Bt.w, Bt.h - 2, 'night');
    step(Bt.x + 1, Bt.y + 1 + drop, Bt.w - 2, Bt.h - 4, glowing ? 'glow' : 'lamp');
    const label =
      t < 0 ? script.button : t < HOLD ? 'Clocking out...' : t < LIGHTS_OUT ? LIGHTS_OUT_LABEL : 'Shutdown complete';
    text(label, 'night', Bt.x + Bt.w / 2, Bt.y + 5 + drop, sizes.small, 'center');
    canvas.restore();
  }
}
