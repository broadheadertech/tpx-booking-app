# Notification API Documentation

## Overview
The Notification API provides endpoints to retrieve user notifications for booking confirmations and voucher redemptions.

## Base URL
```
https://tpx-web-service.onrender.com/api/
```

## Authentication
All notification endpoints require JWT authentication. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Endpoints

### GET /notifications/
Retrieve all notifications for the authenticated user.

**Method:** `GET`  
**URL:** `/api/notifications/`  
**Auth Required:** Yes  
**Permissions:** Authenticated users only  

#### Response Format
```json
[
    {
        "id": 1,
        "title": "Booking Confirmed",
        "message": "Your booking for Haircut with John Smith on 2025-08-18 at 14:30 has been confirmed. Booking code: BK-A7X9M2K1",
        "created_at": "2025-08-18T14:25:00Z",
        "read": false
    },
    {
        "id": 2,
        "title": "Voucher Redeemed",
        "message": "You successfully redeemed voucher SAVE20 worth 20.00",
        "created_at": "2025-08-17T10:15:00Z",
        "read": true
    }
]
```

#### Response Fields
- `id` (integer): Unique notification ID
- `title` (string): Notification title
- `message` (string): Detailed notification message
- `created_at` (datetime): When the notification was created (ISO 8601 format)
- `read` (boolean): Whether the notification has been read

#### Status Codes
- `200 OK`: Successfully retrieved notifications
- `401 Unauthorized`: Invalid or missing authentication token

## Notification Types

### 1. Booking Confirmations
**Trigger:** When a user creates a new booking  
**Title:** "Booking Confirmed"  
**Message Format:** "Your booking for {service_name} with {barber_name} on {date} at {time} has been confirmed. Booking code: {booking_code}"

### 2. Voucher Redemptions
**Trigger:** When a user redeems a voucher  
**Title:** "Voucher Redeemed"  
**Message Format:** "You successfully redeemed voucher {code} worth {value}"

### 3. Staff Voucher Claims
**Trigger:** When staff claims a voucher for a user  
**Title:** "Voucher Claimed by Staff"  
**Message Format:** "Your voucher {code} worth {value} has been claimed for you by staff."

## Example Usage

### Fetch User Notifications
```bash
curl -X GET "https://tpx-web-service.onrender.com/api/notifications/" \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
```

### JavaScript/Fetch Example
```javascript
const response = await fetch('/api/notifications/', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

const notifications = await response.json();
console.log(notifications);
```

## Notes
- Notifications are ordered by creation date (newest first)
- Users can only see their own notifications
- No pagination is currently implemented
- The `read` field is available but no endpoint exists to mark notifications as read (future enhancement)

## Related Endpoints
- `POST /api/bookings/` - Creates booking and triggers notification
- `POST /api/vouchers/redeem/` - Redeems voucher and triggers notification
