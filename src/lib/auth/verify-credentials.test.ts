import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyCredentials } from "./verify-credentials";

vi.mock("@/lib/db", () => ({
  prisma: {
    admin: {
      findUnique: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const findUnique = vi.mocked(prisma.admin.findUnique);

describe("verifyCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
  });

  it("returns null for malformed input", async () => {
    await expect(
      verifyCredentials({ email: "not-an-email", password: "" }),
    ).resolves.toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns null when no admin matches the email", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      verifyCredentials({ email: "nobody@example.com", password: "whatever" }),
    ).resolves.toBeNull();
  });

  it("returns null when the password doesn't match", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "admin_1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      verifyCredentials({ email: "admin@example.com", password: "wrong-password" }),
    ).resolves.toBeNull();
  });

  it("returns the admin identity when credentials are correct", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({
      id: "admin_1",
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      verifyCredentials({ email: "admin@example.com", password: "correct-password" }),
    ).resolves.toEqual({ id: "admin_1", email: "admin@example.com", name: "Admin" });
  });
});
