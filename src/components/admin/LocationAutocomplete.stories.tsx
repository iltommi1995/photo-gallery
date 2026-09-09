import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { LocationAutocomplete } from "./LocationAutocomplete";

const meta = {
  title: "Admin/LocationAutocomplete",
  component: LocationAutocomplete,
  args: { onChange: () => {} },
} satisfies Meta<typeof LocationAutocomplete>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  args: { value: "" },
};

export const Prefilled: Story = {
  args: { value: "Montenegro" },
};

export const Interactive: Story = {
  args: { value: "" },
  render: (args) => {
    function Wrapper() {
      const [value, setValue] = useState(args.value);
      return <LocationAutocomplete {...args} value={value} onChange={setValue} />;
    }
    return <Wrapper />;
  },
};
