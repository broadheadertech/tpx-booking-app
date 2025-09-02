# Convex Integration Documentation

## Overview

This project uses [Convex](https://convex.dev) as the backend-as-a-service platform, providing real-time database, serverless functions, and automatic API generation for the TPX Barbershop booking application.

## Project Structure

```
convex/
├── _generated/          # Auto-generated API types and client
│   ├── api.d.ts
│   ├── api.js
│   ├── dataModel.d.ts
│   ├── server.d.ts
│   └── server.js
├── schema.ts           # Database schema definition
└── services/           # API functions organized by domain
    ├── auth.ts         # Authentication & user management
    ├── barbers.ts      # Barber management
    ├── bookings.ts     # Booking system
    ├── events.ts       # Event management
    ├── services.ts     # Service catalog
    ├── vouchers.ts     # Voucher system
    └── index.ts        # Service exports
```

## Configuration

### convex.config.js
```javascript
import { defineApp } from "convex/server";

const app = defineApp();

export default app;
```

## Database Schema

The application uses a relational schema with the following main entities:

### Users Table
```typescript
users: {
  username: string
  email: string
  password: string // Note: Should be hashed in production
  nickname?: string
  mobile_number: string
  birthday?: string
  role: "staff" | "customer" | "admin"
  is_active: boolean
  avatar?: string
  bio?: string
  skills: string[]
  isVerified: boolean
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_email`: ["email"]
- `by_username`: ["username"]
- `by_created_at`: ["createdAt"]

### Barbers Table
```typescript
barbers: {
  user: Id<"users">
  full_name: string
  is_active: boolean
  services: Id<"services">[]
  email: string
  phone?: string
  avatar?: string
  experience: string
  rating: number
  totalBookings: number
  monthlyRevenue: number
  specialties: string[]
  schedule: {
    [day: string]: {
      available: boolean
      start: string
      end: string
    }
  }
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_user`: ["user"]
- `by_active`: ["is_active"]

### Services Table
```typescript
services: {
  name: string
  description: string
  price: number
  duration_minutes: number
  category: string
  is_active: boolean
  image?: string
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_category`: ["category"]
- `by_active`: ["is_active"]

### Bookings Table
```typescript
bookings: {
  booking_code: string
  customer: Id<"users">
  service: Id<"services">
  barber?: Id<"barbers">
  date: string
  time: string
  status: "pending" | "booked" | "confirmed" | "completed" | "cancelled"
  price: number
  notes?: string
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_customer`: ["customer"]
- `by_barber`: ["barber"]
- `by_date`: ["date"]
- `by_status`: ["status"]
- `by_booking_code`: ["booking_code"]

### Vouchers Table
```typescript
vouchers: {
  code: string
  value: number
  points_required: number
  max_uses: number
  expires_at: number
  description?: string
  created_by: Id<"users">
  createdAt: number
  updatedAt: number
  // Legacy fields for backward compatibility
  redeemed?: boolean
  redeemed_by?: Id<"users">
  redeemed_at?: number
}
```

**Indexes:**
- `by_code`: ["code"]
- `by_created_by`: ["created_by"]

### User Vouchers Table
```typescript
user_vouchers: {
  voucher_id: Id<"vouchers">
  user_id: Id<"users">
  status: "assigned" | "redeemed"
  assigned_at: number
  redeemed_at?: number
  assigned_by: Id<"users"> // Staff member who assigned the voucher
}
```

**Indexes:**
- `by_voucher`: ["voucher_id"]
- `by_user`: ["user_id"]
- `by_status`: ["status"]
- `by_voucher_user`: ["voucher_id", "user_id"]

### Sessions Table
```typescript
sessions: {
  userId: Id<"users">
  token: string
  expiresAt: number
  createdAt: number
}
```

**Indexes:**
- `by_token`: ["token"]
- `by_user`: ["userId"]
- `by_expires_at`: ["expiresAt"]

### Events Table
```typescript
events: {
  title: string
  description: string
  date: string
  time: string
  location: string
  maxAttendees: number
  currentAttendees: number
  price: number
  category: "workshop" | "celebration" | "training" | "promotion"
  status: "upcoming" | "ongoing" | "completed" | "cancelled"
  createdAt: number
  updatedAt: number
}
```

**Indexes:**
- `by_date`: ["date"]
- `by_status`: ["status"]
- `by_category`: ["category"]

## API Functions

### Authentication Service (`auth.ts`)

#### Mutations
- `registerUser(args)` - Register a new user
- `loginUser(email, password)` - Authenticate user and create session
- `logoutUser(sessionToken)` - Invalidate user session
- `updateUserProfile(sessionToken, profileData)` - Update user profile

#### Queries
- `getCurrentUser(sessionToken?)` - Get current authenticated user
- `getAllUsers()` - Get all users (admin/staff only)

### Voucher Service (`vouchers.ts`)

#### Queries
- `getAllVouchers()` - Get all vouchers with assignment statistics
- `getVoucherById(id)` - Get voucher by ID
- `getVoucherByCode(code)` - Get voucher by code
- `getActiveVouchers()` - Get non-expired vouchers with available assignments
- `getVouchersByUser(userId)` - Get vouchers assigned to a user
- `validateVoucher(code)` - Validate voucher availability
- `getVoucherAssignedUsers(voucherId)` - Get users assigned to a voucher

#### Mutations
- `createVoucher(args)` - Create voucher with auto-generated code
- `createVoucherWithCode(args)` - Create voucher with custom code
- `assignVoucher(voucher_id, user_id, assigned_by)` - Assign voucher to user
- `assignVoucherByCode(code, user_id, assigned_by)` - Assign voucher by code
- `redeemVoucher(code, user_id)` - Redeem assigned voucher
- `updateVoucher(id, updates)` - Update voucher details
- `deleteVoucher(id)` - Delete voucher and all assignments

### Booking Service (`bookings.ts`)

#### Queries
- `getAllBookings()` - Get all bookings with related data
- `getBookingsByCustomer(customerId)` - Get customer's bookings
- `getBookingsByBarber(barberId)` - Get barber's bookings
- `getBookingById(id)` - Get booking by ID
- `getBookingByCode(bookingCode)` - Get booking by code
- `getBookingsByStatus(status)` - Get bookings by status
- `getTodaysBookings()` - Get today's bookings

#### Mutations
- `createBooking(args)` - Create new booking
- `updateBooking(id, updates)` - Update booking details
- `deleteBooking(id)` - Delete booking

### Barber Service (`barbers.ts`)

#### Queries
- `getAllBarbers()` - Get all barbers
- `getBarberById(id)` - Get barber by ID
- `getActiveBarbers()` - Get active barbers only

#### Mutations
- `createBarber(args)` - Create new barber profile
- `updateBarber(id, updates)` - Update barber details
- `deleteBarber(id)` - Delete barber profile

### Service Catalog (`services.ts`)

#### Queries
- `getAllServices()` - Get all services
- `getServiceById(id)` - Get service by ID
- `getActiveServices()` - Get active services only
- `getServicesByCategory(category)` - Get services by category

#### Mutations
- `createService(args)` - Create new service
- `updateService(id, updates)` - Update service details
- `deleteService(id)` - Delete service

## Frontend Integration

### Setup

1. **Install Convex React package:**
```bash
npm install convex
```

2. **Import and use in components:**
```javascript
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
```

### Usage Patterns

#### Queries (Read Data)
```javascript
const MyComponent = () => {
  // Basic query
  const vouchers = useQuery(api.services.vouchers.getAllVouchers)
  
  // Conditional query
  const userVouchers = user?.id 
    ? useQuery(api.services.vouchers.getVouchersByUser, { userId: user.id })
    : undefined
  
  // Skip query when condition not met
  const assignedUsers = useQuery(
    api.services.vouchers.getVoucherAssignedUsers,
    voucher ? { voucherId: voucher._id } : "skip"
  )
  
  return (
    <div>
      {vouchers?.map(voucher => (
        <div key={voucher._id}>{voucher.code}</div>
      ))}
    </div>
  )
}
```

#### Mutations (Write Data)
```javascript
const MyComponent = () => {
  const createVoucher = useMutation(api.services.vouchers.createVoucher)
  const deleteVoucher = useMutation(api.services.vouchers.deleteVoucher)
  
  const handleCreate = async () => {
    try {
      await createVoucher({
        value: 100,
        points_required: 0,
        max_uses: 10,
        expires_at: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        description: "Welcome bonus",
        created_by: user.id
      })
      console.log("Voucher created successfully")
    } catch (error) {
      console.error("Failed to create voucher:", error)
    }
  }
  
  const handleDelete = async (voucherId) => {
    try {
      await deleteVoucher({ id: voucherId })
      console.log("Voucher deleted successfully")
    } catch (error) {
      console.error("Failed to delete voucher:", error)
    }
  }
  
  return (
    <div>
      <button onClick={handleCreate}>Create Voucher</button>
      <button onClick={() => handleDelete(voucherId)}>Delete</button>
    </div>
  )
}
```

### Loading States

Convex queries return `undefined` while loading:

```javascript
const MyComponent = () => {
  const vouchers = useQuery(api.services.vouchers.getAllVouchers)
  const loading = vouchers === undefined
  
  if (loading) {
    return <div>Loading vouchers...</div>
  }
  
  return (
    <div>
      {vouchers.map(voucher => (
        <div key={voucher._id}>{voucher.code}</div>
      ))}
    </div>
  )
}
```

### Error Handling

```javascript
const MyComponent = () => {
  const [error, setError] = useState(null)
  const createVoucher = useMutation(api.services.vouchers.createVoucher)
  
  const handleSubmit = async (formData) => {
    try {
      setError(null)
      await createVoucher(formData)
      // Success handling
    } catch (err) {
      setError(err.message)
      console.error("Mutation failed:", err)
    }
  }
  
  return (
    <div>
      {error && <div className="error">{error}</div>}
      {/* Form components */}
    </div>
  )
}
```

## Key Features

### Real-time Updates
Convex automatically updates all connected clients when data changes. No need for manual refetching or WebSocket management.

### Type Safety
Fully typed API with TypeScript support. The `_generated/api.ts` file provides complete type definitions.

### Optimistic Updates
Mutations can be configured for optimistic updates to improve perceived performance.

### Automatic Caching
Convex handles query caching and invalidation automatically.

### Serverless Functions
All API functions run as serverless functions with automatic scaling.

## Development Workflow

### Running Convex Dev Server
```bash
npx convex dev
```

### Deploying to Production
```bash
npx convex deploy
```

### Schema Migrations
Convex handles schema migrations automatically when you update `schema.ts`.

## Best Practices

### 1. Query Organization
- Group related queries and mutations in service files
- Use descriptive function names
- Add proper TypeScript types for arguments

### 2. Error Handling
- Always wrap mutations in try-catch blocks
- Provide meaningful error messages
- Handle loading states appropriately

### 3. Performance
- Use conditional queries to avoid unnecessary API calls
- Implement proper loading states
- Consider pagination for large datasets

### 4. Security
- Validate all inputs in mutation handlers
- Implement proper authentication checks
- Use indexes for efficient queries

### 5. Data Modeling
- Design normalized schemas with proper relationships
- Use appropriate indexes for query patterns
- Consider data access patterns when designing tables

## Common Patterns

### Conditional Data Fetching
```javascript
// Only fetch when user is authenticated
const userBookings = user?.id 
  ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user.id })
  : undefined
```

### Data Enrichment
```javascript
// Enrich data with related information in the query handler
export const getAllBookings = query({
  args: {},
  handler: async (ctx) => {
    const bookings = await ctx.db.query("bookings").collect()
    
    return Promise.all(
      bookings.map(async (booking) => {
        const [customer, service, barber] = await Promise.all([
          ctx.db.get(booking.customer),
          ctx.db.get(booking.service),
          booking.barber ? ctx.db.get(booking.barber) : null,
        ])
        
        return {
          ...booking,
          customer_name: customer?.username || 'Unknown',
          service_name: service?.name || 'Unknown Service',
          barber_name: barber?.full_name || 'Not assigned',
        }
      })
    )
  },
})
```

### Batch Operations
```javascript
// Delete voucher and all related assignments
export const deleteVoucher = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, args) => {
    // Delete all assignments first
    const assignments = await ctx.db
      .query("user_vouchers")
      .withIndex("by_voucher", (q) => q.eq("voucher_id", args.id))
      .collect()
    
    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id)
    }
    
    // Delete the voucher
    await ctx.db.delete(args.id)
  },
})
```