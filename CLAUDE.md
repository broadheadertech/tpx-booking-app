# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build & Development
```bash
npm run dev        # Start development server (Vite + Convex)
npm run build      # Build for production
npm run preview    # Preview production build
```

### Convex Backend
```bash
npx convex dev     # Start Convex dev server (real-time backend)
npx convex deploy  # Deploy backend to production
```

## Architecture Overview

This is a **React + Convex** barbershop booking application with a comprehensive **multi-branch system**:

### Tech Stack
- **Frontend**: React 19, React Router DOM, Tailwind CSS
- **Backend**: Convex (Backend-as-a-Service with real-time database)
- **Payments**: Xendit integration
- **Build**: Vite with React plugin
- **Styling**: Tailwind CSS 4.x with @tailwindcss/vite plugin

### User Roles & Access
- **Super Admin**: Manage all branches, create branches, assign branch admins, global view
- **Branch Admin**: Full control of assigned branch (staff, barbers, services, bookings, POS)
- **Staff**: Handle bookings and POS operations within assigned branch
- **Barber**: Manage schedules and view assigned bookings within branch
- **Customer**: Select branch when booking appointments, view own bookings

### Core Systems
1. **Multi-Branch System**: Complete branch isolation with role-based access
2. **Booking System**: Real-time appointment scheduling with QR codes (branch-scoped)
3. **POS System**: Walk-in customer transactions with receipt generation (branch-scoped)
4. **Payment System**: Xendit integration with webhook handling
5. **Notification System**: Multi-channel notifications with metadata
6. **Voucher System**: Digital voucher management with assignment tracking

## Database Architecture

### Key Tables (Convex)
- **branches**: Branch management with contact info and status
- **users**: Multi-role user system with branch assignments (branch_id)
- **barbers**: Barber profiles with schedules and branch assignment
- **bookings**: Appointments with branch isolation and payment integration
- **services**: Branch-specific service catalogs with pricing
- **transactions**: Branch-scoped POS transactions for walk-in customers
- **payments**: Xendit payment tracking
- **vouchers/user_vouchers**: Voucher management system
- **notifications**: System-wide notifications

### Important Relationships
- All core entities are scoped to branches via branch_id
- Super admins have no branch_id (can access all branches)
- Branch admins, staff, barbers, and customers are assigned to specific branches
- Services, bookings, and transactions are isolated by branch
- Walk-in customers are created with the POS transaction's branch_id

## File Structure

```
src/
├── components/
│   ├── common/         # Reusable UI components (Modal, Button, Input, etc.)
│   ├── staff/          # Staff dashboard components + BranchManagement
│   ├── customer/       # Customer components + BranchSelection
│   └── barber/         # Barber-specific components
├── pages/              # Route-based page components
├── context/            # React context (AuthContext)
├── services/           # Frontend service layers
└── utils/              # Utility functions

convex/
├── schema.ts           # Database schema with multi-branch support
├── services/           # Backend API functions organized by domain
│   ├── auth.ts         # Authentication & sessions
│   ├── bookings.ts     # Branch-scoped booking management
│   ├── barbers.ts      # Branch-scoped barber management
│   ├── branches.ts     # Branch management (super admin)
│   ├── services.ts     # Branch-scoped services
│   ├── vouchers.ts     # Voucher system
│   └── transactions.ts # Branch-scoped POS transactions
└── _generated/         # Auto-generated API types
```

## Key Patterns

### Multi-Branch Architecture
- **Branch Isolation**: All queries automatically filter by branch_id
- **Role Hierarchy**: super_admin → branch_admin → staff/barber → customer
- **Data Access**: Branch admins see only their branch data, super admins see all
- **Branch Selection**: Customers must select a branch before booking

### Convex Integration
- Use `useQuery(api.services.*.functionName)` for reading data
- Use `useMutation(api.services.*.functionName)` for writing data
- All Convex queries are real-time and automatically cached
- Handle loading states with `data === undefined`
- **Branch Filtering**: Use branch-specific queries (e.g., `getServicesByBranch`)

### Authentication
- Custom JWT-based authentication via AuthContext
- Session management through Convex sessions table
- Role-based access control throughout the application
- Branch assignment required for all users except super_admin

### Walk-in Customer Handling
- POS system creates temporary user accounts for walk-in customers
- Format: `walkin_${timestamp}@walkin.local`
- Walk-in customers automatically assigned to POS transaction's branch

### Payment Flow
- Online bookings: Customer books → Xendit payment → webhook updates
- POS transactions: Staff processes → immediate completion

## Common Tasks

### Adding New Services
1. Update `convex/services/services.ts` with new mutations (include branch_id)
2. Update service management UI in `src/components/staff/ServicesManagement.jsx`
3. Ensure service catalog updates reflect in booking flow
4. Use `getServicesByBranch` for branch-scoped service queries

### Multi-Branch Queries
- **Super Admin**: Use `getAll*` functions (global view)
- **Branch Users**: Use `get*ByBranch` functions (branch-scoped)
- Always include `branch_id` when creating new records

### Booking Status Flow
- `pending` → `booked` → `confirmed` → `completed` | `cancelled`
- Payment status: `unpaid` → `paid` | `refunded`
- All bookings are scoped to specific branches

### POS Transaction Creation
- Always specify a barber and branch_id (both required)
- Support both services and products in single transaction
- Handle cash payments with change calculation
- Generate unique receipt numbers
- Walk-in customers automatically assigned to transaction's branch

## Branch Management

### Branch Creation (Super Admin Only)
```javascript
await createBranch({
  name: "Downtown Branch",
  address: "123 Main St, City",
  phone: "+1234567890",
  email: "downtown@barbershop.com"
});
```

### Branch-Scoped Queries
```javascript
// For branch admins/staff
const branchBookings = useQuery(api.services.bookings.getBookingsByBranch, { 
  branch_id: user.branch_id 
});

// For super admins
const allBookings = useQuery(api.services.bookings.getAllBookings);
```

## Important Notes

- **No test framework** is currently set up in this project
- The codebase uses **modern React patterns** (function components, hooks)
- **File uploads** use Convex's built-in file storage system
- **Real-time updates** are handled automatically by Convex
- **Payment webhooks** are handled in `pages/api/payment/webhook.js`
- **QR codes** are generated for bookings and used in kiosk mode
- **Branch selection** is required before customers can book appointments

## Security Considerations

- Passwords should be hashed (currently stored as plain text - needs improvement)
- Role-based access is enforced in both frontend and backend
- Branch isolation ensures data privacy between branches
- Session tokens have expiration times
- Input validation is implemented in Convex mutations
- Super admins can access all branches, branch-level roles are restricted to their branch