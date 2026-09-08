import bcrypt from "bcryptjs";
import * as OTPAuth from "otpauth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyCredentials } from "./verify-credentials";

vi.mock("@/lib/db", () => ({
  prisma: {
    admin: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const findUnique = vi.mocked(prisma.admin.findUnique);
const update = vi.mocked(prisma.admin.update);

const BASE_ADMIN = {
  id: "admin_1",
  email: "admin@example.com",
  name: "Admin",
  totpSecret: null as string | null,
  totpEnabled: false,
  totpLastUsedStep: null as number | null,
  backupCodes: [] as string[],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function currentTotpToken(base32Secret: string) {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
  return totp.generate();
}

describe("verifyCredentials", () => {
  beforeEach(() => {
    findUnique.mockReset();
    update.mockReset();
  });

  it("returns invalid for malformed input", async () => {
    await expect(
      verifyCredentials({ email: "not-an-email", password: "" }),
    ).resolves.toEqual({ status: "invalid" });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("returns invalid when no admin matches the email", async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      verifyCredentials({ email: "nobody@example.com", password: "whatever" }),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("returns invalid when the password doesn't match", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({ ...BASE_ADMIN, passwordHash });

    await expect(
      verifyCredentials({ email: "admin@example.com", password: "wrong-password" }),
    ).resolves.toEqual({ status: "invalid" });
  });

  it("returns ok with the admin identity when 2FA is off", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 4);
    findUnique.mockResolvedValue({ ...BASE_ADMIN, passwordHash });

    await expect(
      verifyCredentials({ email: "admin@example.com", password: "correct-password" }),
    ).resolves.toEqual({
      status: "ok",
      admin: { id: "admin_1", email: "admin@example.com", name: "Admin" },
    });
  });

  describe("with 2FA enabled", () => {
    const secret = new OTPAuth.Secret({ size: 20 }).base32;

    it("returns requires-2fa when no code is submitted", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      findUnique.mockResolvedValue({
        ...BASE_ADMIN,
        passwordHash,
        totpEnabled: true,
        totpSecret: secret,
      });

      await expect(
        verifyCredentials({ email: "admin@example.com", password: "correct-password" }),
      ).resolves.toEqual({ status: "requires-2fa" });
    });

    it("accepts a valid TOTP code and records its step", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      findUnique.mockResolvedValue({
        ...BASE_ADMIN,
        passwordHash,
        totpEnabled: true,
        totpSecret: secret,
      });

      const token = currentTotpToken(secret);
      await expect(
        verifyCredentials({
          email: "admin@example.com",
          password: "correct-password",
          code: token,
        }),
      ).resolves.toEqual({
        status: "ok",
        admin: { id: "admin_1", email: "admin@example.com", name: "Admin" },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "admin_1" },
        data: { totpLastUsedStep: expect.any(Number) },
      });
    });

    it("rejects replaying an already-used step", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      const currentStep = Math.floor(Date.now() / 1000 / 30);
      findUnique.mockResolvedValue({
        ...BASE_ADMIN,
        passwordHash,
        totpEnabled: true,
        totpSecret: secret,
        totpLastUsedStep: currentStep,
      });

      const token = currentTotpToken(secret);
      await expect(
        verifyCredentials({
          email: "admin@example.com",
          password: "correct-password",
          code: token,
        }),
      ).resolves.toEqual({ status: "invalid-code" });
    });

    it("rejects an invalid code", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      findUnique.mockResolvedValue({
        ...BASE_ADMIN,
        passwordHash,
        totpEnabled: true,
        totpSecret: secret,
      });

      await expect(
        verifyCredentials({
          email: "admin@example.com",
          password: "correct-password",
          code: "000000",
        }),
      ).resolves.toEqual({ status: "invalid-code" });
    });

    it("accepts a valid backup code and consumes it", async () => {
      const passwordHash = await bcrypt.hash("correct-password", 4);
      const backupHash = await bcrypt.hash("ABCDE-FGHJK", 4);
      findUnique.mockResolvedValue({
        ...BASE_ADMIN,
        passwordHash,
        totpEnabled: true,
        totpSecret: secret,
        backupCodes: [backupHash, "other-hash"],
      });

      await expect(
        verifyCredentials({
          email: "admin@example.com",
          password: "correct-password",
          code: "ABCDE-FGHJK",
        }),
      ).resolves.toEqual({
        status: "ok",
        admin: { id: "admin_1", email: "admin@example.com", name: "Admin" },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: "admin_1" },
        data: { backupCodes: ["other-hash"] },
      });
    });
  });
});
