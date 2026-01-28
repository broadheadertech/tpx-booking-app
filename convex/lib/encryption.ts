/**
 * Encryption Library for PayMongo API Key Storage
 *
 * Implements AES-256-GCM encryption for secure storage of PayMongo credentials.
 * Uses Web Crypto API for compatibility with Convex runtime.
 *
 * Security Features:
 * - AES-256-GCM authenticated encryption
 * - Random 12-byte IV per encryption (GCM standard)
 * - Authentication tag prevents tampering
 *
 * Usage:
 * - Encrypt: mutations that save API keys
 * - Decrypt: actions only (server-side)
 *
 * @see architecture-paymongo.md#encryption-decryption-patterns
 * @see FR23 - Encrypted API key storage requirement
 * @see NFR5 - AES-256 encryption requirement
 */

// AES-256-GCM configuration
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 12 bytes for GCM (96 bits - recommended for GCM)
const KEY_LENGTH = 256; // 256 bits for AES-256

/**
 * Converts a hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Converts Uint8Array to hex string
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Converts Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Converts base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Imports a hex encryption key for use with Web Crypto API
 */
async function importKey(hexKey: string): Promise<CryptoKey> {
  const keyBytes = hexToBytes(hexKey);
  if (keyBytes.length !== 32) {
    throw new Error(
      `Invalid encryption key length: expected 32 bytes (64 hex chars), got ${keyBytes.length} bytes`
    );
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes as BufferSource,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts an API key using AES-256-GCM
 *
 * @param plaintext - The API key to encrypt (e.g., pk_live_xxx, sk_live_xxx)
 * @param encryptionKey - 32-byte encryption key as hex string (from PAYMONGO_ENCRYPTION_KEY env var)
 * @returns Object containing encrypted data (base64) and IV (base64)
 *
 * @example
 * const { encrypted, iv } = await encryptApiKey(
 *   args.secret_key,
 *   process.env.PAYMONGO_ENCRYPTION_KEY!
 * );
 */
export async function encryptApiKey(
  plaintext: string,
  encryptionKey: string,
  existingIv?: string // Optional: use existing IV instead of generating new one
): Promise<{ encrypted: string; iv: string }> {
  // Import the encryption key
  const key = await importKey(encryptionKey);

  // Use existing IV or generate new one
  const iv = existingIv
    ? base64ToBytes(existingIv)
    : crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Encode plaintext to bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    plaintextBytes
  );

  // Convert to base64
  const encryptedBytes = new Uint8Array(encryptedBuffer);

  return {
    encrypted: bytesToBase64(encryptedBytes),
    iv: bytesToBase64(iv),
  };
}

/**
 * Decrypts an API key using AES-256-GCM
 *
 * IMPORTANT: This function should ONLY be called in Convex actions (server-side).
 * Never expose decrypted keys to frontend code (NFR6).
 *
 * @param encrypted - The encrypted data (base64)
 * @param iv - The initialization vector (base64)
 * @param encryptionKey - 32-byte encryption key as hex string (from PAYMONGO_ENCRYPTION_KEY env var)
 * @returns The original plaintext API key
 *
 * @example
 * const secretKey = await decryptApiKey(
 *   config.secret_key_encrypted,
 *   config.encryption_iv,
 *   process.env.PAYMONGO_ENCRYPTION_KEY!
 * );
 */
export async function decryptApiKey(
  encrypted: string,
  iv: string,
  encryptionKey: string
): Promise<string> {
  // Import the encryption key
  const key = await importKey(encryptionKey);

  // Decode from base64
  const encryptedBytes = base64ToBytes(encrypted);
  const ivBytes = base64ToBytes(iv);

  // Decrypt
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: ivBytes as BufferSource },
    key,
    encryptedBytes as BufferSource
  );

  // Decode to string
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Generates a new encryption key for PAYMONGO_ENCRYPTION_KEY
 *
 * This is a utility function for generating a secure 256-bit key.
 * Run this once to generate the key, then store it in your environment variables.
 *
 * @returns A 64-character hex string (32 bytes)
 *
 * @example
 * // Generate a new key (run once, then save to .env)
 * const newKey = generateEncryptionKey();
 * console.log(`PAYMONGO_ENCRYPTION_KEY=${newKey}`);
 */
export function generateEncryptionKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToHex(bytes);
}

/**
 * Validates that an encryption key is properly formatted
 *
 * @param key - The encryption key to validate
 * @returns True if valid, false otherwise
 */
export function isValidEncryptionKey(key: string | undefined): boolean {
  if (!key) return false;

  try {
    // Check hex format and length
    if (!/^[0-9a-fA-F]{64}$/.test(key)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
