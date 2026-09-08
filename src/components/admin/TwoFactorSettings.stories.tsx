import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { TwoFactorSettings } from "./TwoFactorSettings";

const meta = {
  title: "Admin/TwoFactorSettings",
  component: TwoFactorSettings,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Enable/disable authenticator-app 2FA and manage backup codes. The setup and password-confirmation dialogs call /api/admin/2fa/** and require an authenticated app session.",
      },
    },
  },
} satisfies Meta<typeof TwoFactorSettings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotEnabled: Story = {
  args: { initialEnabled: false },
};

export const Enabled: Story = {
  args: { initialEnabled: true },
};
