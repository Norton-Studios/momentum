import crypto from "node:crypto";
import bcrypt from "bcrypt";

export const SALT_ROUNDS = 10;

/**
 * Generates a secure random password that meets security requirements
 */
export function generateSecurePassword(): string {
  const PASSWORD_LENGTH = 16;
  const LOWERCASE_CHARS = "abcdefghijklmnopqrstuvwxyz";
  const UPPERCASE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const NUMERIC_CHARS = "0123456789";
  const SPECIAL_CHARS = "!@#$%^&*()_+-=";
  const PASSWORD_CHARSET = LOWERCASE_CHARS + UPPERCASE_CHARS + NUMERIC_CHARS + SPECIAL_CHARS;
  let password = "";
  const randomBytes = crypto.randomBytes(PASSWORD_LENGTH);

  // Ensure at least one of each type
  const requirements = [LOWERCASE_CHARS, UPPERCASE_CHARS, NUMERIC_CHARS, SPECIAL_CHARS];

  requirements.forEach((req, index) => {
    password += req[randomBytes[index] % req.length];
  });

  // Fill the rest randomly
  for (let i = requirements.length; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARSET[randomBytes[i] % PASSWORD_CHARSET.length];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

/**
 * Generates a cryptographically secure API token
 */
export function generateApiToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Hashes a password using bcrypt with the standard salt rounds
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}
