# Story 21.4: Configure Branch Wallet Settings

Status: done

## Story

As a **Super Admin**,
I want to configure wallet settings for each branch,
So that branches can receive their earnings through their preferred payout method.

## Acceptance Criteria

1. **Given** I am on the Branch Management page
   **When** I select a branch to configure wallet settings
   **Then** I see the Branch Wallet Settings form

2. **Given** I am configuring a branch's wallet settings
   **When** I set a commission override percentage
   **Then** this branch uses the override instead of global rate
   **And** the override is clearly marked as "Custom" in the UI

3. **Given** I am configuring payout details
   **When** I select payout method (GCash, Maya, or Bank Transfer)
   **Then** I must enter account number and account name
   **And** for Bank Transfer, I must also enter bank name

4. **Given** I save branch wallet settings
   **When** the settings don't exist yet
   **Then** a new branchWalletSettings record is created
   **When** the settings already exist
   **Then** the existing record is updated

5. **Given** a branch has no wallet settings configured
   **When** they try to request settlement
   **Then** they are prompted to configure payout details first

## Tasks / Subtasks

- [x] Task 1: Create branchWalletSettings service (AC: #1, #4)
  - [x] Create `convex/services/branchWalletSettings.ts`
  - [x] Implement `getBranchWalletSettings` query
  - [x] Implement `updateBranchWalletSettings` mutation (upsert)
  - [x] Implement `listAllBranchSettings` for SA view
  - [x] Add role-based access: super_admin can edit all, branch_admin can view own

- [x] Task 2: Create BranchWalletSettingsPanel UI (AC: #1, #2, #3)
  - [x] Create `src/components/admin/BranchWalletSettingsPanel.jsx`
  - [x] Add branch selector dropdown
  - [x] Add commission override toggle + input
  - [x] Add payout method selector (GCash, Maya, Bank Transfer)
  - [x] Add conditional bank name field

- [x] Task 3: Implement validation and save (AC: #3, #4)
  - [x] Validate account number format per method
  - [x] Validate commission override 0-100
  - [x] Show success/error messages
  - [x] Handle create vs update (upsert)

- [x] Task 4: Add "Custom" badge for overrides (AC: #2)
  - [x] Show "Custom Commission" badge when override is set
  - [x] Show actual vs global rate comparison
  - [x] Add "Reset to Global" option

- [x] Task 5: Export service and verify deployment
  - [x] Add branchWalletSettings to `convex/services/index.ts`
  - [x] Run `npx convex dev` to deploy
  - [x] Test full flow in browser

## Dev Notes

### Architecture Compliance (MANDATORY)

**Source:** [architecture-multi-branch-wallet.md]

**Schema (from Story 21.1):**
```typescript
branchWalletSettings: defineTable({
  branch_id: v.id("branches"),
  commission_override: v.optional(v.number()),
  settlement_frequency: v.optional(v.string()),
  payout_method: v.optional(v.string()),
  payout_account_number: v.optional(v.string()),
  payout_account_name: v.optional(v.string()),
  payout_bank_name: v.optional(v.string()),
  created_at: v.number(),
  updated_at: v.number(),
}).index("by_branch", ["branch_id"]),
```

**Payout Methods:**
- `gcash` - GCash mobile wallet
- `maya` - Maya (formerly PayMaya)
- `bank` - Bank Transfer (requires bank_name)

### Previous Story Intelligence

**From Story 21.2 & 21.3:**
- walletConfig service pattern established
- UI card layout with dark theme (#0A0A0A bg, #FF8C42 accent)
- Skeleton loader pattern for loading states
- Commission validation already implemented

### Project Context Rules (CRITICAL)

**Data Types:**
- Currency: integers (500 = ₱500)
- Commission: integers (5 = 5%)
- Dates: Unix timestamps via `Date.now()`

**Role Access:**
- super_admin: can view/edit all branch settings
- branch_admin: can only view own branch settings

### Service Pattern

```typescript
// convex/services/branchWalletSettings.ts
import { query, mutation } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { checkRole } from "./rbac";

export const getBranchWalletSettings = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    // super_admin can view any, branch_admin only own
    const settings = await ctx.db
      .query("branchWalletSettings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .first();
    return settings;
  },
});

export const updateBranchWalletSettings = mutation({
  args: {
    branch_id: v.id("branches"),
    commission_override: v.optional(v.number()),
    settlement_frequency: v.optional(v.string()),
    payout_method: v.optional(v.string()),
    payout_account_number: v.optional(v.string()),
    payout_account_name: v.optional(v.string()),
    payout_bank_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkRole(ctx, "super_admin");
    // Upsert logic...
  },
});
```

### UI Component Pattern

```jsx
// Dark card with orange accent
<div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
  {/* Header */}
  <div className="flex items-center gap-3 mb-4">
    <Building className="w-5 h-5 text-[#FF8C42]" />
    <div>
      <p className="text-white font-medium">Branch Wallet Settings</p>
      <p className="text-sm text-gray-400">Configure payout details</p>
    </div>
  </div>

  {/* Form fields */}
</div>
```

### Validation Rules

- **Commission Override**: 0-100, optional (null means use global)
- **Payout Method**: Required for settlement
- **Account Number**: Required if payout method set
- **Account Name**: Required if payout method set
- **Bank Name**: Required only if payout_method === "bank"

### Anti-Patterns to AVOID

- Not validating bank_name when method is "bank"
- Allowing branch_admin to edit other branches
- Storing commission as decimal (0.05 instead of 5)
- Creating duplicate settings per branch

### References

- [Architecture Document](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md)
- [walletConfig.ts](convex/services/walletConfig.ts) - reference for service pattern
- [WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx) - reference for UI pattern
- [Schema](convex/schema.ts#L2465) - branchWalletSettings table

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with no errors.

### Completion Notes List

1. **branchWalletSettings service created** with 5 exports:
   - `getBranchWalletSettings` - get settings for specific branch
   - `listAllBranchSettings` - list all branches with settings (SA only)
   - `updateBranchWalletSettings` - upsert with full validation
   - `getEffectiveCommissionRate` - returns override or global rate
   - `hasPayoutDetailsConfigured` - checks if branch can request settlement
2. **Comprehensive validation** - commission 0-100, payout method requirements, bank name for bank transfers
3. **BranchWalletSettingsPanel UI** - dark theme, branch selector, commission override toggle with "Custom" badge
4. **Payout method selector** - 3 visual buttons (GCash, Maya, Bank) with conditional fields
5. **Reset to Global button** - allows resetting commission override to match global rate
6. **Convex deployment verified** - `npx convex dev --once` completed successfully

### File List

- [convex/services/branchWalletSettings.ts](convex/services/branchWalletSettings.ts) (created - 255 lines)
- [src/components/admin/BranchWalletSettingsPanel.jsx](src/components/admin/BranchWalletSettingsPanel.jsx) (created - 420 lines)
- [convex/services/index.ts](convex/services/index.ts) (modified - added branchWalletSettings export)

