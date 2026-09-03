import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    siteSettings: {
      upsert: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
  },
}));

const { prisma } = await import("@/lib/db");
const { getSiteSettings } = await import("./settings");

const upsert = vi.mocked(prisma.siteSettings.upsert);
const findUniqueOrThrow = vi.mocked(prisma.siteSettings.findUniqueOrThrow);

describe("getSiteSettings", () => {
  beforeEach(() => {
    upsert.mockReset();
    findUniqueOrThrow.mockReset();
  });

  it("returns the upserted row on the normal path", async () => {
    const row = { id: "singleton", siteTitle: "Photography" };
    upsert.mockResolvedValue(row as never);

    await expect(getSiteSettings()).resolves.toBe(row);
    expect(findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("falls back to a plain read when two callers race to create the row", async () => {
    const raceError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      {
        code: "P2002",
        clientVersion: "test",
      },
    );
    upsert.mockRejectedValue(raceError);
    const row = { id: "singleton", siteTitle: "Photography" };
    findUniqueOrThrow.mockResolvedValue(row as never);

    await expect(getSiteSettings()).resolves.toBe(row);
  });

  it("re-throws errors that aren't a unique-constraint race", async () => {
    upsert.mockRejectedValue(new Error("connection refused"));
    await expect(getSiteSettings()).rejects.toThrow("connection refused");
  });
});
