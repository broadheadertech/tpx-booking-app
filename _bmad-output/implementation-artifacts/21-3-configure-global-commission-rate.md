# Story 21.3: Configure Global Commission Rate

Status: done

## Story

As a **Super Admin**,
I want to set a commission percentage for wallet payments,
So that I can cover wallet management costs.

## Acceptance Criteria

1. **Given** I am on the Wallet Configuration panel
   **When** I set the global commission rate (e.g., 5%)
   **Then** the rate is saved to walletConfig.default_commission_percent

2. **Given** no commission rate is set
   **When** the system needs commission rate
   **Then** it defaults to 5%

3. **Given** I enter an invalid commission rate (negative or > 100)
   **When** I try to save
   **Then** I see a validation error
   **And** the save is prevented

4. **Given** the commission rate is configured
   **When** a wallet payment occurs at any branch
   **Then** the configured rate is applied to calculate commission

## Tasks / Subtasks

- [x] Task 1: Enhance WalletConfigPanel commission UI (AC: #1, #2)
  - [x] Add prominent commission rate section with dedicated card
  - [x] Add commission rate info tooltip explaining the 5% default
  - [x] Show current commission value with % symbol
  - [x] Add commission preview calculation example

- [x] Task 2: Implement client-side validation (AC: #3)
  - [x] Validate commission rate is between 0 and 100
  - [x] Show inline error when rate is invalid
  - [x] Disable save button when validation fails
  - [x] Use real-time validation on input change

- [x] Task 3: Create getCommissionRate helper query (AC: #2, #4)
  - [x] Add `getCommissionRate` query to walletConfig.ts
  - [x] Return default_commission_percent or 5 if not configured
  - [x] Can be called by any service (not restricted to super_admin)

- [x] Task 4: Update service validation messages (AC: #3)
  - [x] Ensure server-side validation has clear error messages
  - [x] Test edge cases: 0%, 100%, 50.5% (decimals), -1, 101

- [x] Task 5: Verify deployment and test
  - [x] Run `npx convex dev` to deploy changes
  - [x] Test commission rate save/update flow
  - [x] Verify default 5% when config is empty/null

## Dev Notes

### Architecture Compliance (MANDATORY)

**Source:** [architecture-multi-branch-wallet.md](_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#financial-calculation-patterns)

**Commission Calculation Pattern (MANDATORY):**
```typescript
// ALL agents MUST use this exact pattern for commission calculations
function calculateCommission(grossAmount: number, commissionPercent: number) {
  const commissionAmount = Math.round(grossAmount * (commissionPercent / 100));
  const netAmount = grossAmount - commissionAmount;
  return { commissionAmount, netAmount };
}
```

**Currency Rules:**
- Store as integers: `500` = ₱500
- Commission stored as integer percentage: `5` = 5%
- Never use floats for money calculations
- Use `Math.round()` for commission amounts

### Previous Story Intelligence

**From Story 21.2 (COMPLETED):**
- walletConfig service already exists at [convex/services/walletConfig.ts](convex/services/walletConfig.ts)
- `default_commission_percent` field already included in `updateWalletConfig` mutation
- Server-side validation already exists (lines 89-94):
  ```typescript
  if (args.default_commission_percent < 0 || args.default_commission_percent > 100) {
    throw new ConvexError({
      code: "VALIDATION_ERROR",
      message: "Commission percent must be between 0 and 100",
    });
  }
  ```
- WalletConfigPanel.jsx already has commission percent input (lines 294-312)
- Form state already includes `default_commission_percent: 5` as default

**What's Already Implemented:**
- ✅ Server-side storage of commission rate
- ✅ Server-side validation (0-100 range)
- ✅ Basic commission input field in UI
- ✅ Default value of 5% in form state

**What Story 21.3 Adds:**
- Enhanced commission UI with dedicated section
- Client-side validation with real-time feedback
- Commission preview example
- `getCommissionRate` helper query for other services

### Existing Code to Extend

**WalletConfigPanel.jsx** (lines 294-312):
```jsx
{/* Commission Percent */}
<div>
  <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
    <Percent className="w-4 h-4" />
    Default Commission Rate
  </label>
  <div className="flex items-center gap-2">
    <input
      type="number"
      min="0"
      max="100"
      value={formValues.default_commission_percent}
      onChange={(e) => handleValueChange('default_commission_percent', Number(e.target.value))}
      className="w-24 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#FF8C42] focus:outline-none"
    />
    <span className="text-gray-400">%</span>
  </div>
  <p className="text-xs text-gray-500 mt-1">Commission deducted from wallet payments at branches</p>
</div>
```

**Enhancement Required:**
- Wrap in a dedicated card section similar to Test Mode toggle
- Add commission calculation example preview
- Add client-side validation with error state
- Add info tooltip about default 5%

### Project Context Rules (CRITICAL)

**Source:** [project-context.md](_bmad-output/planning-artifacts/project-context.md)

**Data Types:**
- **Percentages**: Store as integers (5 = 5%) - NOT decimals like 0.05
- **Currency**: Store as integers (500 = ₱500)

**UI/Styling:**
- Theme: Dark (#0A0A0A background) with orange accent (#FF8C42)
- Error states: Red border `border-red-500` with red text
- Use inline error messages below input
- Mobile touch targets: minimum 44px

**Error Handling:**
```typescript
import { ConvexError } from "convex/values";

throw new ConvexError({
  code: "VALIDATION_ERROR",
  message: "Commission percent must be between 0 and 100"
});
```

### File Structure Requirements

**Files to Modify:**

| File | Changes |
|------|---------|
| `convex/services/walletConfig.ts` | Add `getCommissionRate` query |
| `src/components/admin/WalletConfigPanel.jsx` | Enhance commission section UI |

**No new files required** - this story extends existing implementation.

### Implementation Details

**getCommissionRate Query:**
```typescript
/**
 * Get the configured commission rate, defaulting to 5% if not set
 * This query can be called by any service that needs the commission rate
 */
export const getCommissionRate = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("walletConfig").first();

    // Default to 5% if no config exists
    if (!config) {
      return { commission_percent: 5 };
    }

    return { commission_percent: config.default_commission_percent };
  },
});
```

**Client-side Validation Pattern:**
```jsx
const [commissionError, setCommissionError] = useState('');

const validateCommission = (value) => {
  if (value < 0) {
    setCommissionError('Commission cannot be negative');
    return false;
  }
  if (value > 100) {
    setCommissionError('Commission cannot exceed 100%');
    return false;
  }
  setCommissionError('');
  return true;
};
```

**Commission Preview Example UI:**
```jsx
{/* Commission Preview Example */}
{formValues.default_commission_percent > 0 && (
  <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
    <p className="text-xs text-gray-400 mb-2">Example Calculation</p>
    <div className="text-sm text-gray-300">
      <p>₱1,000 payment → ₱{Math.round(1000 * (formValues.default_commission_percent / 100))} commission</p>
      <p className="text-gray-500">Branch receives: ₱{1000 - Math.round(1000 * (formValues.default_commission_percent / 100))}</p>
    </div>
  </div>
)}
```

### UI/UX Enhancements

**Commission Section Card Layout:**
```jsx
{/* Commission Configuration Card */}
<div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
  <div className="flex items-center gap-3 mb-4">
    <Percent className="w-5 h-5 text-[#FF8C42]" />
    <div>
      <p className="text-white font-medium">Default Commission Rate</p>
      <p className="text-sm text-gray-400">Applied to all wallet payments (default: 5%)</p>
    </div>
  </div>

  {/* Commission input, validation, preview */}
</div>
```

### Anti-Patterns to AVOID

- ❌ Using floats for commission (0.05 instead of 5)
- ❌ Skipping client-side validation
- ❌ Allowing save with invalid commission value
- ❌ Not showing the default 5% clearly to user
- ❌ Calculating commission on read (should be calculated on write)

### Testing Verification

After implementation:
1. Log in as super_admin
2. Navigate to Wallet Configuration
3. Test commission input with values: 0, 5, 50, 100
4. Test invalid values: -1, 101, 50.5 (should show errors)
5. Save valid commission and verify persistence
6. Delete walletConfig record in Convex dashboard
7. Call `getCommissionRate` - should return 5 (default)
8. Create new config without changing commission - should be 5

### Project Structure Notes

- Service file: `convex/services/walletConfig.ts` (modify existing)
- Component: `src/components/admin/WalletConfigPanel.jsx` (modify existing)
- This story is primarily UI enhancement + helper query
- Follows existing patterns from Story 21.2

### References

- [Architecture Document - Commission Calculation Pattern](../_bmad-output/planning-artifacts/architecture-multi-branch-wallet.md#financial-calculation-patterns)
- [Existing walletConfig.ts](convex/services/walletConfig.ts)
- [Existing WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx)
- [Project Context - Data Types](../_bmad-output/planning-artifacts/project-context.md#data-types)
- [Epics Document - Story 1.3](../_bmad-output/planning-artifacts/epics-multi-branch-wallet.md#story-13-configure-global-commission-rate)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - clean implementation with no errors.

### Completion Notes List

1. **Enhanced Commission UI Card** - Created dedicated card section with orange accent icon, title, and info button
2. **Info Tooltip** - Added expandable info section explaining how commission works (toggleable via Info icon button)
3. **Commission Preview Calculator** - Added real-time 3-column preview showing ₱1,000 example payment breakdown
4. **Client-side Validation** - Added `validateCommission` function checking 0-100 range, integers only
5. **Real-time Error Feedback** - Commission input shows red border and error message when invalid
6. **getCommissionRate Helper Query** - Added public query returning commission rate or default 5%
7. **Convex Deployment Verified** - `npx convex dev --once` completed successfully

### File List

- [convex/services/walletConfig.ts](convex/services/walletConfig.ts) (modified - added getCommissionRate query, ~25 lines)
- [src/components/admin/WalletConfigPanel.jsx](src/components/admin/WalletConfigPanel.jsx) (modified - enhanced commission UI, +90 lines)

