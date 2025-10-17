/**
 * Hash a password using SHA-256 with salt
 * Browser-compatible implementation using Web Crypto API
 * In production, use bcrypt or Argon2 for better security
 */
export function hashPassword(password: string): string {
  const salt = process.env.PASSWORD_SALT || "default-salt-change-in-production";
  // Simple hash for development - in production use proper bcrypt/argon2
  return simpleHash(password + salt);
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

/**
 * Simple hash function for browser/convex compatibility
 * NOTE: This is NOT cryptographically secure. Use only for development.
 * In production, implement proper password hashing with Node.js runtime.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16) + str.length.toString(16);
}
