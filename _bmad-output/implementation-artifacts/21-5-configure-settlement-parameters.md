# Story 21.5: Configure Settlement Parameters

Status: done

## Story

As a **Super Admin**,
I want to configure default settlement frequency and minimum amounts,
So that settlement requests follow business rules.

## Acceptance Criteria

1. **Given** I am on the Wallet Configuration panel
   **When** I set the default settlement frequency
   **Then** I can choose from: daily, weekly, bi-weekly

2. **Given** I set a minimum settlement amount
   **When** I enter a value (e.g., ₱500)
   **Then** the minimum is saved as an integer (500)
   **And** branches cannot request settlement below this amount

3. **Given** I configure a per-branch settlement frequency override
   **When** that branch's auto-settlement runs
   **Then** it uses the branch-specific frequency

4. **Given** a branch has pending earnings below minimum
   **When** they try to request settlement
   **Then** they see error: "Minimum settlement amount is ₱{amount}"

## Tasks / Subtasks

- [x] Task 1: Enhance Settlement Settings UI (AC: #1, #2)
  - [x] Add dedicated Settlement Settings card (similar to Commission card)
  - [x] Add settlement frequency visual selector (3 buttons)
  - [x] Add minimum amount input with ₱ prefix
  - [x] Add info tooltip explaining settlement rules

- [x] Task 2: Create getSettlementParams helper query (AC: #2, #4)
  - [x] Add `getSettlementParams` query to walletConfig.ts
  - [x] Return min_settlement_amount and default_frequency
  - [x] Include defaults if not configured

- [x] Task 3: Create canRequestSettlement helper query (AC: #4)
  - [x] Add `canRequestSettlement` query to branchWalletSettings.ts
  - [x] Check if branch has payout details configured
  - [x] Check if pending amount meets minimum threshold
  - [x] Return clear error messages

- [x] Task 4: Add settlement frequency to BranchWalletSettingsPanel (AC: #3)
  - [x] Add settlement frequency override toggle
  - [x] Show "Using global: weekly" or "Custom: daily" indicator
  - [x] Add reset to global option

- [x] Task 5: Verify deployment and test
  - [x] Run `npx convex dev` to deploy
  - [x] Test settlement params save/update
  - [x] Test branch override functionality

## Dev Notes

### What's Already Implemented (Story 21.2)

**WalletConfigPanel.jsx already has:**
- Settlement Frequency dropdown (daily, weekly, biweekly)
- Minimum Settlement Amount input with ₱ prefix
- Both fields save to walletConfig table

**What Story 21.5 Adds:**
- Enhanced Settlement UI with dedicated card (like Commission card)
- `getSettlementParams` helper query for other services
- `canRequestSettlement` validation query
- Settlement frequency override in BranchWalletSettingsPanel

### Previous Story Intelligence

**From Story 21.4:**
- branchWalletSettings already has `settlement_frequency` field (optional override)
- Service already handles branch-level settings
- UI component exists but doesn't show settlement frequency yet

### Schema Reference

**walletConfig (from Story 21.1):**
```typescript
default_settlement_frequency: v.string(), // "daily" | "weekly" | "biweekly"
min_settlement_amount: v.number(), // Integer: 500 = ₱500
```

**branchWalletSettings (from Story 21.1):**
```typescript
settlement_frequency: v.optional(v.string()), // Override if set
```

### Helper Query Pattern

```typescript
// walletConfig.ts
export const getSettlementParams = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    return {
      min_settlement_amount: config?.min_settlement_amount ?? 500,
      default_frequency: config?.default_settlement_frequency ?? "weekly",
      is_configured: !!config,
    };
  },
});

// branchWalletSettings.ts
export const canRequestSettlement = query({
  args: {
    branch_id: v.id("branches"),
    pending_amount: v.number(),
  },
  handler: async (ctx, args) => {
    // Check payout details
    const payoutCheck = await hasPayoutDetailsConfigured(ctx, args);
    if (!payoutCheck.configured) {
      return { canRequest: false, reason: payoutCheck.reason };
    }

    // Check minimum amount
    const params = await getSettlementParams(ctx, {});
    if (args.pending_amount < params.min_settlement_amount) {
      return {
        canRequest: false,
        reason: `Minimum settlement amount is ₱${params.min_settlement_amount}`,
      };
    }

    return { canRequest: true, reason: null };
  },
});
```

### UI Enhancement Pattern

```jsx
{/* Settlement Settings Card */}
<div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
  <div className="flex items-center gap-3 mb-4">
    <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
      <Calendar className="w-5 h-5 text-[#FF8C42]" />
    </div>
    <div>
      <p className="text-white font-medium">Settlement Parameters</p>
      <p className="text-sm text-gray-400">Configure payout frequency and limits</p>
    </div>
  </div>

  {/* Frequency Buttons */}
  <div className="grid grid-cols-3 gap-2 mb-4">
    {["daily", "weekly", "biweekly"].map(...)}
  </div>

  {/* Minimum Amount */}
  <div className="flex items-center gap-2">
    <span className="text-gray-400">₱</span>
    <input type="number" ... />
  </div>
</div>
```

### References

- [WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx) - Existing settlement fields
- [branchWalletSettings.ts](convex/services/branchWalletSettings.ts) - Branch settings service
- [BranchWalletSettingsPanel.jsx](src/components/admin/BranchWalletSettingsPanel.jsx) - Branch UI

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with no errors.

### Completion Notes List

1. **Enhanced WalletConfigPanel Settlement UI** - Replaced basic dropdown/input with card layout featuring visual frequency buttons (Daily/Weekly/Bi-weekly)
2. **getSettlementParams helper query** - Added to walletConfig.ts, returns min_settlement_amount and default_frequency with defaults
3. **canRequestSettlement validation query** - Added to branchWalletSettings.ts, validates payout details and minimum amount threshold with clear error messages
4. **getEffectiveSettlementFrequency query** - Returns branch override or global default frequency
5. **BranchWalletSettingsPanel Settlement Override** - Added settlement frequency card with toggle and 3-button selector
6. **Schema Update** - Made payout_method, payout_account_number, payout_account_name optional (branches may not have configured yet)
7. **Convex deployment verified** - `npx convex dev --once` completed successfully

### File List

- [convex/services/walletConfig.ts](convex/services/walletConfig.ts) (modified - added getSettlementParams query)
- [convex/services/branchWalletSettings.ts](convex/services/branchWalletSettings.ts) (modified - added canRequestSettlement and getEffectiveSettlementFrequency queries)
- [convex/schema.ts](convex/schema.ts) (modified - made payout fields optional in branchWalletSettings)
- [src/components/admin/WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx) (modified - enhanced settlement UI)
- [src/components/admin/BranchWalletSettingsPanel.jsx](src/components/admin/BranchWalletSettingsPanel.jsx) (modified - added settlement frequency override)

