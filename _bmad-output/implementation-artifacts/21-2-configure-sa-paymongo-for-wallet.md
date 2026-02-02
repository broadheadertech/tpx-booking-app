# Story 21.2: Configure Super Admin PayMongo for Wallet

Status: done

## Story

As a **Super Admin**,
I want to configure a dedicated PayMongo account for wallet top-ups,
So that all wallet deposits flow to a central account I control.

## Acceptance Criteria

1. **Given** I am logged in as Super Admin
   **When** I navigate to the Wallet Configuration panel
   **Then** I see fields for PayMongo Public Key, Secret Key, and Webhook Secret

2. **Given** I enter valid PayMongo credentials
   **When** I save the configuration
   **Then** the credentials are encrypted before storage
   **And** I see a success confirmation message
   **And** the test mode toggle is available

3. **Given** the wallet config already exists
   **When** I update the credentials
   **Then** the existing record is updated (not duplicated)
   **And** updated_at timestamp is refreshed

4. **Given** I toggle test mode
   **When** I save
   **Then** the is_test_mode flag is updated
   **And** the system uses appropriate PayMongo environment

## Tasks / Subtasks

- [x] Task 1: Create walletConfig service file (AC: #1, #2, #3)
  - [x] Create `convex/services/walletConfig.ts`
  - [x] Implement `getWalletConfig` query (super_admin only)
  - [x] Implement `updateWalletConfig` mutation with encryption
  - [x] Use `encryptApiKey` from `convex/lib/encryption.ts`
  - [x] Handle create vs update (upsert pattern)
  - [x] Set timestamps (created_at, updated_at)

- [x] Task 2: Create WalletConfigPanel UI component (AC: #1, #4)
  - [x] Create `src/components/admin/WalletConfigPanel.jsx`
  - [x] Add input fields for: Public Key, Secret Key, Webhook Secret
  - [x] Add test mode toggle switch
  - [x] Show masked secret key when editing (security)
  - [x] Use skeleton loader for loading state

- [x] Task 3: Implement save functionality (AC: #2, #3, #4)
  - [x] Call updateWalletConfig mutation on save
  - [x] Show success toast notification
  - [x] Handle validation errors
  - [x] Prevent double-submit with button disabled state

- [x] Task 4: Add role-based access control (AC: #1)
  - [x] Check super_admin role before rendering panel
  - [x] Return 403 or redirect if not authorized
  - [x] Add to Super Admin dashboard navigation

- [x] Task 5: Export service and validate deployment
  - [x] Add walletConfig to `convex/services/index.ts`
  - [x] Run `npx convex dev` to deploy
  - [x] Test full flow in browser

## Dev Notes

### Architecture Compliance (MANDATORY)

**Source:** [architecture-multi-branch-wallet.md](_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#implementation-patterns)

The service must follow these patterns:

**Query/Mutation Naming:**
| Type | Pattern | Example |
|------|---------|---------|
| Get config | `getWalletConfig` | Returns single config or null |
| Update config | `updateWalletConfig` | Upsert with encryption |

**Encryption Pattern (CRITICAL):**
```typescript
// MUST use existing encryption library
import { encryptApiKey, decryptApiKey } from "../lib/encryption";

// Encrypt secrets before storage
const { encrypted: secretKeyEncrypted, iv: secretKeyIv } = await encryptApiKey(
  args.secret_key,
  process.env.PAYMONGO_ENCRYPTION_KEY!
);

// Store encrypted values
await ctx.db.insert("walletConfig", {
  paymongo_public_key: args.public_key,  // Public key - not encrypted
  paymongo_secret_key: secretKeyEncrypted,
  paymongo_secret_key_iv: iv,            // Store IV for decryption
  paymongo_webhook_secret: webhookEncrypted,
  paymongo_webhook_secret_iv: webhookIv,
  // ... other fields
});
```

**NOTE:** The schema has `paymongo_secret_key` as v.string(). You will need to store the encrypted value AND IV. Options:
1. Store IV in a separate field (add `_iv` fields to schema OR)
2. Combine encrypted + IV in single string (e.g., `iv:encrypted` format)

Recommend option 2 to avoid schema changes: `${iv}:${encrypted}`

### Previous Story Intelligence

**From Story 21.1:**
- walletConfig table already exists in schema at [convex/schema.ts:2451-2461](convex/schema.ts#L2451-L2461)
- Schema structure:
  ```typescript
  walletConfig: defineTable({
    paymongo_public_key: v.string(),
    paymongo_secret_key: v.string(), // Encrypted at service layer
    paymongo_webhook_secret: v.string(), // Encrypted at service layer
    is_test_mode: v.boolean(),
    default_commission_percent: v.number(),
    default_settlement_frequency: v.string(),
    min_settlement_amount: v.number(),
    created_at: v.number(),
    updated_at: v.number(),
  }),
  ```
- No indexes on walletConfig (singleton table)
- Convex deployment verified working

### Existing Code to Reuse

**Encryption Library:**
- Location: [convex/lib/encryption.ts](convex/lib/encryption.ts)
- Functions: `encryptApiKey(plaintext, encryptionKey)` → `{ encrypted, iv }`
- Functions: `decryptApiKey(encrypted, iv, encryptionKey)` → plaintext
- Env var: `PAYMONGO_ENCRYPTION_KEY` (32 bytes hex)

**Existing PayMongo Service Pattern:**
- Location: [convex/services/paymongo.ts](convex/services/paymongo.ts)
- Reference for action patterns using PayMongo API
- Note: This story only creates config CRUD, not PayMongo API calls

### Project Context Rules (CRITICAL)

**Source:** [project-context.md](_bmad-output/planning-artifacts/project-context.md)

**Data Types:**
- **Currency**: Store as integers (500 = ₱500) - applies to min_settlement_amount
- **Dates**: Unix timestamps in milliseconds via `Date.now()`
- **Percentages**: Store as integers (5 = 5%) - applies to default_commission_percent

**Service Pattern:**
```typescript
// convex/services/walletConfig.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { encryptApiKey } from "../lib/encryption";

export const getWalletConfig = query({
  args: {},
  handler: async (ctx) => {
    // TODO: Check if user is super_admin
    const config = await ctx.db.query("walletConfig").first();
    if (!config) return null;

    // Return config with masked secret keys
    return {
      ...config,
      paymongo_secret_key: "••••••••", // Never expose encrypted value to frontend
      paymongo_webhook_secret: "••••••••",
    };
  },
});

export const updateWalletConfig = mutation({
  args: {
    public_key: v.string(),
    secret_key: v.string(),
    webhook_secret: v.string(),
    is_test_mode: v.boolean(),
    default_commission_percent: v.number(),
    default_settlement_frequency: v.string(),
    min_settlement_amount: v.number(),
  },
  handler: async (ctx, args) => {
    // TODO: Check if user is super_admin

    // Encrypt secrets
    const encryptionKey = process.env.PAYMONGO_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new ConvexError({
        code: "CONFIG_ERROR",
        message: "Encryption key not configured",
      });
    }

    // ... encryption and upsert logic
  },
});
```

**Component Pattern:**
```jsx
// src/components/admin/WalletConfigPanel.jsx
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function WalletConfigPanel() {
  const config = useQuery(api.services.walletConfig.getWalletConfig);
  const updateConfig = useMutation(api.services.walletConfig.updateWalletConfig);

  if (config === undefined) return <Skeleton />; // Loading state

  return <div>...</div>;
}
```

**Error Handling:**
```typescript
import { ConvexError } from "convex/values";

throw new ConvexError({
  code: "CONFIG_NOT_FOUND",
  message: "Wallet configuration not set up",
});
```

### File Structure Requirements

**New Files to Create:**

| File | Purpose |
|------|---------|
| `convex/services/walletConfig.ts` | Service with getWalletConfig and updateWalletConfig |
| `src/components/admin/WalletConfigPanel.jsx` | UI for SA to configure PayMongo |

**Files to Modify:**

| File | Changes |
|------|---------|
| `convex/services/index.ts` | Export walletConfig service |

### UI/UX Requirements

**Source:** [project-context.md](_bmad-output/planning-artifacts/project-context.md#uistyling)

- Theme: Dark (#0A0A0A background) with orange accent (#FF8C42)
- Use shadcn/ui components
- Mobile touch targets: minimum 44px
- Loading: Skeleton loaders, NOT spinners
- Mask secret keys in display (show "••••••••")
- Show success toast on save

### Access Control

| Action | Required Role |
|--------|---------------|
| View wallet config | super_admin |
| Update wallet config | super_admin |

### Anti-Patterns to AVOID

- ❌ Exposing encrypted secrets to frontend (show masked only)
- ❌ Storing plaintext secret keys
- ❌ Creating duplicate config records (use upsert)
- ❌ Using spinners instead of skeleton loaders
- ❌ Hardcoding encryption key (use env var)
- ❌ Skipping role check for super_admin

### Testing Verification

After implementation:
1. Log in as super_admin
2. Navigate to Wallet Config panel
3. Enter PayMongo credentials (test mode)
4. Save and verify success toast
5. Refresh page - credentials should persist (masked)
6. Toggle test mode and save
7. Check Convex dashboard - single walletConfig record
8. Verify non-super_admin cannot access panel

### Project Structure Notes

- Service file: `convex/services/walletConfig.ts` (new file)
- Component: `src/components/admin/WalletConfigPanel.jsx` (new file in admin folder)
- Export: Add to `convex/services/index.ts`
- Follows role-based component organization (admin/ folder)

### References

- [Architecture Document - Wallet Config Service](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#new-files-for-multi-branch-wallet-feature)
- [Architecture Document - Encryption Pattern](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#authentication--security)
- [Existing Encryption Library](convex/lib/encryption.ts)
- [Project Context - Service Pattern](../_bmad-output/planning-artifacts/project-context.md#framework-specific-rules)
- [Epics Document - Story 1.2](../_bmad-output/planning-artifacts/epics-multi-branch-wallet.md#story-12-configure-super-admin-paymongo-for-wallet)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with no errors.

### Completion Notes List

1. **walletConfig service created** with full encryption support using existing `encryptApiKey` from `convex/lib/encryption.ts`
2. **iv:encrypted format implemented** - stores IV and encrypted value in single string field to avoid schema changes
3. **Upsert pattern implemented** - checks if config exists, creates or updates accordingly
4. **"___UNCHANGED___" marker handling** - UI sends this marker when user leaves secret fields empty; service preserves existing encrypted values
5. **Role-based access control** - uses `checkRole(ctx, "super_admin")` from `convex/services/rbac.ts`
6. **Masked secrets** - `getWalletConfig` returns "••••••••" for secret fields, never exposing encrypted values
7. **UI component created** with dark theme (#1A1A1A), orange accent (#FF8C42), skeleton loading, test mode toggle
8. **Form validation** - prevents save with empty required fields, shows inline error messages
9. **Convex deployment verified** - `npx convex dev --once` completed successfully

### File List

- [convex/services/walletConfig.ts](convex/services/walletConfig.ts) (created - 200 lines)
- [src/components/admin/WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx) (created - 375 lines)
- [convex/services/index.ts](convex/services/index.ts) (modified - added walletConfig export at line 36)

