import { createHash } from "crypto";

/**
 * Hash a password using SHA-256 with salt
 * In production, use bcrypt or Argon2 for better security
 */
export function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || "default-salt-change-in-production";
  return createHash("sha256").update(password + salt).digest("hex");
}

/**
 * Verify a password against its hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Generate a secure random salt
 */
export function generateSalt(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
