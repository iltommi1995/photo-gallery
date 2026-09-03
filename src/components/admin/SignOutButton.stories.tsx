import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { SignOutButton } from "./SignOutButton";

const meta = {
  title: "Admin/SignOutButton",
  component: SignOutButton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof SignOutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
