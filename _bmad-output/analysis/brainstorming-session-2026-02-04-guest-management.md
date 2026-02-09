# Brainstorming Session: Guest Customer Management

**Date:** February 4, 2026
**Topic:** Improving Guest Customer Identification & Analytics
**Status:** ✅ IMPLEMENTED

---

## Problem Statement

**Original Issue:**
- Guest customers booking anonymously were assigned ugly usernames: `guest_123@gmail.com_1769776344027_0dl9`
- Hard to analyze guest vs registered customer data
- No way to filter guests in analytics dashboards
- No path for guests to convert to full accounts

---

## Solution Implemented

### 1. Schema Enhancement

**File:** `convex/schema.ts`

Added `is_guest` field to users table:
```typescript
is_guest: v.optional(v.boolean()), // true for guest bookings
```

### 2. Cleaner Guest Usernames

**File:** `convex/services/auth.ts`

**Before:** `guest_john_doe_1769776344027_0dl9`
**After:** `Guest-JD-a3f2` (initials + short ID)

```typescript
// Generate cleaner username: Guest-JD-a3f2
const nameParts = guest_name.trim().split(/\s+/);
const initials = nameParts.map(part => part.charAt(0).toUpperCase()).join('').slice(0, 2) || 'GU';
const shortId = Math.random().toString(36).slice(2, 6);
finalUsername = `Guest-${initials}-${shortId}`;
```

### 3. Guest-to-Account Conversion

**File:** `convex/services/auth.ts`

New mutation: `convertGuestToAccount`
- Allows guest to create full account with same email
- Preserves booking history
- Sets `is_guest: false`
- Creates session automatically

```typescript
export const convertGuestToAccount = mutation({
  args: {
    email: v.string(),
    username: v.string(),
    password: v.string(),
    mobile_number: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find guest user, convert to full account
    // Preserve all booking history
  },
});
```

### 4. Analytics Enhancements

**File:** `convex/services/customerBranchActivity.ts`

- Added `is_guest` to enriched customer data
- Added `guest_count` and `registered_count` to churn metrics
- Guest display name uses `nickname` (actual name) instead of username

**File:** `src/components/admin/BranchCustomerAnalytics.jsx`

- Added orange "Guest" badge next to guest customers
- Badge appears in both At-Risk and Top Customers tables

---

## Data Model

| Field | Type | Description |
|-------|------|-------------|
| `is_guest` | boolean | `true` for anonymous guest bookings |
| `nickname` | string | Actual guest name (e.g., "John Doe") |
| `username` | string | Clean format: `Guest-JD-a3f2` |
| `email` | string | Guest's email for booking confirmations |

---

## Guest Lifecycle

```
1. Guest Books Anonymously
   └── User created with:
       - username: "Guest-JD-a3f2"
       - nickname: "John Doe" (actual name)
       - is_guest: true

2. Guest Views in Analytics
   └── Shows as "John Doe" with [Guest] badge

3. Guest Creates Account (Optional)
   └── convertGuestToAccount mutation:
       - Updates username to chosen name
       - Sets is_guest: false
       - Preserves all bookings
       - Returns session token

4. Now a Full Customer
   └── All previous bookings linked
   └── Can login anytime
```

---

## Analytics Display

### Churn Metrics Include:
- `guest_count` - Number of guest customers
- `registered_count` - Number of registered customers
- `guest_rate` - Percentage of guests

### Customer Tables Show:
- Customer name (from nickname for guests)
- Orange "Guest" badge for guest customers
- Email and phone for contact
- Booking history and spend data

---

## Files Modified

1. **Schema:** `convex/schema.ts` - Added `is_guest` field
2. **Auth Service:** `convex/services/auth.ts`
   - Updated `createGuestUser` with cleaner naming
   - Added `convertGuestToAccount` mutation
3. **Customer Analytics:** `convex/services/customerBranchActivity.ts`
   - Added `is_guest` to enriched data
   - Added guest counts to metrics
4. **UI Component:** `src/components/admin/BranchCustomerAnalytics.jsx`
   - Added "Guest" badge display

---

## Future Enhancements

- [ ] Add guest conversion prompt in email confirmations
- [ ] Add guest filter toggle in analytics dashboard
- [ ] Track guest-to-customer conversion rate
- [ ] Send targeted "Create Account" campaigns to high-value guests

---

## References

- Auth Service: `convex/services/auth.ts`
- Customer Analytics: `convex/services/customerBranchActivity.ts`
- UI Component: `src/components/admin/BranchCustomerAnalytics.jsx`
