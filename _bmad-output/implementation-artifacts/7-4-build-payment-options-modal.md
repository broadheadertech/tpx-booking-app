# Story 7.4: Build Payment Options Modal

Status: done

## Story

As a **customer**,
I want **to choose between Pay Now, Pay Later, or Pay at Shop**,
So that **I can select my preferred payment method based on my situation**.

## Acceptance Criteria

1. **Given** I have selected services and am at booking confirmation
   **When** the PaymentOptionsModal is displayed
   **Then** I see available payment options based on branch configuration:
   - **Pay Now**: Full service amount via PayMongo (if enabled)
   - **Pay Later**: Convenience fee now, service amount at branch (if enabled)
   - **Pay at Shop**: No payment now, pay full amount at branch (if enabled)

2. **Given** I am viewing the payment options
   **When** I look at the breakdown (FR4)
   **Then** I see for each option:
   | Option | Pay Now | Due at Branch |
   |--------|---------|---------------|
   | Pay Now | ₱XXX (full) | ₱0 |
   | Pay Later | ₱XX (fee) | ₱XXX (service) |
   | Pay at Shop | ₱0 | ₱XXX (full) |

3. **Given** the branch has Pay Now disabled
   **When** the modal loads
   **Then** Pay Now option is hidden

4. **Given** the branch has Pay Later disabled
   **When** the modal loads
   **Then** Pay Later option is hidden

5. **Given** the branch has Pay at Shop disabled
   **When** the modal loads
   **Then** Pay at Shop option is hidden

6. **Given** the branch has no PayMongo configuration
   **When** the modal loads
   **Then** only Pay at Shop option is available

7. **Given** I select a payment option requiring PayMongo
   **When** I click "Proceed to Payment"
   **Then** payment methods are shown: GCash, Maya, Card, GrabPay, Bank Transfer (FR3)

8. **Given** I select "Pay at Shop"
   **When** I click "Confirm Booking"
   **Then** booking is created without payment redirect
   **And** I see confirmation with "Pay ₱XXX at the branch"

## Tasks / Subtasks

- [x] Task 1: Create story file
  - [x] 1.1 Document story requirements
- [x] Task 2: Create PaymentOptionsModal.jsx
  - [x] 2.1 Create modal component with React Portal (follows project patterns)
  - [x] 2.2 Fetch branch payment config via useQuery
  - [x] 2.3 Display available payment options based on config
  - [x] 2.4 Show payment breakdown for each option (AC2)
- [x] Task 3: Implement option selection
  - [x] 3.1 Radio button selection for options
  - [x] 3.2 Highlight selected option with color-coded borders
  - [x] 3.3 Call onSelect callback with chosen option
- [x] Task 4: Handle edge cases
  - [x] 4.1 No PayMongo config - show only Pay at Shop (AC6)
  - [x] 4.2 Loading state while fetching config
  - [x] 4.3 Error handling for no options available
- [x] Task 5: Build and verify
  - [x] 5.1 Run npm run build
  - [x] 5.2 Verify no errors

## Dev Notes

### Component Location

`src/components/customer/PaymentOptionsModal.jsx`

### Props

```typescript
interface PaymentOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: Id<"branches">;
  servicePrice: number;      // Full service price
  serviceName: string;       // For display
  onSelect: (option: "pay_now" | "pay_later" | "pay_at_shop") => void;
}
```

### UI Design

```
┌─────────────────────────────────────┐
│        Choose Payment Method        │
├─────────────────────────────────────┤
│ ○ Pay Now                           │
│   Pay ₱500 now                      │
│   Due at branch: ₱0                 │
├─────────────────────────────────────┤
│ ● Pay Later (Selected)              │
│   Pay ₱25 convenience fee now       │
│   Due at branch: ₱500               │
├─────────────────────────────────────┤
│ ○ Pay at Shop                       │
│   Pay ₱0 now                        │
│   Due at branch: ₱500               │
├─────────────────────────────────────┤
│                     [Cancel] [Next] │
└─────────────────────────────────────┘
```

### Convex Query Used

`api.services.paymongo.getPaymentConfig` - Returns:
- pay_now_enabled
- pay_later_enabled
- pay_at_shop_enabled
- convenience_fee_percent
- has_public_key, has_secret_key (to check if configured)

### References

- [Source: architecture-paymongo.md#payment-options-modal]
- [Source: prd-paymongo.md#FR1-4] - Customer payment choice
- [Source: epics-paymongo.md#Story-2.4]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

_None yet_

### Completion Notes List

1. Created story file with all requirements
2. Created `PaymentOptionsModal.jsx` component using React Portal (matches project patterns)
3. Component fetches branch payment config via `api.services.paymongo.getPaymentConfig`
4. Displays Pay Now, Pay Later, Pay at Shop options based on branch config (AC1)
5. Shows payment breakdown for each option: Pay Now vs Due at Branch (AC2, FR4)
6. Options hidden based on branch config (AC3, AC4, AC5)
7. Only Pay at Shop shown when no PayMongo config (AC6)
8. Radio button selection with color-coded highlighting (green/yellow/blue)
9. Loading state while fetching config
10. Error state when no options available
11. Info notes for Pay Later (convenience fee explanation) and Pay at Shop
12. Build successful with no errors

### Change Log

| Date | Action | Details |
|------|--------|---------|
| 2026-01-27 | Created | Story file 7-4-build-payment-options-modal.md |
| 2026-01-27 | Created | PaymentOptionsModal.jsx component |
| 2026-01-27 | Verified | Build successful |

### File List

- `src/components/customer/PaymentOptionsModal.jsx` (created)
