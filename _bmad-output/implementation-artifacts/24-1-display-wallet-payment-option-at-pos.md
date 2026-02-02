# Story 24.1: Display Wallet Payment Option at POS

Status: done

## Story

As a **Staff Member**,
I want to see a "Pay with Wallet" option when processing payment,
So that I can offer wallet payment to customers.

## Acceptance Criteria

1. **Given** I am processing a payment for a customer at POS
   **When** the customer is identified (logged in or looked up)
   **Then** I see their current wallet balance displayed
   **And** I see a "Pay with Wallet" button

2. **Given** the customer has sufficient wallet balance (>= total)
   **When** I view the payment options
   **Then** the "Pay with Wallet" button is enabled
   **And** it shows the amount to be deducted

3. **Given** the customer has insufficient wallet balance (< total)
   **When** I view the payment options
   **Then** the "Pay with Wallet" button shows "Use ₱{balance} + pay remainder"
   **And** combo payment flow is indicated

4. **Given** the customer has zero wallet balance
   **When** I view the payment options
   **Then** the wallet option is disabled or hidden
   **And** I see "No wallet balance" message

5. **Given** the customer is a guest (not logged in)
   **When** I view the payment options
   **Then** wallet payment option is not shown

## Tasks / Subtasks

- [x] Task 1: Create wallet balance query for POS (AC: #1, #5)
  - [x] 1.1 Add `getCustomerWalletBalance` query to wallet.ts or create walletPayment.ts service
  - [x] 1.2 Query by customer user_id, return wallet_balance from users table
  - [x] 1.3 Return null/0 for guests (no user_id) - AC #5
  - [x] 1.4 Use existing wallets table with balance and bonus_balance fields

- [x] Task 2: Create POSWalletPayment component (AC: #1, #2, #3, #4)
  - [x] 2.1 Create `src/components/staff/POSWalletPayment.jsx`
  - [x] 2.2 Import useQuery from convex/react, api from _generated
  - [x] 2.3 Display customer wallet balance with formatCurrency
  - [x] 2.4 Show "Pay with Wallet" button with conditional states
  - [x] 2.5 Style with dark theme (#0A0A0A) and purple accent for wallet

- [x] Task 3: Implement balance comparison logic (AC: #2, #3, #4)
  - [x] 3.1 Compare wallet_balance vs booking total amount
  - [x] 3.2 If balance >= total: Show "Pay ₱{total} with Wallet" (enabled)
  - [x] 3.3 If balance < total && balance > 0: Show "Use ₱{balance} + pay remainder"
  - [x] 3.4 If balance === 0: Show disabled state with "No wallet balance"
  - [x] 3.5 Handle skeleton loading state when data === undefined

- [x] Task 4: Integrate with existing POS payment flow (AC: #1)
  - [x] 4.1 Locate existing POS payment component (QueueSection.jsx customer modal)
  - [x] 4.2 Add POSWalletPayment as payment option in customer details modal
  - [x] 4.3 Pass customer_id and booking total as props
  - [x] 4.4 Handle click to trigger payment flow (prepare for Story 24-2)

- [x] Task 5: Handle guest customer case (AC: #5)
  - [x] 5.1 Check if customer_id is undefined/null
  - [x] 5.2 Return null or hide component entirely for guests
  - [x] 5.3 Do not query wallet balance for guests (use "skip")

## Dev Notes

### Architecture Compliance

This story is part of Epic 24 (POS Wallet Payment) in the Multi-branch Wallet Payment feature. It creates the UI foundation for accepting wallet payments at the counter.

**Key Insight:** This story is display-only - no actual payment processing. Story 24-2 will handle the actual wallet deduction and earning record creation.

### Existing Code Patterns

**Users table (wallet_balance field already exists):**
```typescript
// convex/schema.ts - users table already has:
wallet_balance: v.optional(v.number()), // Stored as whole pesos (500 = ₱500)
```

**Existing wallet service patterns (from Epic 23):**
```typescript
// convex/services/wallet.ts - existing patterns
export const getWalletBalance = query({
  args: { user_id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.user_id);
    return user?.wallet_balance ?? 0;
  },
});
```

**Existing POS payment flow (PaymentOptionsModal.jsx):**
```jsx
// src/components/customer/PaymentOptionsModal.jsx
// Shows payment options: Pay Now, Pay Later, Pay at Shop
// Need to add wallet option for staff POS view
```

### Technical Requirements

**Query for wallet balance:**
```typescript
// Can reuse existing or add new query
export const getCustomerWalletBalance = query({
  args: { user_id: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    if (!args.user_id) return null; // Guest - no wallet
    const user = await ctx.db.get(args.user_id);
    return user?.wallet_balance ?? 0;
  },
});
```

**Component structure:**
```jsx
// src/components/staff/POSWalletPayment.jsx
export function POSWalletPayment({ customerId, totalAmount, onPayWithWallet, onComboPayment }) {
  const balance = useQuery(
    api.services.wallet.getCustomerWalletBalance,
    customerId ? { user_id: customerId } : "skip"
  );

  if (!customerId) return null; // Guest - no wallet option
  if (balance === undefined) return <Skeleton />; // Loading

  const hasSufficientBalance = balance >= totalAmount;
  const hasPartialBalance = balance > 0 && balance < totalAmount;

  // Render button states based on balance...
}
```

### File Structure Notes

**Files to create:**
- `src/components/staff/POSWalletPayment.jsx` - Wallet payment option component

**Files to modify:**
- Existing POS payment component (identify and integrate wallet option)

**Files to reference:**
- `convex/services/wallet.ts` - Existing wallet service
- `convex/schema.ts` - Users table with wallet_balance
- `src/components/customer/PaymentOptionsModal.jsx` - Payment flow pattern
- `src/components/staff/QueueSection.jsx` - POS queue management

### Edge Cases

1. **Customer not found:** Handle gracefully if user_id is invalid
2. **Balance loading race condition:** Use skeleton loader until data arrives
3. **Zero balance with pending top-up:** Only show current balance (don't wait for pending)
4. **Currency display:** Format as "₱500.00" using toLocaleString
5. **Mobile responsiveness:** Ensure 44px touch targets on mobile

### References

- [Source: epics-multi-branch-wallet.md#Epic 4: POS Wallet Payment]
- [Source: architecture-multi-branch-wallet.md#Wallet Access Control Matrix]
- [Source: project-context.md#Framework-Specific Rules]
- [Source: project-context.md#Wallet-Specific Error Codes]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- Implementation completed 2026-01-31
- All 5 acceptance criteria satisfied

### Completion Notes List

1. **Task 1 Implementation:** Added `getCustomerWalletBalance` query to `convex/services/wallet.ts`. The query fetches from the `wallets` table (not `users` table as originally specified - the actual implementation uses a separate wallets table with `balance` and `bonus_balance` fields). Returns null for guests when no user_id is provided.

2. **Task 2 Implementation:** Created `POSWalletPayment.jsx` component with:
   - Purple accent styling (consistent with wallet theme across the app)
   - Skeleton loading state for async data
   - Display of total balance including bonus balance breakdown
   - Points earning indicator showing how many points customer will earn

3. **Task 3 Implementation:** Balance comparison logic handles all scenarios:
   - Sufficient balance: Shows enabled "Pay ₱X with Wallet" button
   - Partial balance: Shows combo payment option with remainder calculation
   - Zero balance: Shows disabled state with "No wallet balance" message
   - No wallet: Shows "No wallet" state

4. **Task 4 Implementation:** Integrated into `QueueSection.jsx` customer details modal. The component appears when:
   - Customer has an account (`hasAccount === true`)
   - Service has a price (`servicePrice > 0`)
   - Click handlers are stubbed for Stories 24-2 (full payment) and 24-3 (combo payment)

5. **Task 5 Implementation:** Guest handling uses Convex "skip" pattern - when `customerId` is null/undefined, the query is skipped entirely and the component returns null (not rendered).

### File List

**Created:**
- `src/components/staff/POSWalletPayment.jsx` - New POS wallet payment display component

**Modified:**
- `convex/services/wallet.ts` - Added `getCustomerWalletBalance` query (lines 1062-1106)
- `src/components/staff/QueueSection.jsx` - Imported and integrated POSWalletPayment component

### Code Review Fixes Applied

- Added `aria-label` attributes to all buttons for screen reader accessibility
- Added `aria-busy`, `aria-live`, and `aria-label` to loading skeleton
- Added `min-h-[44px]` to all buttons to meet mobile touch target requirements
