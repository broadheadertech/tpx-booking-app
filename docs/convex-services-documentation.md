# TPX Booking App - Convex Services Documentation

## Overview

This document provides a comprehensive analysis of all Convex services, functions, and backend logic in the TPX Booking Application. The application uses Convex as its backend database and serverless functions platform.

## Directory Structure

The convex directory contains:
- **51 TypeScript files** organized across services and utility modules
- **Primary schema file**: `convex/schema.ts`
- **Service modules**: `convex/services/*.ts`
- **Utility modules**: `convex/utils/*.ts`
- **HTTP module**: `convex/http.ts`

## Data Models (Schema)

### Core Tables

#### Users
- **Fields**: username, email, password, role (customer/staff/branch_admin/super_admin/barber), branch_id, profile information
- **Roles**: Customer, Staff, Branch Admin, Super Admin, Barber
- **Indexes**: by_email, by_username, by_role, by_branch

#### Branches
- **Fields**: name, address, contact information, operating hours, settings
- **Functionality**: Multi-branch support with independent operations

#### Barbers
- **Fields**: user_id, branch_id, full_name, specialties, availability, commission settings
- **Relationships**: Linked to users table for authentication

#### Services
- **Fields**: name, description, price, duration, category, branch-specific
- **Categories**: Haircut, Shave, Treatment, Package, Combo, Other

#### Bookings
- **Fields**: customer, service, barber, branch, date, time, status, payment information
- **Status**: pending, confirmed, cancelled, completed, no_show
- **Payment Status**: unpaid, partial, paid, refunded
- **Indexes**: by_customer, by_barber, by_branch, by_date_status

#### Transactions (POS)
- **Fields**: services, products, payment method, totals, voucher usage
- **Integration**: Creates booking records for services performed
- **Payment Methods**: cash, card, digital_wallet, bank_transfer

#### Products
- **Fields**: name, SKU, price, stock, sales tracking
- **Inventory**: Automatic stock management on sales

#### Vouchers
- **Fields**: code, type (percentage/fixed), value, usage limits, expiration
- **Assignment**: Per-user voucher assignment system
- **Tracking**: Usage and redemption history

#### Notifications
- **Fields**: recipient, type, priority, content, metadata
- **Types**: booking, payment, system, promotion, reminder, alert
- **Scoping**: User-specific, branch-wide, or system-wide

## Service Modules Analysis

### 1. Authentication Service (`services/auth.ts`)

#### Functions:
- **sendOTPEmail**: Sends OTP for email verification (requires SendGrid API key)
- **verifyOTP**: Verifies OTP and activates user account
- **sendPasswordResetEmail**: Sends password reset link
- **resetPassword**: Updates password with token verification

#### Features:
- Email-based authentication system
- OTP verification for account activation
- Password reset functionality
- Integration with SendGrid for email delivery

#### Security Considerations:
- **CRITICAL**: SendGrid API key is hardcoded as placeholder
- JWT-based session management via NextAuth
- Password encryption using bcrypt

### 2. Bookings Service (`services/bookings.ts`)

#### Core Functions:
- **createBooking**: Creates new appointments with validation
- **updateBooking**: Modifies existing bookings
- **cancelBooking**: Cancels appointments with refund handling
- **updateBookingStatus**: Status transitions
- **updatePaymentStatus**: Payment state management

#### Validation Features:
- Time conflict detection
- Past date prevention
- Service availability checking
- Barber operating hours validation
- Maximum daily appointments limit

#### Business Logic:
- Automatic booking code generation
- Flexible customer assignment (registered users or walk-ins)
- Status workflow management
- Integration with POS transactions

### 3. Barbers Service (`services/barbers.ts`)

#### Management Functions:
- **getBarberById**: Retrieve barber details
- **getBarbersByBranch**: List barbers by location
- **updateBarberProfile**: Profile management
- **toggleBarberStatus**: Active/inactive status control
- **updateBarberBranch**: Branch transfer functionality

#### Features:
- Branch-specific barber management
- Profile customization
- Availability tracking
- Specialization management

### 4. Branches Service (`services/branches.ts`)

#### Functions:
- **createBranch**: New branch creation
- **updateBranch**: Branch information updates
- **deleteBranch**: Branch removal with data migration
- **getBranchById**: Branch details retrieval

#### Management:
- Multi-branch support
- Independent branch operations
- User reassignment on branch deletion

### 5. Services Management (`services/services.ts`)

#### Functions:
- **getServicesByBranch**: Branch-specific service listing
- **createService**: New service creation
- **updateService**: Service information updates
- **deleteService**: Service removal with booking checks
- **getServiceById**: Service detail retrieval

#### Features:
- Branch-specific customization
- Service categorization
- Price and duration management
- Dependency checking before deletion

### 6. Vouchers Service (`services/vouchers.ts`)

#### Functions:
- **generateVoucherCodes**: Bulk voucher creation
- **assignVoucherToUser**: User-specific assignment
- **useVoucher**: Voucher redemption with validation
- **validateVoucher**: Expiration and usage checking
- **getUserVouchers**: User's available vouchers

#### Business Rules:
- Assignment-based distribution system
- Usage limit enforcement
- Expiration validation
- Type-based application (percentage/fixed)

### 7. Payments Service (`services/payments.ts`)

#### Integration:
- **Xendit API**: Philippine payment gateway
- **Supported Methods**: GCash, PayMaya
- **Webhook Handling**: Payment status updates

#### Functions:
- **createPaymentRequest**: Initiates payment flow
- **storePaymentRecord**: Local payment tracking
- **updatePaymentStatus**: Webhook processing
- **getPaymentByBookingId**: Payment lookup

#### Security:
- Base64 API authentication
- Webhook signature validation
- Idempotency handling

### 8. Transactions Service (`services/transactions.ts`)

#### POS Integration:
- **createTransaction**: Complete POS transaction processing
- **Walk-in Support**: Automatic customer creation for walk-ins
- **Product Sales**: Inventory management integration
- **Voucher Redemption**: Automatic voucher processing

#### Features:
- Receipt number generation
- Multi-payment method support
- Service-to-booking conversion
- Real-time inventory updates

### 9. Payroll Service (`services/payroll.ts`)

#### Complex Calculations:
- **Commission Systems**: Service-specific and barber-specific rates
- **Daily Rate Logic**: Max(daily commission, daily rate) per day
- **Tax Calculations**: Configurable tax rates
- **Period Management**: Weekly, bi-weekly, monthly cycles

#### Functions:
- **calculateBarberEarnings**: Comprehensive payroll calculation
- **setBarberCommissionRate**: Rate management
- **createPayrollPeriod**: Payroll cycle creation
- **markPayrollRecordAsPaid**: Payment status tracking

#### Business Logic:
- Per-day compensation calculation
- Service-specific commission overrides
- Historical rate tracking
- Payroll adjustment support

### 10. Notifications Service (`services/notifications.ts`)

#### Multi-scoped Notifications:
- **User-specific**: Direct user notifications
- **Branch-wide**: Staff notifications
- **System-wide**: Admin communications

#### Functions:
- **getUserNotifications**: Context-aware notification retrieval
- **createNotification**: Multi-type notification creation
- **markAsRead**: Read status management
- **clearAllNotifications**: Bulk cleanup

### 11. Notification Scheduler (`services/notificationScheduler.ts`)

#### Automated Tasks:
- **sendBookingReminders**: 24-hour advance reminders
- **sendCheckInReminders**: 15-minute appointment reminders
- **sendDailySchedules**: Barber daily summaries
- **cleanupOldNotifications**: Automated cleanup (30 days)

#### Scheduling Logic:
- Time-based notification triggers
- Reminder flag management
- Batch processing capabilities

### 12. Products Service (`services/products.ts`)

#### Inventory Management:
- **getProductsByBranch**: Branch-specific inventory
- **createProduct**: New product creation
- **updateProduct**: Product information updates
- **updateProductStock**: Manual stock adjustments
- **processProductReturn**: Return and restocking

#### Features:
- Sales tracking
- Stock management
- Monthly sales reporting
- Return processing

## HTTP Module (`http.ts`)

#### API Endpoints:
- **POST /api/xendit/webhook**: Payment gateway webhook handler
- **POST /api/scheduler**: Manual notification scheduler trigger

#### Webhook Processing:
- Payment status updates
- Booking state transitions
- Error handling and logging

## Error Handling System (`utils/errors.ts`)

#### Comprehensive Error Codes:
- **Authentication**: AUTH_* codes (invalid credentials, session expired, etc.)
- **Bookings**: BOOKING_* codes (not found, conflicts, past dates, etc.)
- **Vouchers**: VOUCHER_* codes (expired, used, limit reached, etc.)
- **Transactions**: TRANSACTION_* codes (not found, refunded, etc.)
- **Payroll**: PAYROLL_* codes (settings, periods, calculations)
- **General**: VALIDATION_ERROR, PERMISSION_DENIED, etc.

#### User-Friendly Messages:
- Structured error format with message, code, details, and action
- Consistent error handling across all services
- Localization-friendly structure

## Key Features & Business Logic

### Multi-Branch Support
- Branch-specific data isolation
- User role scoping by branch
- Independent branch operations
- Branch transfer capabilities

### Comprehensive Booking System
- Time slot management with conflict detection
- Status workflow management
- Flexible customer assignment
- Payment status tracking

### Point of Sale Integration
- Transaction-to-booking conversion
- Walk-in customer management
- Real-time inventory updates
- Voucher redemption system

### Advanced Payroll System
- Per-day compensation calculation
- Service and barber-specific commissions
- Historical rate tracking
- Tax and deduction management

### Notification System
- Multi-level notifications (user, branch, system)
- Automated scheduling
- Reminder systems
- Cleanup automation

### Third-Party Integrations
- **SendGrid**: Email delivery for authentication and notifications
- **Xendit**: Payment gateway for Philippine market
- **NextAuth**: Session management and authentication

## Security Considerations

### Identified Issues:
1. **SendGrid API Key**: Hardcoded placeholder requiring environment variable
2. **Xendit API**: Development key exposed (needs production configuration)
3. **Authentication**: Email-based system without MFA
4. **Data Validation**: Input validation present but could be enhanced

### Strengths:
1. **Role-Based Access**: Comprehensive role system with branch scoping
2. **Input Validation**: Structured validation using Convex validators
3. **Error Handling**: User-friendly error system without sensitive data exposure
4. **Transaction Safety**: Database transactions and rollback capabilities

## Performance Optimizations

### Database Indexing:
- Strategic indexes on frequently queried fields
- Composite indexes for complex queries
- Efficient relationship handling

### Batch Operations:
- Bulk notification processing
- Batch inventory updates
- Mass voucher operations

### Caching Strategies:
- User session caching via NextAuth
- Application-level caching for frequent lookups

## Scalability Features

### Multi-Tenancy:
- Branch-based data isolation
- Scalable user management
- Independent branch operations

### Async Processing:
- Notification scheduling
- Background job processing
- Webhook handling

### Data Management:
- Automated cleanup routines
- Historical data tracking
- Audit trail capabilities

## Recommendations

### Immediate Actions:
1. Move API keys to environment variables
2. Implement proper logging system
3. Add monitoring and alerting
4. Enhance input validation

### Future Enhancements:
1. Implement caching layer
2. Add analytics and reporting
3. Enhanced security with MFA
4. API rate limiting
5. Database query optimization
6. Automated testing for all functions

## Conclusion

The TPX Booking App demonstrates a well-structured Convex backend with comprehensive business logic for a barbershop booking and management system. The codebase shows good separation of concerns, proper error handling, and scalable architecture patterns. The main areas for improvement are around security configuration and enhanced monitoring capabilities.

The system successfully handles complex business requirements including multi-branch operations, advanced payroll calculations, integrated POS functionality, and comprehensive notification systems.