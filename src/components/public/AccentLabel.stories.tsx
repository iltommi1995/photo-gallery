import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AccentLabel } from "./AccentLabel";

const meta = {
  title: "Public/AccentLabel",
  component: AccentLabel,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AccentLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PlaceName: Story = {
  args: {
    children: "Milan",
  },
};

export const ChapterYear: Story = {
  args: {
    children: "2018",
    as: "h2",
  },
};

export const OnPhotoBackground: Story = {
  args: {
    children: "Berlin",
  },
  decorators: [
    (Story) => (
      <div className="bg-portfolio-ink flex h-40 w-64 items-end p-6">
        <Story />
      </div>
    ),
  ],
};
