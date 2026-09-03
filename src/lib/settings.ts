import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

/** The single SiteSettings row, created on demand if it doesn't exist yet
 * (e.g. a fresh DB that skipped the seed). Falls back to a plain read on a
 * unique-constraint race — e.g. multiple pages statically generating at
 * once, all finding no row and racing to create it. */
export async function getSiteSettings() {
  try {
    return await prisma.siteSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return prisma.siteSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    }
    throw error;
  }
}
