import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { generateTotpSecret, buildQrDataUri } from "@/lib/auth/totp";

// Generates a fresh secret + QR code but writes nothing to the DB — the
// admin confirms a scanned code first (POST /api/admin/2fa/confirm), which
// round-trips the secret back so it's only ever persisted once verified.
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { secret, otpauthUri } = generateTotpSecret(session.user.email);
  const qrDataUri = await buildQrDataUri(otpauthUri);

  return NextResponse.json({ secret, qrDataUri });
}
