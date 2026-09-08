import { MAX_ITEM_SPAN } from "./grid";

/**
 * Grid cells read as roughly square (see MOSAIC_SIZE_CLASSES history: a 2x2
 * LARGE placement was square, a 2x1 MEDIUM was a 2:1 landscape) so a photo's
 * real width:height ratio can be approximated directly as colSpan:rowSpan.
 * There's no fixed pixel cell size to derive an exact ratio from — the grid
 * is fluid — so this is an approximation, not a pixel-perfect fit.
 */
export function rowSpanForAspectRatio(
  colSpan: number,
  photoWidth: number,
  photoHeight: number,
) {
  const ratio = photoWidth / photoHeight;
  const rowSpan = Math.round(colSpan / ratio);
  return Math.min(MAX_ITEM_SPAN, Math.max(1, rowSpan));
}
