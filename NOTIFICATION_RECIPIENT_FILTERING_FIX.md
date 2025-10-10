# Notification Recipient Filtering Fix

## Issue Description

Staff members were seeing customer notifications ("Booking Received") and vice versa. This was caused by insufficient filtering in the notification query logic.

## Root Cause

The `getUserNotifications` query in `/convex/services/notifications.ts` was fetching notifications based ONLY on `recipient_id` without validating that the `recipient_type` matched the user's role.

### The Problem Code

```typescript
// BEFORE - Line 21-28
const directNotifications = await ctx.db
  .query("notifications")
  .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
  .order("desc")
  .take(limit);

notifications.push(...directNotifications);
```

This meant:
- If a notification had `recipient_id: staffUserId` but `recipient_type: "customer"`, staff would see it
- No validation that the notification type matched the user's role
- Cross-contamination of notifications between user types

## The Fix

### Added Role-Based Filtering

```typescript
// AFTER - Lines 21-43
const directNotifications = await ctx.db
  .query("notifications")
  .withIndex("by_recipient", (q) => q.eq("recipient_id", userId))
  .order("desc")
  .collect();

// Filter to only include notifications that match the user's role/type
const roleMapping = {
  'customer': 'customer',
  'staff': 'staff',
  'branch_admin': 'admin',
  'super_admin': 'admin',
  'barber': 'barber',
  'admin': 'admin'
};

const userType = roleMapping[user.role] || user.role;
const filteredDirectNotifications = directNotifications
  .filter(n => n.recipient_type === userType)
  .slice(0, limit);

notifications.push(...filteredDirectNotifications);
```

### Key Changes

1. **Role Mapping**: Created a mapping from user roles to notification recipient types
2. **Type Filtering**: Filter notifications to ensure `recipient_type` matches the user's role
3. **Explicit Validation**: No notification shows unless both `recipient_id` AND `recipient_type` match

## How It Works Now

### Customer Creates Booking

**Notifications Created:**
```typescript
// Customer notification
{
  recipient_id: customerId,
  recipient_type: "customer",
  title: "Booking Received",
  // ... other fields
}

// Staff notification
{
  recipient_id: staffId,
  recipient_type: "staff",
  title: "New Booking",
  // ... other fields
}
```

**What Each User Sees:**

| User Type | Sees | Doesn't See |
|-----------|------|-------------|
| Customer  | "Booking Received" (recipient_type: "customer") | "New Booking" (recipient_type: "staff") |
| Staff     | "New Booking" (recipient_type: "staff") | "Booking Received" (recipient_type: "customer") |
| Barber    | "New Assignment" (recipient_type: "barber") | Customer/Staff notifications |

### Query Logic Flow

```
1. Get user by userId
2. Determine user's role (e.g., "staff")
3. Map role to recipient_type (e.g., "staff" → "staff")
4. Fetch all notifications with recipient_id = userId
5. Filter to only those where recipient_type = "staff"
6. Return filtered results
```

## Role to Recipient Type Mapping

| User Role | Notification Recipient Type |
|-----------|----------------------------|
| customer | customer |
| staff | staff |
| branch_admin | admin |
| super_admin | admin |
| barber | barber |
| admin | admin |

## Multi-Layer Protection

This fix works in combination with the previous fix:

### Layer 1: Correct Creation (Previous Fix)
- Notifications created with correct `recipient_type`
- `sendToBranchStaff` always sets `recipient_type: "staff"`
- `sendToAdminUsers` always sets `recipient_type: "admin"`

### Layer 2: Query Filtering (This Fix)
- Notifications filtered by both `recipient_id` AND `recipient_type`
- Users only see notifications matching their role
- Double validation prevents any leakage

## Files Modified

1. `/convex/services/notifications.ts`
   - Lines 21-43: Added role mapping and filtering
   - Line 56: Updated variable name for clarity
   - Line 73: Updated variable name for clarity

## Testing Performed

### Test Scenario 1: Customer Books Appointment
- [x] Customer sees "Booking Received"
- [x] Customer does NOT see "New Booking"
- [x] Staff sees "New Booking"
- [x] Staff does NOT see "Booking Received"

### Test Scenario 2: Staff Confirms Booking
- [x] Customer sees "Booking Confirmed"
- [x] Staff sees confirmation in their panel
- [x] No cross-contamination

### Test Scenario 3: Multiple User Types
- [x] Customers only see customer notifications
- [x] Staff only see staff notifications
- [x] Barbers only see barber notifications
- [x] Admins only see admin notifications

### Test Scenario 4: Branch-Wide Notifications
- [x] Staff see branch-wide notifications
- [x] Branch-wide notifications have correct type
- [x] Customers don't see staff branch notifications

## Impact

### Before Fix
- ❌ Customers saw staff notifications
- ❌ Staff saw customer notifications
- ❌ Confusing user experience
- ❌ Privacy concerns
- ❌ Wrong notification counts

### After Fix
- ✅ Perfect role-based isolation
- ✅ Customers only see customer notifications
- ✅ Staff only see staff notifications
- ✅ Barbers only see barber notifications
- ✅ Admins only see admin notifications
- ✅ Clean user experience
- ✅ Accurate notification counts

## Performance Considerations

### Query Changes
- **Before**: `take(limit)` - Limited at database level
- **After**: `collect()` then `filter()` then `slice(limit)` - Processes in memory

### Impact Assessment
- **Small to Medium Scale** (< 1000 notifications per user): Negligible impact
- **Large Scale**: Consider adding compound index `by_recipient_type` for optimization

### Potential Optimization (If Needed)
```typescript
// Add this index to schema if performance becomes an issue
.index("by_recipient_id_type", ["recipient_id", "recipient_type"])
```

Then query directly:
```typescript
const directNotifications = await ctx.db
  .query("notifications")
  .withIndex("by_recipient_id_type", (q) => 
    q.eq("recipient_id", userId).eq("recipient_type", userType)
  )
  .order("desc")
  .take(limit);
```

## Edge Cases Handled

1. **Unknown Role**: Falls back to using the role as-is
2. **Multiple Admin Roles**: Both `branch_admin` and `super_admin` map to "admin"
3. **Branch-Wide Notifications**: Still work correctly with type filtering
4. **Empty Results**: Returns empty array if no matching notifications

## Backward Compatibility

- ✅ Existing notifications in database work correctly
- ✅ No migration needed
- ✅ New notifications automatically follow new rules
- ✅ Old incorrect notifications will be filtered out

## Security Benefits

1. **Role Isolation**: Users can't see notifications for other roles
2. **Branch Isolation**: Combined with branch filtering for multi-tenancy
3. **Data Privacy**: Customer data not exposed to staff and vice versa
4. **Type Safety**: Explicit type checking prevents accidents

## Related Fixes

This fix builds on:
1. **NOTIFICATION_RECIPIENT_TYPE_FIX.md**: Fixed notification creation
2. **NOTIFICATION_IMPLEMENTATION_COMPLETE.md**: Original notification system

Together, these provide:
- ✅ Correct notification creation
- ✅ Correct notification querying
- ✅ Complete role-based isolation

---

**Fix Date**: December 2024  
**Status**: ✅ Deployed and Tested  
**Priority**: Critical - Security & UX Fix  
**Impact**: All notification queries
