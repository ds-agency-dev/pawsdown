import { grid } from '@/design/tokens';

export interface ArtGrid {
  /** Device pixels per art pixel. Always an integer so art stays crisp. */
  readonly unitPx: number;
  /** Points per art pixel (unitPx / pixel ratio); what Skia's canvas coordinates use. */
  readonly unitPt: number;
  /** Art pixels needed to cover the whole screen (the swirl fills past the scene). */
  readonly cols: number;
  readonly rows: number;
  /** Top-left of the 135×240 scene inside the screen grid, in whole art pixels. */
  readonly originX: number;
  readonly originY: number;
}

// The brief's "3 pt per art px" overflows a 390 pt screen (135 × 3 = 405), so we pick the largest
// integer *device-pixel* unit that fits the scene, and let the swirl cover the remainder.
// insetTopPt keeps the scene clear of the status bar; the grid itself still covers the whole canvas.
export function computeArtGrid(widthPt: number, heightPt: number, pixelRatio: number, insetTopPt = 0): ArtGrid {
  const widthPx = Math.round(widthPt * pixelRatio);
  const heightPx = Math.round(heightPt * pixelRatio);
  const insetPx = Math.round(insetTopPt * pixelRatio);
  const fitPx = Math.max(1, heightPx - insetPx);
  const unitPx = Math.max(1, Math.floor(Math.min(widthPx / grid.scene.w, fitPx / grid.scene.h)));
  const cols = Math.ceil(widthPx / unitPx);
  const rows = Math.ceil(heightPx / unitPx);
  return {
    unitPx,
    unitPt: unitPx / pixelRatio,
    cols,
    rows,
    originX: Math.floor((cols - grid.scene.w) / 2),
    originY: Math.max(0, Math.ceil(insetPx / unitPx) + Math.floor((Math.floor(fitPx / unitPx) - grid.scene.h) / 2)),
  };
}
