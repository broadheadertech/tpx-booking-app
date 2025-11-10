# Convex Database Schema Documentation

## Overview

This document provides comprehensive documentation of the Convex database schema for the TPX (Tipunox) Barbershop Booking Application. The schema is defined in `/Users/dale/Documents/tpx-booking-app/convex/schema.ts` and follows Convex's type-safe database modeling approach.

## Database Architecture

The application uses **Convex** as its backend database, which provides:
- Real-time data synchronization
- Automatic type generation from schema definitions
- Built-in indexing for query optimization
- Server-side query and mutation functions
- Automatic schema migration through code deployment

### Key Characteristics
- **Schema-first approach**: All data models are defined in TypeScript with strict typing
- **Document-based**: Uses a NoSQL document model with collections (tables)
- **Type-safe**: Generated TypeScript types for all database operations
- **Indexing strategy**: Comprehensive indexing for performance optimization
- **Relationship modeling**: Uses document references (IDs) for relationships

## Core Tables

### 1. Branches (`branches`)

Multi-branch support for the barbershop chain.

**Fields:**
- `branch_code`: `string` - Unique branch identifier
- `name`: `string` - Branch display name
- `address`: `string` - Physical address
- `phone`: `string` - Contact phone number
- `email`: `string` - Contact email
- `is_active`: `boolean` - Active status for the branch
- `booking_start_hour`: `number?` - Start hour for bookings (0-23)
- `booking_end_hour`: `number?` - End hour for bookings (0-23)
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_branch_code`: Unique branch code lookup
- `by_active`: Filter active branches
- `by_created_at`: Sort by creation date

### 2. Users (`users`)

User accounts for all system roles.

**Fields:**
- `username`: `string` - Unique username
- `email`: `string` - Unique email address
- `password`: `string` - Hashed password
- `nickname`: `string?` - Display name
- `mobile_number`: `string` - Phone number
- `address`: `string?` - User address
- `birthday`: `string?` - Birth date
- `role`: `union` - User role: `"staff" | "customer" | "admin" | "barber" | "super_admin" | "branch_admin"`
- `branch_id`: `Id<branches>?` - Assigned branch (optional for customers)
- `is_active`: `boolean` - Account status
- `avatar`: `string?` - Profile image URL
- `bio`: `string?` - User biography
- `skills`: `string[]` - Skill tags
- `isVerified`: `boolean` - Verification status
- `password_reset_token`: `string?` - Password reset token
- `password_reset_expires`: `number?` - Reset token expiry
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_email`: Unique email lookup
- `by_username`: Unique username lookup
- `by_created_at`: Sort by creation date
- `by_branch`: Filter by branch
- `by_role`: Filter by role
- `by_branch_role`: Combined branch and role filtering

**Validation Rules:**
- Email and username uniqueness enforced
- Role-specific branch requirements
- Password hashing for security
- Mobile number format validation

### 3. Barbers (`barbers`)

Extended barber profiles with schedule and services.

**Fields:**
- `user`: `Id<users>` - Link to user account
- `branch_id`: `Id<branches>` - Primary branch
- `full_name`: `string` - Professional name
- `is_active`: `boolean` - Active status
- `services`: `Id<services>[]` - Available services
- `email`: `string` - Professional email
- `phone`: `string?` - Contact phone
- `avatar`: `string?` - Profile image URL
- `avatarStorageId`: `Id<_storage>?` - Convex storage ID
- `experience`: `string` - Experience description
- `rating`: `number` - Average rating (1-5)
- `totalBookings`: `number` - Total completed bookings
- `monthlyRevenue`: `number` - Monthly revenue tracking
- `specialties`: `string[]` - Specialization areas
- `schedule`: `object` - Weekly availability schedule
  - Each day: `{available: boolean, start: string, end: string}`
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_user`: Link to user account
- `by_active`: Filter active barbers
- `by_branch`: Filter by branch

### 4. Services (`services`)

Service offerings available at each branch.

**Fields:**
- `branch_id`: `Id<branches>` - Offering branch
- `name`: `string` - Service name
- `description`: `string` - Service description
- `price`: `number` - Service price in local currency
- `duration_minutes`: `number` - Service duration
- `category`: `string` - Service category
- `is_active`: `boolean` - Active status
- `image`: `string?` - Service image URL
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_category`: Filter by category
- `by_active`: Filter active services
- `by_branch`: Filter by branch

## Booking System Tables

### 5. Bookings (`bookings`)

Core booking records for appointments.

**Fields:**
- `booking_code`: `string` - Unique 8-character booking code
- `branch_id`: `Id<branches>` - Service branch
- `customer`: `Id<users>?` - Customer account (optional for walk-ins)
- `customer_name`: `string?` - Walk-in customer name
- `customer_phone`: `string?` - Walk-in customer phone
- `customer_email`: `string?` - Walk-in customer email
- `service`: `Id<services>` - Booked service
- `barber`: `Id<barbers>?` - Assigned barber
- `date`: `string` - Booking date (YYYY-MM-DD)
- `time`: `string` - Booking time (HH:MM format)
- `status`: `union` - `"pending" | "booked" | "confirmed" | "completed" | "cancelled"`
- `payment_status`: `union?` - `"unpaid" | "paid" | "refunded"`
- `price`: `number` - Service price
- `voucher_id`: `Id<vouchers>?` - Applied voucher
- `discount_amount`: `number?` - Discount applied
- `final_price`: `number?` - Price after discount
- `notes`: `string?` - Booking notes
- `reminder_sent`: `boolean?` - Reminder notification status
- `check_in_reminder_sent`: `boolean?` - Check-in reminder status
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_customer`: Customer booking history
- `by_barber`: Barber schedule lookup
- `by_date`: Daily schedule filtering
- `by_status`: Status-based filtering
- `by_payment_status`: Payment status filtering
- `by_booking_code`: Quick lookup by code
- `by_branch`: Branch-specific bookings
- `by_date_reminder`: Reminder scheduling optimization

### 6. Vouchers (`vouchers`)

Promotional voucher system.

**Fields:**
- `code`: `string` - Unique voucher code
- `value`: `number` - Discount value
- `points_required`: `number` - Loyalty points needed
- `max_uses`: `number` - Maximum usage limit
- `expires_at`: `number` - Expiration timestamp
- `description`: `string?` - Voucher description
- `branch_id`: `Id<branches>` - Issuing branch
- `created_by`: `Id<users>` - Creator user ID
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp
- `redeemed`: `boolean?` - Legacy redemption status
- `redeemed_by`: `Id<users>?` - Legacy redeemer
- `redeemed_at`: `number?` - Legacy redemption time

**Indexes:**
- `by_code`: Voucher lookup
- `by_created_by`: Creator tracking
- `by_branch`: Branch-specific vouchers

### 7. User Vouchers (`user_vouchers`)

Many-to-many relationship between users and vouchers.

**Fields:**
- `voucher_id`: `Id<vouchers>` - Voucher reference
- `user_id`: `Id<users>?` - User owner (optional for staff)
- `status`: `union` - `"assigned" | "redeemed"`
- `assigned_at`: `number` - Assignment timestamp
- `redeemed_at`: `number?` - Redemption timestamp
- `assigned_by`: `Id<users>?` - Assigner (optional for staff)

**Indexes:**
- `by_voucher`: Voucher usage tracking
- `by_user`: User voucher inventory
- `by_status`: Status filtering
- `by_voucher_user`: Unique voucher-user combinations

## Point of Sale (POS) Tables

### 8. Products (`products`)

Product inventory management.

**Fields:**
- `name`: `string` - Product name
- `description`: `string` - Product description
- `price`: `number` - Selling price
- `cost`: `number` - Cost price
- `category`: `union` - `"hair-care" | "beard-care" | "shaving" | "tools" | "accessories"`
- `brand`: `string` - Product brand
- `sku`: `string` - Stock keeping unit
- `stock`: `number` - Current inventory
- `minStock`: `number` - Minimum stock threshold
- `imageUrl`: `string?` - Product image URL
- `imageStorageId`: `Id<_storage>?` - Convex storage ID
- `status`: `union` - `"active" | "inactive" | "out-of-stock"`
- `soldThisMonth`: `number` - Monthly sales tracking
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_category`: Category filtering
- `by_sku`: SKU lookup
- `by_status`: Status filtering
- `by_stock`: Inventory management

### 9. Transactions (`transactions`)

Point of sale transaction records.

**Fields:**
- `transaction_id`: `string` - Unique transaction identifier
- `branch_id`: `Id<branches>` - Transaction branch
- `customer`: `Id<users>?` - Customer account (optional for walk-ins)
- `customer_name`: `string?` - Walk-in customer name
- `customer_phone`: `string?` - Walk-in customer phone
- `customer_email`: `string?` - Walk-in customer email
- `customer_address`: `string?` - Walk-in customer address
- `barber`: `Id<barbers>` - Service provider
- `services`: `object[]` - Array of service objects:
  - `service_id`: `Id<services>`
  - `service_name`: `string`
  - `price`: `number`
  - `quantity`: `number`
- `products`: `object[]?` - Array of product objects:
  - `product_id`: `Id<products>`
  - `product_name`: `string`
  - `price`: `number`
  - `quantity`: `number`
- `subtotal`: `number` - Subtotal before tax
- `discount_amount`: `number` - Applied discount
- `voucher_applied`: `Id<vouchers>?` - Used voucher
- `tax_amount`: `number` - Tax amount
- `total_amount`: `number` - Final total
- `payment_method`: `union` - `"cash" | "card" | "digital_wallet" | "bank_transfer"`
- `payment_status`: `union` - `"pending" | "completed" | "failed" | "refunded"`
- `notes`: `string?` - Transaction notes
- `cash_received`: `number?` - Cash amount received
- `change_amount`: `number?` - Change given back
- `receipt_number`: `string` - Receipt identifier
- `processed_by`: `Id<users>` - Staff processor
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_transaction_id`: Transaction lookup
- `by_customer`: Customer transaction history
- `by_barber`: Barber performance tracking
- `by_receipt_number`: Receipt lookup
- `by_payment_status`: Payment filtering
- `by_created_at`: Chronological sorting
- `by_processed_by`: Staff performance tracking
- `by_branch`: Branch-specific transactions

### 10. POS Sessions (`pos_sessions`)

Active POS session tracking for state management.

**Fields:**
- `session_id`: `string` - Unique session identifier
- `staff_member`: `Id<users>` - Session operator
- `barber`: `Id<barbers>?` - Selected barber
- `status`: `union` - `"active" | "paused" | "closed"`
- `current_transaction`: `object?` - Current transaction state
- `started_at`: `number` - Session start time
- `last_activity`: `number` - Last activity timestamp
- `closed_at`: `number?` - Session close time

**Indexes:**
- `by_session_id`: Session lookup
- `by_staff_member`: Staff session tracking
- `by_status`: Status filtering
- `by_started_at`: Session timing

## Payment Integration

### 11. Payments (`payments`)

External payment processing records (Xendit integration).

**Fields:**
- `booking_id`: `Id<bookings>` - Associated booking
- `payment_request_id`: `string` - Payment gateway request ID
- `reference_id`: `string` - Payment reference
- `amount`: `number` - Payment amount
- `payment_method`: `string` - Payment method type
- `status`: `string` - Payment status
- `webhook_data`: `any?` - Webhook response data
- `created_at`: `number` - Creation timestamp
- `updated_at`: `number` - Last update timestamp

**Indexes:**
- `by_booking_id`: Booking payment lookup
- `by_payment_request_id`: Gateway request tracking
- `by_reference_id`: Payment reference lookup
- `by_status`: Status filtering

## User Engagement Tables

### 12. Ratings (`ratings`)

Customer feedback and rating system.

**Fields:**
- `booking_id`: `Id<bookings>` - Related booking
- `customer_id`: `Id<users>` - Rating customer
- `barber_id`: `Id<barbers>` - Rated barber
- `service_id`: `Id<services>` - Rated service
- `rating`: `number` - Star rating (1-5)
- `feedback`: `string?` - Customer feedback
- `created_at`: `number` - Creation timestamp
- `updated_at`: `number` - Last update timestamp

**Indexes:**
- `by_booking`: Booking relationship
- `by_customer`: Customer rating history
- `by_barber`: Barber performance tracking
- `by_service`: Service quality tracking
- `by_rating`: Rating-based filtering
- `by_created_at`: Chronological sorting

### 13. Events (`events`)

Event management system.

**Fields:**
- `title`: `string` - Event title
- `description`: `string` - Event description
- `date`: `string` - Event date
- `time`: `string` - Event time
- `location`: `string` - Event location
- `maxAttendees`: `number` - Maximum capacity
- `currentAttendees`: `number` - Current registration count
- `price`: `number` - Event price
- `category`: `union` - `"workshop" | "celebration" | "training" | "promotion"`
- `status`: `union` - `"upcoming" | "ongoing" | "completed" | "cancelled"`
- `branch_id`: `Id<branches>` - Hosting branch
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_date`: Date-based filtering
- `by_status`: Status filtering
- `by_category`: Category filtering
- `by_branch`: Branch-specific events

### 14. Notifications (`notifications`)

User notification system.

**Fields:**
- `title`: `string` - Notification title
- `message`: `string` - Notification message
- `type`: `union` - `"booking" | "payment" | "system" | "promotion" | "reminder" | "alert"`
- `priority`: `union` - `"low" | "medium" | "high" | "urgent"`
- `recipient_id`: `Id<users>?` - Target user (optional for branch-wide)
- `recipient_type`: `union` - `"staff" | "customer" | "admin" | "barber"`
- `sender_id`: `Id<users>?` - Sender user ID
- `branch_id`: `Id<branches>?` - Branch scope
- `is_read`: `boolean` - Read status
- `is_archived`: `boolean` - Archive status
- `action_url`: `string?` - Action link URL
- `action_label`: `string?` - Action button text
- `metadata`: `any?` - Additional data
- `expires_at`: `number?` - Expiration timestamp
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_recipient`: User notification lookup
- `by_recipient_type`: Role-based filtering
- `by_branch`: Branch notifications
- `by_branch_type`: Combined branch and role filtering
- `by_type`: Notification type filtering
- `by_priority`: Priority-based ordering
- `by_read_status`: Read/unread filtering
- `by_created_at`: Chronological sorting
- `by_recipient_read`: User read status lookup
- `by_branch_read`: Branch read status lookup
- `by_recipient_archived`: User archive status lookup

## Payroll Management Tables

### 15. Payroll Settings (`payroll_settings`)

Branch-specific payroll configuration.

**Fields:**
- `branch_id`: `Id<branches>` - Configuration branch
- `default_commission_rate`: `number` - Default commission percentage
- `payout_frequency`: `union` - `"weekly" | "bi_weekly" | "monthly"`
- `payout_day`: `number` - Payout schedule day
- `tax_rate`: `number?` - Tax deduction percentage
- `is_active`: `boolean` - Settings status
- `created_by`: `Id<users>` - Configuration creator
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_branch`: Branch-specific settings
- `by_active`: Active settings filtering

### 16. Barber Commission Rates (`barber_commission_rates`)

Individual barber commission configurations.

**Fields:**
- `barber_id`: `Id<barbers>` - Barber reference
- `branch_id`: `Id<branches>` - Branch context
- `commission_rate`: `number` - Commission percentage
- `effective_from`: `number` - Effective start date
- `effective_until`: `number?` - Effective end date (null for current)
- `is_active`: `boolean` - Rate status
- `created_by`: `Id<users>` - Configuration creator
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_barber`: Barber rate history
- `by_branch`: Branch rate management
- `by_effective_from`: Time-based filtering
- `by_active`: Current rate lookup
- `by_barber_active`: Barber current rate lookup

### 17. Payroll Periods (`payroll_periods`)

Payroll calculation period tracking.

**Fields:**
- `branch_id`: `Id<branches>` - Branch context
- `period_start`: `number` - Period start timestamp
- `period_end`: `number` - Period end timestamp
- `period_type`: `union` - `"weekly" | "bi_weekly" | "monthly"`
- `status`: `union` - `"draft" | "calculated" | "paid" | "cancelled"`
- `total_earnings`: `number` - Total earnings for period
- `total_commissions`: `number` - Total commission payouts
- `total_deductions`: `number` - Total deductions
- `calculated_at`: `number?` - Calculation timestamp
- `paid_at`: `number?` - Payment completion timestamp
- `calculated_by`: `Id<users>?` - Calculation performer
- `paid_by`: `Id<users>?` - Payment processor
- `notes`: `string?` - Period notes
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_branch`: Branch payroll tracking
- `by_period_start`: Start date filtering
- `by_period_end`: End date filtering
- `by_status`: Status-based filtering
- `by_branch_status`: Combined branch and status filtering

### 18. Payroll Records (`payroll_records`)

Individual barber payroll calculations.

**Fields:**
- `payroll_period_id`: `Id<payroll_periods>` - Parent period
- `barber_id`: `Id<barbers>` - Barber reference
- `branch_id`: `Id<branches>` - Branch context
- `total_services`: `number` - Service count
- `total_service_revenue`: `number` - Service revenue
- `commission_rate`: `number` - Applied commission rate
- `gross_commission`: `number` - Commission before deductions
- `daily_rate`: `number?` - Daily base rate
- `days_worked`: `number?` - Work days count
- `daily_pay`: `number?` - Daily rate earnings
- `total_transactions`: `number` - POS transaction count
- `total_transaction_revenue`: `number` - POS revenue
- `transaction_commission`: `number` - POS commission
- `bookings_detail`: `object[]?` - Booking detail snapshot
- `tax_deduction`: `number` - Tax deductions
- `other_deductions`: `number` - Other deductions
- `total_deductions`: `number` - Total deductions
- `net_pay`: `number` - Final payment amount
- `payment_method`: `union?` - `"cash" | "bank_transfer" | "check" | "digital_wallet"`
- `payment_reference`: `string?` - Payment reference
- `paid_at`: `number?` - Payment timestamp
- `paid_by`: `Id<users>?` - Payment processor
- `status`: `union` - `"calculated" | "paid" | "cancelled"`
- `notes`: `string?` - Record notes
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_payroll_period`: Period relationship
- `by_barber`: Barber payroll history
- `by_branch`: Branch payroll tracking
- `by_status`: Payment status filtering
- `by_paid_at`: Payment date sorting
- `by_barber_period`: Unique barber-period combination

### 19. Service Commission Rates (`service_commission_rates`)

Per-service commission configurations.

**Fields:**
- `branch_id`: `Id<branches>` - Branch context
- `service_id`: `Id<services>` - Service reference
- `commission_rate`: `number` - Service-specific rate
- `effective_from`: `number` - Effective start date
- `effective_until`: `number?` - Effective end date
- `is_active`: `boolean` - Rate status
- `created_by`: `Id<users>` - Configuration creator
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_branch`: Branch service rates
- `by_service`: Service rate history
- `by_branch_service`: Unique branch-service combination
- `by_active`: Current rate filtering

### 20. Barber Daily Rates (`barber_daily_rates`)

Daily rate configurations for barbers.

**Fields:**
- `barber_id`: `Id<barbers>` - Barber reference
- `branch_id`: `Id<branches>` - Branch context
- `daily_rate`: `number` - Daily rate amount
- `effective_from`: `number` - Effective start date
- `effective_until`: `number?` - Effective end date
- `is_active`: `boolean` - Rate status
- `created_by`: `Id<users>` - Configuration creator
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_barber`: Barber rate history
- `by_branch`: Branch rate management
- `by_barber_active`: Barber current rate lookup

### 21. Payroll Adjustments (`payroll_adjustments`)

Manual payroll adjustments and corrections.

**Fields:**
- `payroll_record_id`: `Id<payroll_records>` - Parent record
- `barber_id`: `Id<barbers>` - Barber reference
- `branch_id`: `Id<branches>` - Branch context
- `adjustment_type`: `union` - `"bonus" | "deduction" | "correction"`
- `amount`: `number` - Adjustment amount (positive for bonus, negative for deduction)
- `reason`: `string` - Adjustment reason
- `description`: `string?` - Additional details
- `applied_by`: `Id<users>` - Adjustment creator
- `approved_by`: `Id<users>?` - Approval authority
- `is_approved`: `boolean` - Approval status
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_payroll_record`: Parent record relationship
- `by_barber`: Barber adjustment history
- `by_branch`: Branch adjustment tracking
- `by_type`: Adjustment type filtering
- `by_approved`: Approval status filtering

## Email Marketing Tables

### 22. Email Campaigns (`email_campaigns`)

Email marketing campaign management.

**Fields:**
- `branch_id`: `Id<branches>` - Campaign branch
- `name`: `string` - Campaign name
- `subject`: `string` - Email subject
- `body_html`: `string` - HTML email content
- `audience`: `union` - `"all_customers" | "new_customers" | "returning_customers" | "vip_customers"`
- `template_type`: `union?` - `"marketing" | "promotional" | "reminder" | "custom"`
- `from_email`: `string?` - Sender email override
- `tags`: `string[]?` - Campaign tags
- `status`: `union` - `"draft" | "scheduled" | "sending" | "sent" | "failed"`
- `scheduled_at`: `number?` - Scheduled send time
- `sent_at`: `number?` - Actual send time
- `total_recipients`: `number?` - Total recipients
- `sent_count`: `number?` - Successfully sent
- `failed_count`: `number?` - Failed sends
- `open_count`: `number?` - Email opens
- `click_count`: `number?` - Link clicks
- `unsubscribe_count`: `number?` - Unsubscribes
- `created_by`: `Id<users>` - Campaign creator
- `createdAt`: `number` - Creation timestamp
- `updatedAt`: `number` - Last update timestamp

**Indexes:**
- `by_branch`: Branch campaigns
- `by_status`: Status filtering
- `by_created_at`: Creation date sorting
- `by_template_type`: Template type filtering
- `by_audience`: Audience type filtering

### 23. Email Campaign Logs (`email_campaign_logs`)

Individual email delivery tracking.

**Fields:**
- `campaign_id`: `Id<email_campaigns>` - Parent campaign
- `recipient_email`: `string` - Recipient email address
- `recipient_id`: `Id<users>?` - Recipient user ID
- `status`: `union` - `"sent" | "failed"`
- `error`: `string?` - Error message if failed
- `createdAt`: `number` - Log timestamp

**Indexes:**
- `by_campaign`: Campaign delivery tracking
- `by_status`: Delivery status filtering

## Authentication & Session Management

### 24. Sessions (`sessions`)

User authentication session management.

**Fields:**
- `userId`: `Id<users>` - Session owner
- `token`: `string` - Session token
- `expiresAt`: `number` - Expiration timestamp
- `createdAt`: `number` - Creation timestamp

**Indexes:**
- `by_token`: Token-based session lookup
- `by_user`: User session management
- `by_expires_at`: Session cleanup filtering

## Data Relationships and Constraints

### Foreign Key Relationships

1. **Branch-Centric Architecture**:
   - All operational tables reference `branches`
   - Multi-branch data isolation
   - Branch-specific filtering and permissions

2. **User Role Hierarchy**:
   ```
   super_admin
   ├── admin
   ├── branch_admin
   ├── staff
   ├── barber
   └── customer
   ```

3. **Core Relationships**:
   - `users` → `branches` (staff assignments)
   - `barbers` → `users` (profile linkage)
   - `barbers` → `branches` (primary branch)
   - `services` → `branches` (service offerings)
   - `bookings` → `users` (customer accounts)
   - `bookings` → `barbers` (service assignments)
   - `bookings` → `services` (service selection)
   - `transactions` → `barbers` (service providers)

### Data Integrity Constraints

1. **Uniqueness Constraints**:
   - Email addresses (users.email)
   - Usernames (users.username)
   - Branch codes (branches.branch_code)
   - Booking codes (bookings.booking_code)
   - SKU codes (products.sku)
   - Voucher codes (vouchers.code)

2. **Referential Integrity**:
   - All ID references are validated at runtime
   - Cascade deletion handled in service functions
   - Optional relationships for walk-in customers

3. **Business Rules**:
   - Booking dates cannot be in the past
   - Commission rates between 0-100%
   - Rating values limited to 1-5
   - Stock levels cannot be negative
   - Session tokens have expiration dates

## Indexing Strategy

### Performance Optimization

1. **Primary Lookup Indexes**:
   - Unique identifiers for quick data retrieval
   - Email and username lookups for authentication
   - Booking and transaction codes for customer service

2. **Composite Indexes**:
   - Branch + role combinations for permission filtering
   - Date + status combinations for workflow queries
   - User + read status for notification management

3. **Time-based Indexes**:
   - Creation timestamps for chronological ordering
   - Expiration timestamps for cleanup operations
   - Payroll period boundaries for reporting

4. **Query Optimization**:
   - Branch-specific filtering to reduce dataset size
   - Status-based filtering for workflow efficiency
   - Category grouping for product/service management

## Validation and Security

### Input Validation

1. **Schema-Level Validation**:
   - Type safety through TypeScript
   - Union types for controlled value sets
   - Required vs optional field definitions
   - Array type validation for collections

2. **Business Logic Validation**:
   - Custom validation functions in service layers
   - Error code system for consistent error handling
   - Input sanitization for security
   - Permission-based access control

3. **Security Measures**:
   - Password hashing with bcrypt
   - Session token generation and validation
   - Role-based access control
   - Input sanitization for XSS prevention

## Migration and Evolution

### Schema Evolution Patterns

1. **No Traditional Migrations**:
   - Schema evolves through code deployment
   - Forward and backward compatibility maintained
   - Optional fields for gradual feature adoption

2. **Legacy Field Support**:
   - Voucher redemption fields for backward compatibility
   - Multiple customer data storage patterns
   - Graceful degradation for missing data

3. **Data Transformation**:
   - Migration functions for data cleanup
   - Default value assignment for new fields
   - Status field additions for workflow enhancement

### Migration Examples

```typescript
// Example: Payment status migration
export const migratePaymentStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect();
    let updateCount = 0;
    for (const booking of bookings) {
      if (!booking.payment_status) {
        await ctx.db.patch(booking._id, {
          payment_status: "unpaid",
          updatedAt: Date.now(),
        });
        updateCount++;
      }
    }
    return { updated: updateCount };
  },
});
```

## Seed Data and Initialization

### Current Status
- **No automated seed data** found in the codebase
- Initial data setup appears to be manual through admin interface
- Default configurations are handled in service functions

### Recommended Seed Data Areas
1. **Default Branch**: Main branch configuration
2. **Admin Users**: Initial administrator accounts
3. **Service Categories**: Standard service offerings
4. **Product Categories**: Inventory classification
5. **Default Settings**: System configuration values

## Development and Testing Considerations

### Schema Development Workflow

1. **Schema Definition**: Edit `/convex/schema.ts`
2. **Type Generation**: Run `npx convex dev` to generate types
3. **Service Implementation**: Create/modify service functions
4. **Testing**: Validate schema changes with test data
5. **Deployment**: Schema changes applied automatically

### Query Patterns

1. **Efficient Data Loading**:
   - Use indexes for filtering and sorting
   - Batch related data retrieval with Promise.all
   - Implement pagination for large datasets

2. **Real-time Updates**:
   - Leverage Convex's real-time capabilities
   - Optimize subscription queries
   - Use appropriate indexes for live data

### Performance Monitoring

1. **Query Optimization**:
   - Monitor query execution times
   - Analyze index usage patterns
   - Optimize complex queries with better indexing

2. **Data Size Management**:
   - Implement data archiving strategies
   - Monitor database growth patterns
   - Clean up expired sessions and tokens

## Conclusion

This schema documentation provides a comprehensive view of the TPX Barbershop application's database structure. The Convex-based architecture offers strong type safety, real-time capabilities, and efficient query patterns that support the complex business requirements of a multi-branch barbershop management system.

The schema demonstrates:
- **Scalable multi-branch architecture**
- **Comprehensive business process support**
- **Efficient data relationships and indexing**
- **Strong type safety and validation**
- **Flexible evolution patterns**

For any modifications or extensions to the schema, ensure compatibility with existing service functions and maintain the established patterns for consistency and performance.