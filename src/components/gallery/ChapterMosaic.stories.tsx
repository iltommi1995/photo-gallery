import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ChapterMosaic, type MosaicPlacement } from "./ChapterMosaic";

function placement(id: string, size: MosaicPlacement["size"]): MosaicPlacement {
  return { id, size, photo: { id, altText: `Placeholder ${id}`, blurDataUrl: null } };
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
      placement("1", "FULL"),
      placement("2", "MEDIUM"),
      placement("3", "SMALL"),
      placement("4", "SMALL"),
      placement("5", "LARGE"),
      placement("6", "MEDIUM"),
    ],
  },
};

export const AllSmall: Story = {
  args: {
    placements: Array.from({ length: 8 }, (_, i) => placement(String(i), "SMALL")),
  },
};

export const SinglePhoto: Story = {
  args: {
    placements: [placement("1", "FULL")],
  },
};
