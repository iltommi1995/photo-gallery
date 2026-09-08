// A fixed 12x12 grid — not a growable canvas. Every chapter's placements
// live within these bounds; there is no "add more rows".
export const GRID_COLUMNS = 12;
export const GRID_MAX_ROWS = 12;
export const GRID_ROW_HEIGHT = 72;
export const GRID_GAP = 8;
/** Per-item span bounds offered by the admin resize control — the same
 * 12x12 the grid itself is, so an item can go up to the full width/height. */
export const MAX_ITEM_SPAN = 12;
export type GridItem = {
  colSpan: number;
  rowSpan: number;
  gridColumn?: number | null;
  gridRow?: number | null;
};

export function overlaps(a: GridItem, b: GridItem) {
  if (
    a.gridColumn == null ||
    a.gridRow == null ||
    b.gridColumn == null ||
    b.gridRow == null
  )
    return false;
  return (
    a.gridColumn < b.gridColumn + b.colSpan &&
    a.gridColumn + a.colSpan > b.gridColumn &&
    a.gridRow < b.gridRow + b.rowSpan &&
    a.gridRow + a.rowSpan > b.gridRow
  );
}

/** Materialize legacy auto-flow layouts without moving explicitly placed photos. */
export function resolveGrid<T extends GridItem>(
  items: T[],
): (T & { gridColumn: number; gridRow: number })[] {
  const occupied: GridItem[] = items.filter(
    (p) => p.gridColumn != null && p.gridRow != null,
  );
  let cursor = 0;
  return items.map((item) => {
    if (item.gridColumn != null && item.gridRow != null)
      return { ...item, gridColumn: item.gridColumn, gridRow: item.gridRow };
    for (let cell = cursor; ; cell++) {
      const gridColumn = (cell % GRID_COLUMNS) + 1,
        gridRow = Math.floor(cell / GRID_COLUMNS) + 1;
      const candidate = { ...item, gridColumn, gridRow };
      if (
        gridColumn + item.colSpan - 1 <= GRID_COLUMNS &&
        !occupied.some((p) => overlaps(candidate, p))
      ) {
        occupied.push(candidate);
        cursor = cell + item.colSpan;
        return candidate;
      }
    }
  });
}

export function canPlace(item: GridItem, others: GridItem[]) {
  return (
    item.gridColumn != null &&
    item.gridRow != null &&
    item.gridColumn >= 1 &&
    item.gridRow >= 1 &&
    item.gridColumn + item.colSpan - 1 <= GRID_COLUMNS &&
    item.gridRow + item.rowSpan - 1 <= GRID_MAX_ROWS &&
    !others.some((p) => overlaps(item, p))
  );
}
