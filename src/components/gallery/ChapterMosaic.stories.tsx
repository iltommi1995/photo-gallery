import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChapterMosaic, type MosaicPlacement } from "./ChapterMosaic";

function placement(id: string, colSpan: number, rowSpan: number): MosaicPlacement {
  return {
    id,
    type: "PHOTO",
    colSpan,
    rowSpan,
    photo: { id, altText: `Placeholder ${id}`, blurDataUrl: null },
  };
}

function textPlacement(id: string, colSpan: number, rowSpan: number): MosaicPlacement {
  return { id, type: "TEXT", colSpan, rowSpan, textContent: `<p>Text block ${id}</p>` };
}

const meta = {
  title: "Gallery/ChapterMosaic",
  component: ChapterMosaic,
  parameters: { layout: "padded" },
} satisfies Meta<typeof ChapterMosaic>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MixedSizes: Story = {
  args: {
    placements: [
      placement("1", 4, 2),
      placement("2", 2, 1),
      placement("3", 1, 1),
      placement("4", 1, 1),
      placement("5", 2, 2),
      placement("6", 2, 1),
    ],
  },
};

export const AllSmall: Story = {
  args: {
    placements: Array.from({ length: 8 }, (_, i) => placement(String(i), 1, 1)),
  },
};

export const SinglePhoto: Story = {
  args: {
    placements: [placement("1", 4, 2)],
  },
};

export const PositionedWithGaps: Story = {
  args: {
    placements: [
      { ...placement("1", 2, 1), gridColumn: 3, gridRow: 1 },
      { ...placement("2", 2, 2), gridColumn: 1, gridRow: 3 },
      { ...placement("3", 1, 1), gridColumn: 4, gridRow: 5 },
    ],
  },
};

export const WithTextBlocks: Story = {
  args: {
    placements: [
      textPlacement("1", 2, 1),
      placement("2", 2, 2),
      placement("3", 2, 1),
      textPlacement("4", 2, 1),
    ],
  },
};

// forceGrid: an admin-authored mobile-override chapter renders as a real
// positioned grid unconditionally — not the portrait single-column
// flatten every other chapter (no override) gets on a narrow viewport.
// Storybook's own iframe is typically desktop-wide, so this doesn't prove
// much about narrow rendering on its own — the meaningful check is that
// forceGrid produces the exact same DOM/classes as gallery-wide would,
// which the Playwright coverage under e2e/ verifies on a real narrow
// viewport.
export const MobileOverrideForcedGrid: Story = {
  args: {
    forceGrid: true,
    placements: [
      { ...placement("1", 2, 1), gridColumn: 3, gridRow: 1 },
      { ...placement("2", 2, 2), gridColumn: 1, gridRow: 3 },
      { ...placement("3", 1, 1), gridColumn: 4, gridRow: 5 },
    ],
  },
};
