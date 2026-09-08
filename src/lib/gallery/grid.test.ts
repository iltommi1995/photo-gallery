import { describe, expect, it } from "vitest";
import { canPlace, GRID_COLUMNS, resolveGrid } from "./grid";
import { gridPlacementsSchema } from "@/lib/schemas/album";

describe("grid placement", () => {
  it("keeps legacy layouts and reserves explicit empty space", () => {
    const layout = resolveGrid([
      { colSpan: 2, rowSpan: 2 },
      { colSpan: 1, rowSpan: 1 },
      { colSpan: 2, rowSpan: 1, gridColumn: 1, gridRow: 5 },
    ]);
    expect(layout.map((p) => [p.gridColumn, p.gridRow])).toEqual([
      [1, 1],
      [3, 1],
      [1, 5],
    ]);
  });
  it("rejects overlaps and photos extending outside the grid", () => {
    const photo = { colSpan: 2, rowSpan: 2, gridColumn: 2, gridRow: 2 };
    expect(canPlace({ colSpan: 1, rowSpan: 1, gridColumn: 3, gridRow: 3 }, [photo])).toBe(
      false,
    );
    expect(
      canPlace({ colSpan: 2, rowSpan: 1, gridColumn: GRID_COLUMNS, gridRow: 1 }, []),
    ).toBe(false);
    expect(canPlace({ colSpan: 1, rowSpan: 1, gridColumn: 4, gridRow: 4 }, [photo])).toBe(
      true,
    );
  });
  it("validates coordinate pairs, bounds and collisions on the API payload", () => {
    const p = {
      type: "PHOTO" as const,
      photoId: "p",
      colSpan: 2,
      rowSpan: 1,
      gridColumn: 1,
      gridRow: 3,
    };
    expect(gridPlacementsSchema.safeParse({ placements: [p] }).success).toBe(true);
    expect(
      gridPlacementsSchema.safeParse({ placements: [p, { ...p, photoId: "q" }] }).success,
    ).toBe(false);
    expect(
      gridPlacementsSchema.safeParse({ placements: [{ ...p, gridRow: null }] }).success,
    ).toBe(false);
    expect(
      gridPlacementsSchema.safeParse({
        placements: [{ ...p, gridColumn: GRID_COLUMNS }],
      }).success,
    ).toBe(false);
    expect(
      gridPlacementsSchema.safeParse({
        placements: [{ type: "PHOTO", photoId: "old", colSpan: 4, rowSpan: 2 }],
      }).success,
    ).toBe(true);
    expect(
      gridPlacementsSchema.safeParse({
        placements: [{ type: "TEXT", textContent: "<p>hi</p>", colSpan: 2, rowSpan: 1 }],
      }).success,
    ).toBe(true);
  });
});
