import { describe, it, expect } from "vitest";
import { generateSecurePassword, generateApiToken, hashPassword, SALT_ROUNDS } from "./auth-utils";
import bcrypt from "bcrypt";

describe("auth-utils", () => {
  describe("generateSecurePassword", () => {
    it("generates a password with correct length", () => {
      const password = generateSecurePassword();
      expect(password).toHaveLength(16);
    });

    it("generates different passwords each time", () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      expect(password1).not.toBe(password2);
    });

    it("generates passwords that meet security requirements", () => {
      const password = generateSecurePassword();

      // Check for at least one lowercase letter
      expect(password).toMatch(/[a-z]/);

      // Check for at least one uppercase letter
      expect(password).toMatch(/[A-Z]/);

      // Check for at least one number
      expect(password).toMatch(/\d/);

      // Check for at least one special character
      expect(password).toMatch(/[!@#$%^&*()_+\-=]/);
    });

    it("only contains allowed characters", () => {
      const password = generateSecurePassword();
      const allowedChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=]+$/;
      expect(password).toMatch(allowedChars);
    });
  });

  describe("generateApiToken", () => {
    it("generates a token with correct length", () => {
      const token = generateApiToken();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it("generates different tokens each time", () => {
      const token1 = generateApiToken();
      const token2 = generateApiToken();
      expect(token1).not.toBe(token2);
    });

    it("generates tokens with only hex characters", () => {
      const token = generateApiToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe("hashPassword", () => {
    it("hashes a password correctly", async () => {
      const plainPassword = "test123";
      const hashedPassword = await hashPassword(plainPassword);

      expect(hashedPassword).not.toBe(plainPassword);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
      expect(hashedPassword.startsWith("$2")).toBe(true); // bcrypt format
    });

    it("generates different hashes for the same password", async () => {
      const plainPassword = "test123";
      const hash1 = await hashPassword(plainPassword);
      const hash2 = await hashPassword(plainPassword);

      expect(hash1).not.toBe(hash2);
    });

    it("generates hashes that can be verified", async () => {
      const plainPassword = "test123";
      const hashedPassword = await hashPassword(plainPassword);

      const isValid = await bcrypt.compare(plainPassword, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await bcrypt.compare("wrongpassword", hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it("uses the correct salt rounds", async () => {
      const plainPassword = "test123";
      const hashedPassword = await hashPassword(plainPassword);

      // Extract salt rounds from bcrypt hash (format: $2[a/b/x/y]$rounds$salt+hash)
      const rounds = parseInt(hashedPassword.split("$")[2]);
      expect(rounds).toBe(SALT_ROUNDS);
    });
  });
});
