import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TwoFactorSettings } from "./TwoFactorSettings";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(() => vi.unstubAllGlobals());

describe("TwoFactorSettings", () => {
  it("shows the not-enabled state by default", () => {
    render(<TwoFactorSettings initialEnabled={false} />);
    expect(screen.getByText(/not enabled/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument();
  });

  it("shows the enabled state with management actions", () => {
    render(<TwoFactorSettings initialEnabled={true} />);
    expect(screen.getByText(/^enabled/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Regenerate backup codes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disable" })).toBeInTheDocument();
  });

  it("walks through setup and reveals backup codes once confirmed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith("/api/admin/2fa/setup")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              secret: "ABC123",
              qrDataUri: "data:image/png;base64,x",
            }),
          });
        }
        if (url.endsWith("/api/admin/2fa/confirm")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ backupCodes: ["AAAAA-BBBBB", "CCCCC-DDDDD"] }),
          });
        }
        throw new Error(`unexpected fetch to ${url}`);
      }),
    );

    const user = userEvent.setup();
    render(<TwoFactorSettings initialEnabled={false} />);

    await user.click(screen.getByRole("button", { name: "Enable" }));
    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();

    await user.type(screen.getByLabelText("6-digit code"), "123456");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByText("AAAAA-BBBBB")).toBeInTheDocument();
    expect(screen.getByText("CCCCC-DDDDD")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "I've saved these" }));
    expect(await screen.findByText(/^enabled/i)).toBeInTheDocument();
  });
});
