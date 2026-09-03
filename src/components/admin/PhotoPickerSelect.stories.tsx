import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { PhotoPickerSelect } from "./PhotoPickerSelect";

const PHOTOS = [
  { id: "1", filename: "milan-01.jpg", altText: "Duomo at dawn" },
  { id: "2", filename: "milan-02.jpg", altText: null },
  { id: "3", filename: "berlin-01.jpg", altText: "Cyclist in the rain" },
];

const meta = {
  title: "Admin/PhotoPickerSelect",
  component: PhotoPickerSelect,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PhotoPickerSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoSelection: Story = {
  args: { photos: PHOTOS, value: null, onChange: () => {} },
};

export const WithSelection: Story = {
  args: { photos: PHOTOS, value: "1", onChange: () => {} },
};

export const Interactive: Story = {
  args: { photos: PHOTOS, value: null, onChange: () => {} },
  render: () => {
    function Wrapper() {
      const [value, setValue] = useState<string | null>(null);
      return <PhotoPickerSelect photos={PHOTOS} value={value} onChange={setValue} />;
    }
    return <Wrapper />;
  },
};
