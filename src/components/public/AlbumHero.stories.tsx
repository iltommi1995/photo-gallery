import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AlbumHero } from "./AlbumHero";

const meta = {
  title: "Public/AlbumHero",
  component: AlbumHero,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof AlbumHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithCoverPhoto: Story = {
  args: {
    title: "Milan",
    coverPhoto: {
      id: "placeholder",
      altText: "Milan cathedral at dawn",
      blurDataUrl: null,
    },
  },
};

export const WithoutCoverPhoto: Story = {
  args: {
    title: "Untitled Album",
    coverPhoto: null,
  },
};
