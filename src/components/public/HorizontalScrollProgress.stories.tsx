import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { HorizontalScrollProgress } from "./HorizontalScrollProgress";

const meta = {
  title: "Public/HorizontalScrollProgress",
  component: HorizontalScrollProgress,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof HorizontalScrollProgress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Start: Story = { args: { progress: 0 } };
export const Midway: Story = { args: { progress: 0.5 } };
export const End: Story = { args: { progress: 1 } };
export const OutOfRangeIsClamped: Story = { args: { progress: 1.4 } };
