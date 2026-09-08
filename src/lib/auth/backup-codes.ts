import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

// Excludes 0/O/1/I/L — avoids transcription mistakes if an admin ever has to
// read a code aloud or type it from a printout instead of copy-pasting.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 10;
const DEFAULT_COUNT = 8;
// Lower than passwordHash's cost (12, see prisma/seed.ts) — these are
// high-entropy machine-generated strings, not user-chosen passwords, so slow
// hashing buys little extra resistance while directly costing request
// latency on every failed/backup-code login attempt.
const BACKUP_CODE_BCRYPT_COST = 10;

function randomCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return `${raw.slice(0, 5)}-${raw.slice(5)}`;
}

export function generateBackupCodes(count = DEFAULT_COUNT): string[] {
  return Array.from({ length: count }, randomCode);
}

export function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, BACKUP_CODE_BCRYPT_COST)));
}

/**
 * Checks a submitted backup code against the stored hashes. Returns the
 * matched index so the caller can remove it from the array (one-time use),
 * or null if none matched.
 */
export async function verifyAndConsumeBackupCode(
  hashes: string[],
  code: string,
): Promise<number | null> {
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(code, hashes[i])) return i;
  }
  return null;
}
