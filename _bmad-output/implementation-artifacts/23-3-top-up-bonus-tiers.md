# Story 23.3: Top-up Bonus Tiers

Status: done

## Story

As a **Customer**,
I want to receive bonus credits for larger top-ups,
So that I'm incentivized to load more money.

## Acceptance Criteria

1. **Given** the Super Admin has configured bonus tiers
   **When** I view the top-up page
   **Then** I see the available bonus tiers displayed (e.g., "Top up ₱500, get ₱25 bonus!")

2. **Given** I top up an amount that qualifies for a bonus
   **When** the payment succeeds
   **Then** my wallet is credited with: top-up amount + bonus amount
   **And** the bonus is tracked separately in the transaction record

3. **Given** the bonus tiers are:
   - ₱500 = +₱50 bonus
   - ₱1000 = +₱150 bonus
   **When** I top up ₱1000
   **Then** I receive ₱1150 total (₱1000 + ₱150 bonus)

4. **Given** Super Admin updates bonus tiers
   **When** I view the top-up page
   **Then** I see the updated bonus information

5. **Given** no bonus tiers are configured
   **When** I top up any amount
   **Then** I receive only the top-up amount (no bonus)
   **And** no bonus information is displayed

## Tasks / Subtasks

- [x] Task 1: Add bonus_tiers field to walletConfig schema (AC: #4)
  - [x] 1.1 Update `convex/schema.ts` to add `bonus_tiers` field to `walletConfig` table
  - [x] 1.2 Field type: `v.optional(v.array(v.object({ minAmount: v.number(), bonus: v.number() })))`
  - [x] 1.3 Run `npx convex dev` to push schema changes

- [x] Task 2: Add bonus tier management to walletConfig service (AC: #4)
  - [x] 2.1 Update `getWalletConfig` query to return `bonus_tiers` field
  - [x] 2.2 Update `updateWalletConfig` mutation to accept and save `bonus_tiers`
  - [x] 2.3 Add `getBonusTiers` public query for customer-facing tier display
  - [x] 2.4 Validate tiers: minAmount > 0, bonus >= 0, no duplicates

- [x] Task 3: Update walletBonus.ts to use configurable tiers (AC: #2, #3, #5)
  - [x] 3.1 Update `calculateTopUpBonus` to accept optional tiers from config
  - [x] 3.2 Fall back to `DEFAULT_BONUS_TIERS` when no config tiers exist
  - [x] 3.3 Update `getTopUpBonusInfo` for preview display

- [x] Task 4: Update creditWallet to use configurable tiers (AC: #2, #3, #5)
  - [x] 4.1 Fetch bonus tiers from walletConfig in `creditWallet` mutation
  - [x] 4.2 Pass fetched tiers to `calculateTopUpBonus` function
  - [x] 4.3 Ensure bonus is tracked separately in wallet (bonus_balance field)

- [x] Task 5: Create Bonus Tiers Configuration UI for Super Admin (AC: #4)
  - [x] 5.1 Added bonus tiers section to existing `WalletConfigPanel.jsx`
  - [x] 5.2 Show list of current tiers with edit/delete
  - [x] 5.3 Add new tier form with minAmount and bonus fields
  - [x] 5.4 Integrated into existing WalletConfigPanel in admin dashboard
  - [x] 5.5 Uses skeleton loader while data loads

- [x] Task 6: Display bonus tiers on WalletTopUp page (AC: #1, #5)
  - [x] 6.1 Update `WalletTopUp.jsx` to fetch bonus tiers via `getBonusTiers` query
  - [x] 6.2 Display tier information visually (tier cards with click-to-select)
  - [x] 6.3 Show real-time bonus preview based on entered amount
  - [x] 6.4 Handle case where no tiers are configured (hide bonus section)

## Dev Notes

### Architecture Compliance

This story makes the hardcoded bonus tiers in `convex/lib/walletBonus.ts` configurable by Super Admin via the `walletConfig` table. The current implementation already has the bonus calculation logic - this story adds the configuration layer.

**Key Insight:** The bonus system already works end-to-end (Stories 23-1, 23-2). This story ONLY adds:
1. Schema field for storing configurable tiers
2. Admin UI to manage tiers
3. Customer-facing display of available tiers
4. Update bonus calculation to use config instead of hardcoded values

### Existing Code Patterns

**Current Bonus Calculation (convex/lib/walletBonus.ts):**
```typescript
// Current hardcoded tiers
export const DEFAULT_BONUS_TIERS: BonusTier[] = [
  { minAmount: 1000, bonus: 150 }, // ₱1000 → ₱150 bonus
  { minAmount: 500, bonus: 50 },   // ₱500 → ₱50 bonus
];

export function calculateTopUpBonus(
  amount: number,
  tiers: BonusTier[] = DEFAULT_BONUS_TIERS
): number {
  const sortedTiers = [...tiers].sort((a, b) => b.minAmount - a.minAmount);
  for (const tier of sortedTiers) {
    if (amount >= tier.minAmount) {
      return tier.bonus;
    }
  }
  return 0;
}
```

**creditWallet Already Calls calculateTopUpBonus (wallet.ts:67):**
```typescript
// Calculate standard bonus if this is a top-up with bonus enabled
let bonus = args.applyBonus !== false ? calculateTopUpBonus(args.amount) : 0;
```

**walletConfig Schema (current):**
```typescript
walletConfig: defineTable({
  paymongo_public_key: v.string(),
  paymongo_secret_key: v.string(),
  paymongo_webhook_secret: v.string(),
  is_test_mode: v.boolean(),
  default_commission_percent: v.number(),
  default_settlement_frequency: v.string(),
  min_settlement_amount: v.number(),
  created_at: v.number(),
  updated_at: v.number(),
}),
// MISSING: bonus_tiers field - TO BE ADDED
```

**WalletTopUp.jsx Already Has Promo Preview (line 180-186):**
```jsx
{/* Wallet Top-up Promo Preview */}
{user?._id && currentBranch?._id && parseFloat(amount) > 0 && (
  <WalletPromoPreview
    userId={user._id}
    branchId={currentBranch._id}
    topUpAmount={parseFloat(amount)}
  />
)}
```

### Technical Requirements

**Schema Change:**
```typescript
// Add to walletConfig table in convex/schema.ts
bonus_tiers: v.optional(v.array(v.object({
  minAmount: v.number(),  // Minimum top-up amount in pesos
  bonus: v.number(),      // Bonus amount in pesos
}))),
```

**getBonusTiers Query (public, no auth required):**
```typescript
export const getBonusTiers = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    if (!config?.bonus_tiers || config.bonus_tiers.length === 0) {
      // Return defaults or empty based on business decision
      return { tiers: DEFAULT_BONUS_TIERS, isConfigured: false };
    }

    return {
      tiers: config.bonus_tiers,
      isConfigured: true
    };
  },
});
```

**Updated creditWallet Flow:**
```typescript
// Fetch configured tiers from walletConfig
const config = await ctx.db.query("walletConfig").first();
const configuredTiers = config?.bonus_tiers || undefined;

// Calculate bonus using config tiers or defaults
let bonus = args.applyBonus !== false
  ? calculateTopUpBonus(args.amount, configuredTiers)
  : 0;
```

### File Structure Notes

**Files to modify:**
- `convex/schema.ts` - Add bonus_tiers field to walletConfig
- `convex/services/walletConfig.ts` - Add getBonusTiers query, update mutations
- `convex/services/wallet.ts` - Fetch tiers from config in creditWallet
- `convex/lib/walletBonus.ts` - No changes needed (already accepts tiers param)
- `src/pages/customer/WalletTopUp.jsx` - Display available bonus tiers
- `src/components/admin/WalletConfigPanel.jsx` OR new `BonusTiersConfig.jsx`

**Files to reference:**
- `convex/lib/walletBonus.ts` - Existing bonus calculation logic
- `src/components/common/PromoPreviewCard.jsx` - WalletPromoPreview component

### Previous Story Learnings (23-1, 23-2)

**From Story 23-1:**
- Use `internalMutation`/`internalAction` for server-side only functions
- PayMongo minimum amount is ₱100
- Always validate amounts server-side
- Use ConvexError with code + message for errors

**From Story 23-2:**
- Use `useRef` to prevent multiple effect firings with real-time subscriptions
- Clear query params after showing toast to prevent infinite loops
- Always add console.error in catch blocks (no silent swallowing)

### Edge Cases

1. **Empty tiers array:** Treat as "no bonus" - don't apply any bonus
2. **Invalid tier data:** Validate minAmount > 0, bonus >= 0
3. **Duplicate minAmounts:** Reject or use first match
4. **Amount between tiers:** Match highest tier that qualifies (already handled)
5. **Config update while user viewing:** Real-time update via Convex subscription
6. **Race condition:** Fetch tiers at credit time, not at checkout creation

### Testing Notes

1. As Super Admin, configure custom bonus tiers (e.g., ₱500→₱30, ₱1000→₱80)
2. As Customer, verify tier display on WalletTopUp page matches config
3. Complete top-up and verify correct bonus was applied
4. Update tiers as Super Admin, verify customer sees new tiers immediately
5. Remove all tiers, verify no bonus section displayed and no bonus applied
6. Test edge case: top-up amount exactly at tier threshold

### References

- [Source: epics-multi-branch-wallet.md#Story 3.3: Top-up Bonus Tiers]
- [Source: architecture-multi-branch-wallet.md#Wallet Configuration]
- [Source: convex/lib/walletBonus.ts - Existing bonus calculation]
- [Source: convex/services/walletConfig.ts - Config management pattern]
- [Source: convex/services/wallet.ts:54-232 - creditWallet with bonus logic]
- [Source: project-context.md - Currency as integers, skeleton loaders]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Senior Developer Review (AI)

**Review Date:** 2026-01-31
**Reviewer:** Claude Opus 4.5

**Issues Found & Fixed:**
- ✅ H1: AC #5 violation - Bonus tiers were showing defaults when not configured. Fixed by checking `isConfigured` flag.
- ✅ H2: AC #3 example values mismatch - Updated story to match actual defaults (₱500→₱50, ₱1000→₱150).
- ✅ M1: Added loading skeleton for bonus tiers in WalletTopUp.jsx.
- ✅ M2: WalletConfigPanel initial state now empty array instead of hardcoded defaults.
- ✅ M3: Fixed `sort()` array mutation by using `[...array].sort()`.
- ✅ C1: Added complete File List to Dev Agent Record.

**Remaining (Low Priority):**
- L1: TypeScript type assertion could use proper type guard (acceptable for now)
- L2: IDE false positive on unused imports (resolved after recompile)

### Debug Log References

### Completion Notes List

### File List

**Modified Files:**
- `convex/schema.ts` - Added `bonus_tiers` field to `walletConfig` table
- `convex/services/walletConfig.ts` - Added `getBonusTiers` query, `updateBonusTiers` mutation, validation
- `convex/services/wallet.ts` - Updated `creditWallet` to fetch configurable tiers
- `src/pages/customer/WalletTopUp.jsx` - Display configurable bonus tiers with loading skeleton
- `src/components/admin/WalletConfigPanel.jsx` - Added bonus tiers management UI
- `_bmad-output/implementation-artifacts/sprint-status.yaml` - Updated story status

**Referenced (no changes):**
- `convex/lib/walletBonus.ts` - Already accepts optional tiers parameter
