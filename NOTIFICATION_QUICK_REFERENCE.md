# Notification System - Quick Reference Guide

## 🎯 Quick Overview

All booking CRUD operations now automatically send appropriate notifications to customers, staff, and barbers. No manual notification calls needed in most cases.

## 📋 What Notifications Are Sent?

### Creating a Booking
```typescript
createBooking({ customer, service, branch_id, barber, date, time })
```
**Automatically sends:**
- ✉️ Customer: "Booking Received"
- 🔔 Staff: "New Booking" (branch-wide)
- 👨‍💼 Barber: "New Assignment" (if assigned)

### Creating a Walk-in Booking
```typescript
createWalkInBooking({ customer_name, service, branch_id, barber, date, time })
```
**Automatically sends:**
- 🔔 Staff: "Walk-in Customer" (branch-wide)
- 👨‍💼 Barber: "New Assignment" (if assigned)

### Updating a Booking

#### Status Changes
```typescript
updateBooking({ id, status: "confirmed" })
```
- ✅ **confirmed**: Notifies customer, staff, and barber
- ❌ **cancelled**: Notifies customer, staff, and barber
- ✔️ **completed**: Notifies customer and barber
- 📝 **booked**: Notifies customer (if from pending)

#### Reschedule
```typescript
updateBooking({ id, date: "2024-01-20", time: "15:00" })
```
**Automatically sends:**
- ✉️ Customer: "Booking Rescheduled" with new date/time
- 🔔 Staff: "Booking Rescheduled"
- 👨‍💼 Barber: "Appointment Rescheduled"

#### Barber Change
```typescript
updateBooking({ id, barber: newBarberId })
```
**Automatically sends:**
- 👨‍💼 New Barber: "New Assignment"
- 👨‍💼 Old Barber: "Appointment Cancelled"
- ✉️ Customer: "Barber Changed"

### Deleting a Booking
```typescript
deleteBooking({ id })
```
**Automatically sends:**
- ✉️ Customer: "Booking Cancelled"
- 🔔 Staff: "Booking Deleted"
- 👨‍💼 Barber: "Appointment Cancelled"

## 🔧 Manual Notifications

If you need to send a custom notification:

```typescript
await ctx.runMutation(api.services.notifications.createNotification, {
  title: "Your Title",
  message: "Your message here",
  type: "booking", // or "payment", "system", "promotion", "reminder", "alert"
  priority: "medium", // or "low", "high", "urgent"
  recipient_id: userId,
  recipient_type: "customer", // or "staff", "barber", "admin"
  branch_id: branchId, // optional, for branch-scoped notifications
  action_url: "/bookings/123", // optional, deep link
  action_label: "View Details", // optional, button text
  metadata: { custom: "data" }, // optional
});
```

## 📊 Notification Templates

### Available Template Types

| Template | When Used | Recipients |
|----------|-----------|------------|
| `CUSTOMER_BOOKING_RECEIVED` | Booking created | Customer |
| `CUSTOMER_BOOKING_CONFIRMED` | Status → confirmed | Customer, Staff |
| `CUSTOMER_BOOKING_REMINDER` | 24h before appointment | Customer |
| `CUSTOMER_BOOKING_CANCELLED` | Status → cancelled or deleted | Customer, Staff |
| `CUSTOMER_BOOKING_RESCHEDULED` | Date/time changed | Customer, Staff, Barber |
| `CUSTOMER_PAYMENT_RECEIVED` | Payment completed | Customer |
| `STAFF_NEW_BOOKING` | New booking created | Staff (branch-wide) |
| `STAFF_WALKIN_BOOKING` | Walk-in created | Staff (branch-wide) |
| `STAFF_BOOKING_CANCELLED` | Booking cancelled | Staff (branch-wide) |
| `BARBER_NEW_ASSIGNMENT` | Barber assigned | Barber |
| `BARBER_APPOINTMENT_CANCELLED` | Booking cancelled or barber changed | Barber |
| `BARBER_APPOINTMENT_RESCHEDULED` | Date/time changed | Barber |

## 🎨 Notification Priority Levels

- **`urgent`**: Critical issues requiring immediate attention
- **`high`**: Important notifications (walk-ins, cancellations)
- **`medium`**: Standard notifications (confirmations, updates)
- **`low`**: Informational messages (completions)

## 🔍 Querying Notifications

### Get User Notifications
```typescript
const notifications = useQuery(api.services.notifications.getUserNotifications, {
  userId: currentUser._id,
  limit: 50 // optional, default 50
});
```

### Get Unread Count
```typescript
const unreadCount = useQuery(api.services.notifications.getUnreadCount, {
  userId: currentUser._id
});
```

### Mark as Read
```typescript
await markAsRead({
  notificationId: notification._id,
  userId: currentUser._id
});
```

### Mark All as Read
```typescript
await markAllAsRead({
  userId: currentUser._id
});
```

## 🚨 Common Issues & Solutions

### Notifications Not Appearing
1. ✅ Check user is active: `user.is_active === true`
2. ✅ Verify recipient_id is correct
3. ✅ Confirm branch_id matches user's branch
4. ✅ Check console for error logs

### Duplicate Notifications
- This shouldn't happen - each CRUD operation sends notifications once
- Check if you're calling notification functions manually

### Branch-Wide Notifications Not Visible
- Ensure user has correct role: `staff`, `branch_admin`, or `barber`
- Verify branch_id matches
- Check `by_branch_type` index is properly set

## 💡 Best Practices

### DO
- ✅ Let CRUD operations handle notifications automatically
- ✅ Use appropriate priority levels
- ✅ Include action_url for better UX
- ✅ Add metadata for context
- ✅ Check notification errors in logs

### DON'T
- ❌ Call notification functions manually for standard booking operations
- ❌ Send duplicate notifications
- ❌ Ignore error logs
- ❌ Create notifications without branch_id for branch-scoped content
- ❌ Use "urgent" priority for routine notifications

## 🔐 Security Notes

- Notifications respect branch isolation
- Users can only access their own notifications or branch-wide notifications
- Super admins can see all admin-level notifications
- Notification permissions are enforced at the database level

## 🎯 Testing Tips

```bash
# Test notification flow
1. Create a booking → Check customer and staff receive notifications
2. Confirm booking → Check all parties receive confirmation
3. Reschedule booking → Check reschedule notifications
4. Cancel booking → Check cancellation notifications
5. Change barber → Check both barbers receive notifications
6. Delete booking → Check deletion notifications

# Check Convex dashboard for real-time updates
https://dashboard.convex.dev/d/woozy-whale-1
```

## 📞 Support

If you encounter issues:
1. Check Convex dashboard logs
2. Review browser console for errors
3. Verify database indexes are applied
4. Check NOTIFICATION_IMPLEMENTATION_COMPLETE.md for detailed docs

---

**Quick Start**: Just use the booking CRUD operations as normal. Notifications are automatic! ✨
