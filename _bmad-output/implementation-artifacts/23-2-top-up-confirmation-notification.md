# Story 23.2: Top-up Confirmation & Notification

Status: done

## Story

As a **Customer**,
I want to receive confirmation after a successful top-up,
So that I know my wallet has been credited.

## Acceptance Criteria

1. **Given** my wallet top-up payment succeeds
   **When** the system processes the webhook
   **Then** a `wallet_transactions` record is created with:
   - user_id
   - amount (top-up amount)
   - type = "topup"
   - reference = PayMongo payment ID
   - status = "completed"
   - created_at timestamp

2. **Given** the transaction is recorded
   **When** the webhook processing completes
   **Then** a notification is created for me
   **And** the notification shows: "Wallet topped up: ₱{amount}"

3. **Given** I return to the app after payment
   **When** I view my wallet
   **Then** I see my updated balance immediately
   **And** the recent transaction appears in my history

4. **Given** I am viewing my wallet transactions
   **When** I look at a top-up entry
   **Then** I see the date, amount, and payment reference

## Tasks / Subtasks

- [x] Task 1: Add notification creation to webhook handler (AC: #2)
  - [x] 1.1 Update `processSAWalletTopupWebhook` in `convex/services/wallet.ts` to create notification after crediting wallet
  - [x] 1.2 Use existing `createNotification` mutation from `notifications.ts` service
  - [x] 1.3 Set notification type="payment", priority="medium", recipient_type="customer"
  - [x] 1.4 Include action_url="/customer/wallet" for quick navigation

- [x] Task 2: Enhance transaction display in wallet history (AC: #3, #4)
  - [x] 2.1 Update `listTransactions` query in `wallet.ts` to include payment_id as reference
  - [x] 2.2 Update wallet transaction list component to display reference/payment_id
  - [x] 2.3 Ensure date formatting uses project standards

- [x] Task 3: Add top-up success feedback on wallet page (AC: #3)
  - [x] 3.1 Update `src/pages/customer/Wallet.jsx` to detect `?topup=success` query param
  - [x] 3.2 Show success toast/alert when returning from successful payment
  - [x] 3.3 Ensure balance refreshes via Convex real-time subscription (already automatic)

- [x] Task 4: Verify wallet_transactions record completeness (AC: #1)
  - [x] 4.1 Verify `creditWallet` mutation creates transaction with all required fields
  - [x] 4.2 Add payment_id/reference_id to transaction record if missing
  - [x] 4.3 Ensure type="topup" (consistent with existing pattern)

## Dev Notes

### Architecture Compliance

This story extends the SA wallet top-up flow from Story 23-1 by adding user-facing confirmation and notification. The implementation uses existing patterns from the notifications service.

**Key Changes:**
1. Webhook handler now creates a notification after crediting wallet
2. Wallet page shows success feedback when returning from PayMongo
3. Transaction history displays reference/payment ID

### Existing Code Patterns

**Notification Creation Pattern (from notifications.ts):**
```typescript
import { api } from "../_generated/api";

// In webhook handler after crediting wallet:
await ctx.runMutation(api.services.notifications.createNotification, {
  title: "Wallet Top-up Successful",
  message: `Wallet topped up: ₱${amount.toLocaleString()}`,
  type: "payment",
  priority: "medium",
  recipient_id: userId,
  recipient_type: "customer",
  action_url: "/customer/wallet",
  action_label: "View Wallet",
  metadata: {
    transaction_type: "wallet_topup",
    amount: amount,
    reference: paymentId,
  },
});
```

**Current Wallet Transaction Record (from Story 23-1):**
```typescript
// In creditWallet mutation (wallet.ts:165-175)
await ctx.db.insert("wallet_transactions", {
  user_id: args.userId,
  type: "topup",  // Note: "topup" not "top_up" per existing pattern
  amount: args.amount,
  status: "completed",
  provider: "paymongo",
  reference_id: args.reference_id,  // PayMongo payment ID
  createdAt: now,
  updatedAt: now,
  description,
});
```

**URL Query Param Detection (React pattern):**
```jsx
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner'; // or existing toast pattern

function Wallet() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const topupStatus = searchParams.get('topup');
    if (topupStatus === 'success') {
      toast.success('Wallet topped up successfully!');
      // Clear the param to avoid showing on refresh
      searchParams.delete('topup');
      setSearchParams(searchParams, { replace: true });
    } else if (topupStatus === 'cancelled') {
      toast.error('Top-up was cancelled');
      searchParams.delete('topup');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // ... rest of component
}
```

### Technical Requirements

**AC#1 - Transaction Record Verification:**
- The `creditWallet` mutation in Story 23-1 already creates the transaction record
- Verify all required fields are present: user_id, amount, type, reference_id, status, createdAt
- The `type` field uses "topup" (no underscore) per existing codebase convention

**AC#2 - Notification Creation:**
- Use `api.services.notifications.createNotification` mutation
- Call from within `processSAWalletTopupWebhook` internalAction
- Must use `ctx.runMutation()` since we're in an action

**AC#3 - Real-time Balance Update:**
- Convex subscriptions handle this automatically
- `useQuery(api.services.wallet.getWallet, { userId })` will re-render on update
- Add success toast on page load when returning from PayMongo

**AC#4 - Transaction History Display:**
- `listTransactions` query already returns all transaction fields
- UI needs to display `reference_id` (PayMongo payment ID) and format dates

### File Structure Notes

**Files to modify:**
- `convex/services/wallet.ts` - Add notification creation to webhook handler
- `src/pages/customer/Wallet.jsx` - Add topup success/cancelled detection

**Files to reference:**
- `convex/services/notifications.ts` - Notification creation pattern
- `src/components/common/NotificationSystem.tsx` - Toast/alert patterns

### Edge Cases

1. **Duplicate Webhook:** Notification should only be created once (idempotency check exists)
2. **User Navigates Away:** Notification persists even if user doesn't return to app
3. **Multiple Top-ups:** Each successful top-up creates its own notification

### Testing Notes

1. Complete a wallet top-up flow end-to-end
2. Verify notification appears in user's notification list
3. Verify toast appears when redirected back with `?topup=success`
4. Verify transaction appears in wallet history with reference
5. Test cancelled flow (`?topup=cancelled`) shows appropriate message

### References

- [Source: epics-multi-branch-wallet.md#Story 3.2: Top-up Confirmation & Notification]
- [Source: convex/services/notifications.ts - createNotification mutation]
- [Source: convex/services/wallet.ts - creditWallet, processSAWalletTopupWebhook]
- [Source: project-context.md - Notification patterns, ConvexError usage]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

None - implementation completed without errors.

### Completion Notes List

1. **Task 1 Implementation**: Added notification creation to `processSAWalletTopupWebhook` in wallet.ts:
   - Creates notification after wallet is credited
   - Uses existing `createNotification` mutation from notifications.ts
   - Sets type="payment", priority="medium", recipient_type="customer"
   - Includes action_url="/customer/wallet" and action_label="View Wallet"
   - Includes bonus amount in message if applicable
   - Wrapped in try/catch to not fail webhook if notification fails

2. **Task 2 Implementation**: Enhanced transaction display in Wallet.jsx:
   - listTransactions query already returns all fields including payment_id and reference_id
   - Updated transaction list to display payment reference (truncated last 12 chars)
   - Date formatting uses existing project standard (en-PH locale)

3. **Task 3 Implementation**: Added top-up success/cancelled feedback:
   - Detects `?topup=success` and `?topup=cancelled` query params
   - Shows success toast: "Top-up Successful! Your wallet has been credited."
   - Shows error toast: "Top-up Cancelled. Your payment was cancelled."
   - Maintains backwards compatibility with legacy paymongo source flow

4. **Task 4 Verification**: Confirmed wallet_transactions record completeness:
   - creditWallet mutation already creates transaction with all required fields
   - user_id, amount, type="topup", reference_id (payment_id), status="completed", createdAt all present
   - type uses "topup" consistent with existing codebase convention

### File List

- `convex/services/wallet.ts` - Added notification creation to processSAWalletTopupWebhook (lines 961-988)
- `src/pages/customer/Wallet.jsx` - Updated useEffect for topup success/cancelled handling, added reference display in transaction list

## Senior Developer Review

### Review Date
2026-01-31

### Issues Found & Fixed

**H1 (HIGH) - Infinite Toast Loop Bug**
- **Problem**: Query param `?topup=success` was never cleared after showing toast. Combined with `txs` in dependency array (real-time Convex subscription), useEffect re-triggered on every transaction update, showing toast repeatedly.
- **Root Cause**: `setSearchParams` was not destructured from `useSearchParams()`, so param could never be cleared.
- **Fix Applied**:
  1. Added `setSearchParams` to destructuring
  2. Added `useRef` flag (`topupToastShownRef`) to track if toast was already shown
  3. Clear query param immediately after showing toast with `searchParams.delete('topup')` and `setSearchParams(searchParams, { replace: true })`

**M1 (MEDIUM) - Silent Error Swallowing**
- **Problem**: Empty catch block `catch (e) {}` in legacy finalize top-up loop hid potential errors.
- **Fix Applied**: Added `console.error('[Wallet] Legacy finalize top-up failed:', e)` for debugging visibility.

**M2 (MEDIUM) - Missing One-Time Effect Guard**
- **Problem**: No protection against multiple toast firings during component re-renders.
- **Fix Applied**: Added `topupToastShownRef` with early return if already shown.

### Files Modified During Review

- `src/pages/customer/Wallet.jsx` - Lines 1, 14-15, 52-84
