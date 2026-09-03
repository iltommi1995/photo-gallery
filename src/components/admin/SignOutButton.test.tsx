import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const signOut = vi.fn();
vi.mock("next-auth/react", () => ({ signOut }));

const { SignOutButton } = await import("./SignOutButton");

describe("SignOutButton", () => {
  it("signs out and redirects to the login page when clicked", async () => {
    const user = userEvent.setup();
    render(<SignOutButton />);

    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/admin/login" });
  });
});
