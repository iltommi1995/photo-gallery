import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

// Shown inside the authenticator app next to the account label — cosmetic
// only, doesn't need to match anything else in the app.
const ISSUER = "Photo Gallery Admin";
const ALGORITHM = "SHA1";
const DIGITS = 6;
const PERIOD = 30;
// ±1 time-step either side of "now" to tolerate clock drift between the
// server and the admin's phone — a code stays acceptable for up to ~90s.
const WINDOW = 1;

function totpInstance(secret: OTPAuth.Secret, label?: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label,
    algorithm: ALGORITHM,
    digits: DIGITS,
    period: PERIOD,
    secret,
  });
}

export function generateTotpSecret(email: string) {
  const totp = totpInstance(new OTPAuth.Secret({ size: 20 }), email);
  return { secret: totp.secret.base32, otpauthUri: totp.toString() };
}

// Rendered fully offline as a data URI — the secret never goes through a
// third-party QR image API.
export function buildQrDataUri(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { margin: 1, width: 256 });
}

/**
 * Verifies a submitted TOTP code against a base32 secret. Returns the
 * matched absolute time-step (for the caller to persist as a replay guard —
 * RFC 6238 explicitly calls out that a code stays valid, and therefore
 * replayable, for its whole acceptance window) or null if invalid.
 * `lastUsedStep` rejects a code whose step has already been accepted once.
 */
export function verifyTotpCode(
  base32Secret: string,
  token: string,
  lastUsedStep: number | null,
): number | null {
  const totp = totpInstance(OTPAuth.Secret.fromBase32(base32Secret));
  const delta = totp.validate({ token, window: WINDOW });
  if (delta === null) return null;

  const step = OTPAuth.TOTP.counter({ period: PERIOD }) + delta;
  if (lastUsedStep !== null && step <= lastUsedStep) return null;
  return step;
}
