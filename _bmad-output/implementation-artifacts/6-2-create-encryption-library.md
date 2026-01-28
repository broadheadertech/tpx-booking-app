# Story 6.2: Create Encryption Library

Status: done

## Story

As a **developer**,
I want **an encryption library for securely storing API keys**,
So that **PayMongo credentials are encrypted at rest using AES-256-GCM**.

## Acceptance Criteria

1. **Given** the system needs to encrypt PayMongo API keys
   **When** I create `convex/lib/encryption.ts`
   **Then** it exports `encryptApiKey(plaintext, key)` returning `{ encrypted, iv }`

2. **Given** the encryption library exists
   **When** I call `decryptApiKey(encrypted, iv, key)`
   **Then** it returns the original plaintext

3. **Given** the encryption implementation
   **When** I verify the algorithm
   **Then** it uses AES-256-GCM algorithm

4. **Given** encryption is performed
   **When** I inspect the IV generation
   **Then** IV is randomly generated (16 bytes) for each encryption

5. **Given** the encryption key source
   **When** I check the configuration
   **Then** the encryption key is read from `PAYMONGO_ENCRYPTION_KEY` environment variable

6. **Given** encrypted data
   **When** I decrypt it with correct key
   **Then** decryption correctly recovers the original plaintext

## Tasks / Subtasks

- [x] Task 1: Create encryption library file (AC: #1, #3, #4)
  - [x] 1.1 Create `convex/lib/` directory if not exists
  - [x] 1.2 Create `encryption.ts` with AES-256-GCM implementation
  - [x] 1.3 Export `encryptApiKey()` function
  - [x] 1.4 Generate random 16-byte IV per encryption
- [x] Task 2: Implement decryption (AC: #2, #6)
  - [x] 2.1 Export `decryptApiKey()` function
  - [x] 2.2 Verify roundtrip encryption/decryption works
- [x] Task 3: Environment variable integration (AC: #5)
  - [x] 3.1 Document `PAYMONGO_ENCRYPTION_KEY` requirement
  - [x] 3.2 Add key to .env.local (test value only)

## Dev Notes

### Implementation from Architecture

**File:** `convex/lib/encryption.ts`

**Functions:**
```typescript
// Encrypt API key for storage
export function encryptApiKey(
  plaintext: string,
  encryptionKey: string
): { encrypted: string; iv: string }

// Decrypt API key for use (server-side only)
export function decryptApiKey(
  encrypted: string,
  iv: string,
  encryptionKey: string
): string
```

**Algorithm Requirements:**
- AES-256-GCM (Galois/Counter Mode)
- 256-bit key (32 bytes)
- 16-byte random IV per encryption
- Authenticated encryption (prevents tampering)

**Environment Variable:**
```
PAYMONGO_ENCRYPTION_KEY=<32-byte-hex-or-base64-key>
```

### Usage Pattern (from architecture)
```typescript
// Encrypt on save (in mutations)
const { encrypted, iv } = encryptApiKey(
  args.secret_key,
  process.env.PAYMONGO_ENCRYPTION_KEY!
);

// Decrypt on use (in actions only)
const secretKey = decryptApiKey(
  config.secret_key_encrypted,
  config.encryption_iv,
  process.env.PAYMONGO_ENCRYPTION_KEY!
);
```

### Security Requirements

| Aspect | Requirement |
|--------|-------------|
| Algorithm | AES-256-GCM |
| Key Storage | `PAYMONGO_ENCRYPTION_KEY` env var |
| IV Generation | Random 16 bytes per encryption |
| Decryption Access | Actions only (server-side) |

### Node.js Crypto Implementation

Uses Node.js built-in `crypto` module:
- `crypto.createCipheriv()` for encryption
- `crypto.createDecipheriv()` for decryption
- `crypto.randomBytes()` for IV generation

### References

- [Source: architecture-paymongo.md#encryption-decryption-patterns]
- [Source: prd-paymongo.md#FR23] - Encrypted API key storage
- [Source: NFR5] - AES-256 encryption requirement

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None - clean implementation_

### Completion Notes List

1. Created `convex/lib/` directory and `encryption.ts` file
2. Implemented `encryptApiKey()` with AES-256-GCM encryption
3. Implemented `decryptApiKey()` for server-side decryption
4. Added `generateEncryptionKey()` utility for key generation
5. Added `isValidEncryptionKey()` validation helper
6. Uses Node.js `crypto` module (built-in)
7. 16-byte random IV per encryption operation
8. Auth tag appended to encrypted data for tamper detection
9. Added `PAYMONGO_ENCRYPTION_KEY` to .env.local (test value)
10. Build verified successful with `npm run build`

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | convex/lib/encryption.ts with AES-256-GCM |
| 2026-01-27 | Added | PAYMONGO_ENCRYPTION_KEY to .env.local |
| 2026-01-27 | Verified | Build passed successfully |

### File List

- `convex/lib/encryption.ts` (new)
- `.env.local` (modified - added PAYMONGO_ENCRYPTION_KEY)
