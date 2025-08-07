# Barbershop Voucher Kiosk System

## Project Overview

This project aims to create a voucher and booking management system for barbershops. The system will have two main interfaces: one for staff to manage operations and another for customers to book services and manage their accounts.

## Technology Stack
- Frontend: React with Vite
- Backend: Supabase for database, authentication, and real-time features
- Styling: Tailwind CSS for mobile-first responsive design
- Target: Mobile-first approach with touch-friendly interface

## Design System

### Color Palette
Based on the provided image:
- Primary Orange: #FF8C42 (main actions, buttons, highlights)
- Primary Black: #1A1A1A (text, headers, navigation)
- Light Gray: #F5F5F5 (backgrounds, cards)
- Dark Gray: #6B6B6B (secondary text, borders)

### Design Requirements
- Mobile-first approach
- Touch targets minimum 44px
- High contrast for readability
- Clean, professional barbershop aesthetic

## User Roles and Features

### Staff Features (Desktop/Tablet Interface)

#### Authentication
- Staff login with secure access
- Session management with timeout

#### Voucher Management
- Scan voucher QR codes using camera
- Associate scanned vouchers to customers
- Create new vouchers with expiry dates
- Track voucher status (active, redeemed, expired)

#### Customer Management
- Add new customer profiles
- Search and view customer database
- View customer booking history and voucher usage
- Manage customer loyalty points

#### Booking Management
- Create appointments for customers
- View bookings in calendar format
- Update booking status (pending, confirmed, completed)
- Assign bookings to specific staff members

#### Service Management
- Add new service offerings
- View all available services
- Set pricing and service duration
- Organize services by categories

### Customer Features (Mobile Interface)

#### Authentication
- Register and login using email or phone
- Profile management and updates

#### Dashboard
- View current loyalty points balance
- Display active vouchers
- Show booking history and upcoming appointments
- Quick access to main functions

#### Booking System
- Browse available services
- Select preferred time slots
- Choose specific staff member (optional)
- Receive booking confirmations via email/SMS

## Database Structure

### Core Tables

**Users Table**
```
id (uuid, primary key)
email (varchar)
role (staff/customer)
phone (varchar)
full_name (varchar)
created_at (timestamp)
updated_at (timestamp)
```

**Customers Table**
```
id (uuid, primary key)
user_id (uuid, foreign key to users)
points (integer, default 0)
total_visits (integer, default 0)
created_at (timestamp)
```

**Services Table**
```
id (uuid, primary key)
name (varchar)
description (text)
price (decimal)
duration_minutes (integer)
category (varchar)
is_active (boolean)
created_at (timestamp)
```

**Vouchers Table**
```
id (uuid, primary key)
code (varchar, unique)
value (decimal)
customer_id (uuid, foreign key to customers)
is_redeemed (boolean)
redeemed_at (timestamp)
expires_at (timestamp)
created_at (timestamp)
```

**Bookings Table**
```
id (uuid, primary key)
customer_id (uuid, foreign key to customers)
service_id (uuid, foreign key to services)
staff_id (uuid, foreign key to users)
scheduled_at (timestamp)
status (pending/confirmed/completed/cancelled)
notes (text)
created_at (timestamp)
```

## Mobile UI Guidelines

### Layout Strategy
- Single column layout for mobile screens
- Card-based design for grouping information
- Bottom navigation for easy thumb access
- Pull-to-refresh functionality

### Component Standards
- Buttons: Full-width, minimum 48px height
- Forms: Large input fields with clear labels
- Lists: Swipe actions for quick operations
- Modals: Bottom sheet style

### Typography
- Headers: 24px, 20px, 18px (Bold, Black)
- Body text: 16px (Dark Gray)
- Captions: 14px (Gray)
- Buttons: 16px (Bold, White on Orange)

## Development Plan

### Week 1-2: Setup
- Initialize React + Vite project
- Configure Supabase connection
- Setup Tailwind CSS with color palette
- Configure React Router
- Implement Supabase authentication
- Create login/register forms
- Setup role-based routing

### Week 3-4: Core Development
- Create database tables in Supabase
- Setup Row Level Security policies
- Build staff dashboard for customer management
- Create service management interface
- Implement basic voucher operations
- Build booking calendar view

### Week 5-6: Advanced Features
- Implement QR code generation and scanning
- Build voucher redemption system
- Create customer mobile dashboard
- Implement booking flow for customers
- Add profile management features
- Integrate points system

### Week 7-8: Testing and Launch
- Mobile device testing
- Performance optimization
- Error handling and loading states
- User acceptance testing
- Production deployment

## Project Structure

```
src/
├── components/
│   ├── common/          # Shared components (buttons, forms, etc.)
│   ├── staff/           # Staff dashboard components
│   └── customer/        # Customer mobile components
├── pages/
│   ├── auth/            # Login and register pages
│   ├── staff/           # Staff dashboard pages
│   └── customer/        # Customer app pages
├── hooks/               # Custom React hooks
├── services/            # Supabase API calls
├── utils/               # Helper functions
├── context/             # React Context for state management
└── styles/              # Tailwind CSS configuration
```

## Security Requirements

- Role-based access control for staff vs customer features
- Input validation on both client and server side
- Rate limiting to prevent API abuse
- Secure handling of customer data
- Audit logging for voucher transactions

## Success Indicators

- Customer adoption rate and monthly active users
- Voucher redemption rates and usage patterns
- Average time to complete bookings
- Staff efficiency in processing transactions
- System uptime and performance metrics