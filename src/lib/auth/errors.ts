import { CredentialsSignin } from "next-auth";

/**
 * Thrown from the Credentials provider's `authorize()` when the password
 * checked out but the account has TOTP enabled and no code was submitted
 * yet. `CredentialsSignin` subclasses propagate uncaught through Auth.js's
 * callback handler, which writes `.code` into the sign-in redirect's `code`
 * query param — `next-auth/react`'s `signIn(..., { redirect: false })` reads
 * that same param back into its returned result, so the client can check
 * `result.code === "requires-2fa"` to reveal the code field, with no extra
 * pre-login endpoint needed.
 */
export class RequiresTwoFactorError extends CredentialsSignin {
  code = "requires-2fa";
}
