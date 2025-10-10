# Notification Recipient Type Fix

## Issue Description

Customer booking notifications ("Booking Received") were appearing in staff members' notification panels instead of only showing to customers. This was a critical logic error in the notification distribution system.

## Root Cause

The bug was in the `sendToBranchStaff` and `sendToAdminUsers` helper functions in `/convex/services/bookingNotifications.ts`.

### The Problem

When creating individual notifications for staff members, the code was using the `recipientType` parameter passed to the function:

```typescript
// WRONG - Line 411 (before fix)
recipient_type: recipientType,  // This could be "customer", "staff", etc.
```

This meant that when we called `sendToBranchStaff` with a notification intended for customers, the staff members were getting notifications with `recipient_type: "customer"`, which caused customer notifications to show up for staff.

## The Fix

### Changed in `sendToBranchStaff` function (Line 411)
```typescript
// BEFORE
recipient_type: recipientType,

// AFTER  
recipient_type: "staff", // Always "staff" for individual staff notifications
```

### Changed in `sendToAdminUsers` function (Line 486)
```typescript
// BEFORE
recipient_type: recipientType,

// AFTER
recipient_type: "admin", // Always "admin" for admin notifications
```

## Impact

### Before Fix
- ❌ Customer notifications ("Booking Received") appeared for staff
- ❌ Wrong recipient_type stored in database
- ❌ Notification filtering didn't work correctly
- ❌ Poor user experience for both customers and staff

### After Fix
- ✅ Customer notifications only go to customers
- ✅ Staff notifications only go to staff
- ✅ Admin notifications only go to admins
- ✅ Proper recipient_type stored in database
- ✅ Correct notification filtering
- ✅ Clean separation of notification types

## How Notifications Work Now

### Customer Booking Flow
1. **Customer creates booking**
   - Customer receives: "Booking Received" (recipient_type: "customer")
   - Staff receives: "New Booking" (recipient_type: "staff")
   - Barber receives: "New Assignment" (recipient_type: "barber")

2. **Staff confirms booking**
   - Customer receives: "Booking Confirmed" (recipient_type: "customer")
   - Staff notification created (recipient_type: "staff")
   - Barber notification created (recipient_type: "barber")

### Notification Distribution Logic

```typescript
// Customer notification - ONLY customers see this
{
  title: "Booking Received",
  message: "Your booking has been received...",
  recipient_id: customerId,
  recipient_type: "customer", // Ensures only customer sees this
}

// Staff notification - ONLY staff see this
{
  title: "New Booking",
  message: "New booking from customer...",
  recipient_id: staffId,
  recipient_type: "staff", // Ensures only staff sees this
}
```

## Testing Performed

### Test Scenario 1: Customer Creates Booking
- [x] Customer receives "Booking Received" notification
- [x] Customer notification shows in customer's panel only
- [x] Staff receives "New Booking" notification
- [x] Staff notification shows in staff panel only
- [x] No cross-contamination of notifications

### Test Scenario 2: Staff Confirms Booking
- [x] Customer receives "Booking Confirmed"
- [x] Staff receives confirmation notification
- [x] Each user type sees only their notifications

### Test Scenario 3: Notification Queries
- [x] `getUserNotifications` returns correct notifications for customer
- [x] `getUserNotifications` returns correct notifications for staff
- [x] Branch-wide notifications work correctly
- [x] Recipient type filtering works properly

## Database Impact

### Notifications Table Structure
```typescript
{
  recipient_id: Id<"users">,     // Specific user or undefined for branch-wide
  recipient_type: "customer" | "staff" | "admin" | "barber", // NOW CORRECT
  branch_id: Id<"branches">,     // For branch scoping
  // ... other fields
}
```

### Query Filtering
```typescript
// Customers see only customer notifications
query.filter(q => q.eq(q.field("recipient_type"), "customer"))

// Staff see only staff notifications
query.filter(q => q.eq(q.field("recipient_type"), "staff"))
```

## Files Modified

1. `/convex/services/bookingNotifications.ts`
   - Line 411: Fixed `sendToBranchStaff` recipient_type
   - Line 486: Fixed `sendToAdminUsers` recipient_type

## Deployment

- ✅ Changes deployed to Convex dev environment
- ✅ Backend functions updated
- ✅ No frontend changes required
- ✅ No database migration needed (new notifications will have correct types)

## Legacy Data

**Note**: Old notifications in the database may still have incorrect `recipient_type` values. These will naturally expire based on the expiration dates. New notifications created after this fix will have correct recipient types.

### Optional Cleanup (if needed)
If you want to clean up old incorrect notifications:

```typescript
// Delete old incorrect customer notifications sent to staff
const incorrectNotifications = await ctx.db
  .query("notifications")
  .filter(q => 
    q.and(
      q.eq(q.field("recipient_type"), "customer"),
      q.neq(q.field("recipient_id"), undefined),
      // Add more filters to identify incorrect ones
    )
  )
  .collect();
```

## Best Practices Implemented

1. **Explicit Type Assignment**: Always explicitly set `recipient_type` based on the actual recipient role
2. **No Parameter Reuse**: Don't blindly pass parameters that might have wrong values
3. **Type Safety**: Hardcode recipient types where the context is known
4. **Clear Separation**: Maintain clear boundaries between user type notifications

## Future Improvements

1. **Type Safety**: Use TypeScript enums for recipient types
2. **Validation**: Add runtime validation for recipient_type
3. **Monitoring**: Add logging to track notification distribution
4. **Testing**: Add unit tests for notification helper functions

---

**Fix Date**: December 2024  
**Status**: ✅ Deployed and Tested  
**Priority**: Critical - User Experience Fix
