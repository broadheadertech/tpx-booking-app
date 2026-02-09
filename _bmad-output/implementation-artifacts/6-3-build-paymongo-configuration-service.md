# Story 6.3: Build PayMongo Configuration Service

Status: done

## Story

As a **branch admin**,
I want **backend services to save and retrieve PayMongo configuration**,
So that **I can configure payment settings and the system can securely access them**.

## Acceptance Criteria

1. **Given** a branch admin wants to save PayMongo configuration
   **When** they call the `savePaymentConfig` mutation
   **Then** the system encrypts the API keys using the encryption library
   **And** stores the encrypted credentials in `branchPaymentConfig`
   **And** validates that the branch_id matches the admin's branch (FR25, FR26)
   **And** returns success confirmation

2. **Given** the system needs to retrieve payment configuration
   **When** a query `getPaymentConfig` is called with branch_id
   **Then** it returns the config for that branch only (branch isolation - FR25)
   **And** encrypted fields are NOT decrypted in queries (server-side only - NFR6)

3. **Given** an action needs the decrypted API keys
   **When** `getDecryptedConfig` action is called
   **Then** it decrypts the keys server-side
   **And** never exposes plaintext keys to frontend

## Tasks / Subtasks

- [x] Task 1: Implement savePaymentConfig mutation (AC: #1)
  - [x] 1.1 Add mutation to paymongo.ts
  - [x] 1.2 Encrypt API keys using encryption library
  - [x] 1.3 Store in branchPaymentConfig table
  - [x] 1.4 Add validation (payment options, fee range)
- [x] Task 2: Implement getPaymentConfig query (AC: #2)
  - [x] 2.1 Add query to paymongo.ts
  - [x] 2.2 Filter by branch_id (branch isolation)
  - [x] 2.3 Return config WITHOUT decrypting keys
- [x] Task 3: Implement getDecryptedConfig action (AC: #3)
  - [x] 3.1 Add action to paymongo.ts
  - [x] 3.2 Decrypt keys server-side only
  - [x] 3.3 Return decrypted config for API calls
- [x] Task 4: Deploy and verify
  - [x] 4.1 Run npx convex dev
  - [x] 4.2 Verify no errors

## Dev Notes

### Functions to Implement

```typescript
// Mutation: Save payment configuration (encrypts keys)
savePaymentConfig({
  branch_id,
  public_key,      // plaintext - will be encrypted
  secret_key,      // plaintext - will be encrypted
  webhook_secret,  // plaintext - will be encrypted
  pay_now_enabled,
  pay_later_enabled,
  pay_at_shop_enabled,
  convenience_fee_percent,
  updated_by
})

// Query: Get payment configuration (encrypted - safe for frontend)
getPaymentConfig({ branch_id }) → config | null

// Action: Get decrypted configuration (server-side only)
getDecryptedConfig({ branch_id }) → {
  public_key,      // decrypted
  secret_key,      // decrypted
  webhook_secret,  // decrypted
  ...otherFields
}
```

### Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| FR25 - Branch isolation | All queries filter by branch_id |
| FR26 - RBAC | Only branch_admin/super_admin can save |
| NFR5 - Encryption | Use convex/lib/encryption.ts |
| NFR6 - Server-only keys | Decrypt only in actions, never queries |

### References

- [Source: architecture-paymongo.md#paymongo-service-architecture]
- [Source: prd-paymongo.md#FR8] - Save API keys
- [Source: prd-paymongo.md#FR23] - Encrypted storage
- [Source: prd-paymongo.md#FR25] - Branch isolation
- [Source: prd-paymongo.md#FR26] - RBAC

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Initial deploy failed: Node.js `crypto` module not supported in Convex runtime
- Fixed by rewriting encryption.ts to use Web Crypto API
- TypeScript errors fixed with BufferSource type casts

### Completion Notes List

1. Added `savePaymentConfig` mutation - encrypts and stores API keys
2. Added `getPaymentConfig` query - returns config without decrypted keys
3. Added `getDecryptedConfig` action - server-side decryption for API calls
4. Added `getPaymentConfigInternal` query - internal use by action
5. Added `togglePaymentConfig` mutation - enable/disable config
6. Updated encryption.ts to use Web Crypto API (Convex compatible)
7. Added paymongo export to services/index.ts
8. All functions use branch_id filtering (FR25 - branch isolation)
9. Decryption only in actions (NFR6 - server-only keys)
10. Deployment successful

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Added | savePaymentConfig mutation |
| 2026-01-27 | Added | getPaymentConfig query |
| 2026-01-27 | Added | getDecryptedConfig action |
| 2026-01-27 | Added | getPaymentConfigInternal query |
| 2026-01-27 | Added | togglePaymentConfig mutation |
| 2026-01-27 | Fixed | encryption.ts - Web Crypto API |
| 2026-01-27 | Deployed | Convex functions ready |

### File List

- `convex/services/paymongo.ts` (modified - added 5 functions)
- `convex/services/index.ts` (modified - added paymongo export)
- `convex/lib/encryption.ts` (modified - Web Crypto API)
