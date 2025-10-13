# TPX Barbershop Booking System - Technical Specification

## 📋 Table of Contents
- [Project Overview](#project-overview)
- [Architecture & Technology Stack](#architecture--technology-stack)
- [Database Schema](#database-schema)
- [User Roles & Permissions](#user-roles--permissions)
- [Component Architecture](#component-architecture)
- [API Services](#api-services)
- [Business Logic & Workflows](#business-logic--workflows)
- [UI/UX Design System](#uiux-design-system)
- [Integration Points](#integration-points)
- [Development Guidelines](#development-guidelines)
- [Security Considerations](#security-considerations)
- [Deployment & Environment](#deployment--environment)

## 🎯 Project Overview

The TPX Barbershop Booking System is a comprehensive multi-branch barbershop management platform built with React and Convex. It provides complete business management capabilities including appointment booking, POS operations, payment processing, staff management, and customer engagement features.

### Key Features
- **Multi-Branch Architecture**: Complete branch isolation with role-based access
- **Real-time Booking System**: Live appointment scheduling with QR code verification
- **POS System**: Walk-in customer transactions with receipt generation
- **Payment Integration**: Xendit payment gateway with webhook handling (PHP - Philippine Pesos)
- **Currency**: All monetary values are in Philippine Pesos (PHP/₱)
- **Email Marketing**: Resend integration with template management
- **Voucher System**: Digital voucher management with assignment tracking
- **Payroll Management**: Commission-based payroll calculation and tracking
- **Notification System**: Multi-channel notifications with metadata
- **Kiosk Mode**: QR code scanning and booking verification
- **AI Barber Assistant**: Customer service automation

## 🏗️ Architecture & Technology Stack

### Frontend Stack
- **React 19**: Modern React with hooks and functional components
- **React Router DOM 7.7.1**: Client-side routing
- **Tailwind CSS 4.1.11**: Utility-first CSS framework
- **Vite 7.0.6**: Build tool and development server
- **Lucide React 0.536.0**: Icon library

### Backend Stack
- **Convex 1.26.1**: Backend-as-a-Service with real-time database
- **Convex React**: Real-time data synchronization
- **TypeScript**: Type-safe development

### External Integrations
- **Xendit**: Payment processing
- **Resend**: Email delivery service
- **QR Code Scanner**: Camera-based QR code reading
- **Facebook Login**: Social authentication

### Development Tools
- **@tailwindcss/vite**: Tailwind CSS Vite plugin
- **@vitejs/plugin-react**: React Vite plugin
- **PostCSS**: CSS processing

## 📊 Database Schema

### Core Tables

#### Branches (`branches`)
```typescript
{
  branch_code: string,        // Unique branch identifier
  name: string,              // Branch name
  address: string,           // Physical address
  phone: string,             // Contact phone
  email: string,             // Contact email
  is_active: boolean,        // Branch status
  createdAt: number,         // Creation timestamp
  updatedAt: number          // Last update timestamp
}
```

#### Users (`users`)
```typescript
{
  username: string,          // Unique username
  email: string,             // Email address
  password: string,          // Hashed password (needs improvement)
  nickname?: string,         // Display name
  mobile_number: string,     // Phone number
  address?: string,          // Physical address
  birthday?: string,         // Date of birth
  role: "staff" | "customer" | "admin" | "barber" | "super_admin" | "branch_admin",
  branch_id?: Id<"branches">, // Branch assignment (optional for super_admin)
  is_active: boolean,        // Account status
  avatar?: string,           // Profile image URL
  bio?: string,              // User bio
  skills: string[],          // User skills
  isVerified: boolean,       // Email verification status
  createdAt: number,         // Account creation
  updatedAt: number          // Last update
}
```

#### Barbers (`barbers`)
```typescript
{
  user: Id<"users">,         // Linked user account
  branch_id: Id<"branches">, // Branch assignment
  full_name: string,         // Barber's full name
  is_active: boolean,        // Active status
  services: Id<"services">[], // Available services
  email: string,             // Contact email
  phone?: string,            // Contact phone
  avatar?: string,           // Profile image
  avatarStorageId?: Id<"_storage">, // Convex file storage ID
  experience: string,        // Experience description
  rating: number,            // Average rating (1-5)
  totalBookings: number,     // Total bookings completed
  monthlyRevenue: number,    // Monthly earnings
  specialties: string[],     // Specialization areas
  schedule: {                // Weekly schedule
    [day: string]: {
      available: boolean,
      start: string,         // HH:MM format
      end: string            // HH:MM format
    }
  },
  createdAt: number,
  updatedAt: number
}
```

#### Services (`services`)
```typescript
{
  branch_id: Id<"branches">, // Branch-specific services
  name: string,              // Service name
  description: string,       // Service description
  price: number,             // Service price in PHP (Philippine Pesos)
  duration_minutes: number,  // Service duration
  category: string,          // Service category
  is_active: boolean,        // Service availability
  image?: string,            // Service image URL
  createdAt: number,
  updatedAt: number
}
```

#### Bookings (`bookings`)
```typescript
{
  booking_code: string,      // Unique booking identifier
  branch_id: Id<"branches">, // Branch assignment
  customer?: Id<"users">,    // Customer (optional for walk-ins)
  customer_name?: string,    // Walk-in customer name
  customer_phone?: string,   // Walk-in customer phone
  customer_email?: string,   // Walk-in customer email
  service: Id<"services">,   // Booked service
  barber?: Id<"barbers">,    // Assigned barber
  date: string,              // Booking date (YYYY-MM-DD)
  time: string,              // Booking time (HH:MM)
  status: "pending" | "booked" | "confirmed" | "completed" | "cancelled",
  payment_status?: "unpaid" | "paid" | "refunded",
  price: number,             // Booking price in PHP (Philippine Pesos)
  notes?: string,            // Additional notes
  createdAt: number,
  updatedAt: number
}
```

#### Transactions (`transactions`)
```typescript
{
  transaction_id: string,    // Unique transaction ID
  branch_id: Id<"branches">, // Branch assignment
  customer?: Id<"users">,    // Customer (optional for walk-ins)
  customer_name?: string,    // Walk-in customer details
  customer_phone?: string,
  customer_email?: string,
  customer_address?: string,
  barber: Id<"barbers">,     // Processing barber
  services: [{               // Service items
    service_id: Id<"services">,
    service_name: string,
    price: number,           // Price in PHP (Philippine Pesos)
    quantity: number
  }],
  products?: [{              // Product items
    product_id: Id<"products">,
    product_name: string,
    price: number,           // Price in PHP (Philippine Pesos)
    quantity: number
  }],
  subtotal: number,          // Subtotal amount in PHP
  discount_amount: number,   // Discount applied in PHP
  voucher_applied?: Id<"vouchers">, // Applied voucher
  tax_amount: number,        // Tax amount in PHP
  total_amount: number,      // Final total in PHP
  payment_method: "cash" | "card" | "digital_wallet" | "bank_transfer",
  payment_status: "pending" | "completed" | "failed" | "refunded",
  notes?: string,            // Transaction notes
  cash_received?: number,    // Cash payment amount in PHP
  change_amount?: number,    // Change given in PHP
  receipt_number: string,    // Receipt identifier
  processed_by: Id<"users">, // Staff member
  createdAt: number,
  updatedAt: number
}
```

#### Email Campaigns (`email_campaigns`)
```typescript
{
  branch_id: Id<"branches">, // Branch assignment
  name: string,              // Campaign name
  subject: string,           // Email subject
  body_html: string,         // Email content
  audience: "all_customers" | "new_customers" | "returning_customers" | "vip_customers",
  template_type?: "marketing" | "promotional" | "reminder" | "custom",
  from_email?: string,       // Sender email
  tags?: string[],           // Campaign tags
  status: "draft" | "scheduled" | "sending" | "sent" | "failed",
  scheduled_at?: number,     // Scheduled send time
  sent_at?: number,          // Actual send time
  total_recipients?: number, // Total recipients
  sent_count?: number,       // Successfully sent
  failed_count?: number,     // Failed sends
  open_count?: number,       // Email opens
  click_count?: number,      // Link clicks
  unsubscribe_count?: number, // Unsubscribes
  created_by: Id<"users">,   // Campaign creator
  createdAt: number,
  updatedAt: number
}
```

### Additional Tables
- **Vouchers**: Digital voucher management
- **User Vouchers**: Voucher assignment tracking
- **Sessions**: Authentication sessions
- **Events**: Branch events and promotions
- **Notifications**: System notifications
- **Products**: Inventory management
- **Payments**: Xendit payment tracking
- **Ratings**: Barber service ratings
- **Payroll**: Commission and payroll management
- **Email Campaign Logs**: Email delivery tracking

## 👥 User Roles & Permissions

### Super Admin
- **Access**: All branches and system-wide data
- **Capabilities**:
  - Create and manage branches
  - Assign branch administrators
  - Access global analytics and reports
  - Manage system-wide settings
  - Create and manage all user accounts
- **Branch ID**: `null` (no branch restriction)

### Branch Admin
- **Access**: Assigned branch only
- **Capabilities**:
  - Full branch management (staff, barbers, services)
  - View branch analytics and reports
  - Manage branch settings
  - Create and manage branch users
  - Access all branch data
- **Branch ID**: Required, restricted to assigned branch

### Staff
- **Access**: Assigned branch operations
- **Capabilities**:
  - Handle bookings and POS transactions
  - Manage customer interactions
  - Process payments and refunds
  - View branch bookings and transactions
  - Access customer management tools
- **Branch ID**: Required, restricted to assigned branch

### Barber
- **Access**: Personal schedule and assigned bookings
- **Capabilities**:
  - Manage personal schedule and availability
  - View assigned bookings
  - Update booking status
  - Manage personal profile
  - View earnings and performance
- **Branch ID**: Required, restricted to assigned branch

### Customer
- **Access**: Personal bookings and profile
- **Capabilities**:
  - Book appointments (branch selection required)
  - View booking history
  - Manage personal profile
  - Access vouchers and loyalty points
  - Rate services and barbers
- **Branch ID**: Required, can book at any branch

## 🧩 Component Architecture

### Page Structure
```
src/pages/
├── auth/
│   ├── Login.jsx              # User authentication
│   ├── Register.jsx           # User registration
│   └── FacebookCallback.jsx   # Facebook OAuth callback
├── admin/
│   └── Dashboard.jsx          # Super admin dashboard
├── staff/
│   ├── Dashboard.jsx          # Staff dashboard
│   └── POS.jsx                # Point of sale interface
├── customer/
│   ├── Dashboard.jsx          # Customer dashboard
│   ├── Booking.jsx            # Booking interface
│   └── Profile.jsx            # Customer profile
├── kiosk/
│   ├── BookingDetails.jsx     # Kiosk booking display
│   ├── QRScanner.jsx          # QR code scanning
│   └── CameraPermissions.jsx  # Camera access handling
└── booking/payment/
    ├── success.jsx            # Payment success page
    └── failure.jsx            # Payment failure page
```

### Component Organization
```
src/components/
├── common/                    # Shared UI components
│   ├── AuthRedirect.jsx      # Authentication guard
│   ├── Button.jsx            # Reusable button component
│   ├── Card.jsx              # Content card wrapper
│   ├── Input.jsx             # Form input component
│   ├── Layout.jsx            # Page layout wrapper
│   ├── LoadingScreen.jsx     # Loading state component
│   ├── Modal.jsx             # Modal dialog component
│   └── ProtectedRoute.jsx    # Route protection
├── admin/                     # Super admin components
│   ├── BranchManagement.jsx  # Branch CRUD operations
│   ├── UserManagement.jsx    # User management
│   ├── GlobalSettings.jsx    # System settings
│   └── SystemReports.jsx     # Global analytics
├── staff/                     # Staff dashboard components
│   ├── BarbersManagement.jsx # Barber management
│   ├── BookingsManagement.jsx # Booking management
│   ├── ServicesManagement.jsx # Service catalog
│   ├── EmailMarketing.jsx    # Email campaigns
│   ├── PayrollManagement.jsx # Payroll system
│   ├── ProductsManagement.jsx # Inventory management
│   └── VoucherManagement.jsx # Voucher system
├── customer/                  # Customer-facing components
│   ├── BranchSelection.jsx   # Branch selection
│   ├── ServiceBooking.jsx    # Booking interface
│   ├── MyBookings.jsx        # Booking history
│   ├── CustomerProfile.jsx   # Profile management
│   ├── AIBarberAssistant.jsx # AI assistant
│   └── ProductShop.jsx       # Product catalog
├── barber/                    # Barber-specific components
│   ├── BarberDashboard.jsx   # Barber dashboard
│   ├── BarberBookings.jsx    # Assigned bookings
│   └── BarberProfile.jsx     # Profile management
└── email/                     # Email templates
    └── EmailTemplates.jsx     # React email components
```

## 🔌 API Services

### Convex Service Structure
```
convex/services/
├── auth.ts                    # Authentication & user management
├── barbers.ts                 # Barber management
├── bookings.ts                # Booking system
├── branches.ts                # Branch management
├── services.ts                # Service catalog
├── transactions.ts            # POS transactions
├── vouchers.ts                # Voucher system
├── payments.ts                # Payment processing
├── emailMarketing.ts          # Email campaigns
├── payroll.ts                 # Payroll management
├── products.ts                # Inventory management
├── ratings.ts                 # Rating system
├── events.ts                  # Event management
├── notifications.ts           # Notification system
└── index.ts                   # Service exports
```

### Key Service Patterns

#### Query Functions (Read Operations)
```typescript
// Branch-scoped queries
export const getBookingsByBranch = query({
  args: { branch_id: v.id("branches") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookings")
      .withIndex("by_branch", (q) => q.eq("branch_id", args.branch_id))
      .collect();
  }
});

// Global queries (super admin only)
export const getAllBookings = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bookings").collect();
  }
});
```

#### Mutation Functions (Write Operations)
```typescript
// Create operations
export const createBooking = mutation({
  args: {
    branch_id: v.id("branches"),
    customer: v.optional(v.id("users")),
    service: v.id("services"),
    barber: v.optional(v.id("barbers")),
    date: v.string(),
    time: v.string(),
    price: v.number()
  },
  handler: async (ctx, args) => {
    // Validation and creation logic
    const bookingId = await ctx.db.insert("bookings", {
      ...args,
      booking_code: generateBookingCode(),
      status: "pending",
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    return bookingId;
  }
});
```

#### Action Functions (External API Calls)
```typescript
// Xendit payment processing
export const processPayment = action({
  args: {
    booking_id: v.id("bookings"),
    amount: v.number(),
    payment_method: v.string()
  },
  handler: async (ctx, args) => {
    // External API call to Xendit
    const paymentResult = await xenditClient.payments.create({
      amount: args.amount,
      payment_method: args.payment_method
    });
    
    // Store payment record
    await ctx.runMutation(api.services.payments.createPayment, {
      booking_id: args.booking_id,
      payment_request_id: paymentResult.id,
      amount: args.amount,
      status: paymentResult.status
    });
    
    return paymentResult;
  }
});
```

## 🔄 Business Logic & Workflows

### Booking Workflow
1. **Customer Selection**: Customer selects branch and service
2. **Time Selection**: Available time slots displayed
3. **Barber Assignment**: Optional barber selection
4. **Payment Processing**: Xendit payment integration
5. **Confirmation**: QR code generation and email/SMS notification
6. **Service Completion**: Status updates and rating collection

### POS Transaction Workflow
1. **Customer Identification**: Existing customer or walk-in
2. **Service/Product Selection**: Add items to transaction
3. **Discount Application**: Voucher or manual discount
4. **Payment Processing**: Cash, card, or digital payment
5. **Receipt Generation**: Print or digital receipt
6. **Booking Creation**: Automatic booking for services

### Email Marketing Workflow
1. **Campaign Creation**: Template selection and content creation
2. **Audience Selection**: Target specific customer segments
3. **Preview & Testing**: Email preview and test sends
4. **Scheduling**: Set send time or send immediately
5. **Delivery Tracking**: Monitor send status and analytics
6. **Performance Analysis**: Open rates, clicks, and engagement

### Payroll Workflow
1. **Period Definition**: Set payroll calculation period
2. **Earnings Calculation**: Service commissions and daily rates
3. **Deduction Application**: Taxes and other deductions
4. **Review & Approval**: Manager review and approval
5. **Payment Processing**: Bank transfer or cash payment
6. **Record Keeping**: Maintain payroll history and reports

## 🎨 UI/UX Design System

### Color Palette
- **Primary Orange**: `#FF8C42` - Main actions, buttons, highlights
- **Primary Black**: `#1A1A1A` - Text, headers, navigation
- **Dark Gray**: `#2A2A2A` - Modal backgrounds, cards
- **Medium Gray**: `#333333` - Secondary backgrounds
- **Light Gray**: `#F5F5F5` - Page backgrounds
- **Border Gray**: `#444444` - Borders and dividers
- **Text Gray**: `#6B6B6B` - Secondary text

### Typography
- **Headers**: 24px, 20px, 18px (Bold, Black)
- **Body Text**: 16px (Dark Gray)
- **Captions**: 14px (Gray)
- **Buttons**: 16px (Bold, White on Orange)

### Component Styling
```css
/* Modal Styling */
.modal-container {
  @apply fixed inset-0 z-[9999] overflow-y-auto;
  @apply flex min-h-full items-center justify-center p-4;
}

.modal-content {
  @apply relative w-full max-w-5xl max-h-[90vh] overflow-hidden;
  @apply transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333];
  @apply border border-[#444444]/50 shadow-2xl transition-all z-[10000];
}

/* Button Styling */
.btn-primary {
  @apply px-4 py-2 bg-[#FF8C42] text-white rounded-lg;
  @apply hover:bg-[#FF8C42]/90 transition-all duration-200;
}

.btn-secondary {
  @apply px-4 py-2 bg-[#444444]/50 border border-[#555555];
  @apply text-gray-300 rounded-lg hover:bg-[#555555]/70;
  @apply transition-all duration-200;
}
```

### Responsive Design
- **Mobile First**: Touch-friendly interface with 44px minimum touch targets
- **Tablet**: Optimized for tablet use with larger touch areas
- **Desktop**: Full-featured interface for staff and admin users

## 🔗 Integration Points

### Xendit Payment Integration
**Currency**: All payments are processed in Philippine Pesos (PHP)

```javascript
// Payment processing
const processPayment = async (bookingData) => {
  const paymentRequest = await xenditClient.payments.create({
    amount: bookingData.price,  // Amount in PHP (Philippine Pesos)
    currency: 'PHP',            // Philippine Pesos
    payment_method: 'CREDIT_CARD',
    reference_id: bookingData.booking_code
  });
  
  return paymentRequest;
};

// Webhook handling
app.post('/api/payment/webhook', (req, res) => {
  const webhookData = req.body;
  // Update booking payment status
  // Send confirmation notifications
});
```

### Resend Email Integration
```javascript
// Email campaign sending
const sendCampaign = async (campaignData, recipients) => {
  for (const recipient of recipients) {
    await resend.emails.send({
      from: campaignData.from_email,
      to: recipient.email,
      subject: campaignData.subject,
      html: campaignData.body_html
    });
  }
};
```

### QR Code Integration
```javascript
// QR code generation
import QRCode from 'qrcode';

const generateQRCode = async (bookingCode) => {
  const qrCodeDataURL = await QRCode.toDataURL(bookingCode);
  return qrCodeDataURL;
};

// QR code scanning
import { QrScanner } from 'qr-scanner';

const scanQRCode = async (videoElement) => {
  const qrScanner = new QrScanner(videoElement, (result) => {
    // Handle scanned booking code
    handleBookingCode(result.data);
  });
  
  await qrScanner.start();
};
```

## 🛠️ Development Guidelines

### Code Organization
- **Component Structure**: Functional components with hooks
- **State Management**: React Context for global state, local state for components
- **Data Fetching**: Convex queries and mutations for real-time data
- **Error Handling**: Try-catch blocks with user-friendly error messages
- **Loading States**: Proper loading indicators for async operations

### Convex Integration Patterns
```javascript
// Query usage
const MyComponent = () => {
  const bookings = useQuery(api.services.bookings.getBookingsByBranch, {
    branch_id: user.branch_id
  });
  
  if (bookings === undefined) {
    return <LoadingSpinner />;
  }
  
  return (
    <div>
      {bookings.map(booking => (
        <BookingCard key={booking._id} booking={booking} />
      ))}
    </div>
  );
};

// Mutation usage
const MyComponent = () => {
  const createBooking = useMutation(api.services.bookings.createBooking);
  
  const handleCreate = async (bookingData) => {
    try {
      await createBooking(bookingData);
      // Success handling
    } catch (error) {
      // Error handling
    }
  };
};
```

### Branch-Scoped Development
- **Always include branch_id**: For all branch-scoped operations
- **Use appropriate queries**: Branch-scoped vs global queries based on user role
- **Validate permissions**: Check user role and branch access
- **Handle walk-in customers**: Create temporary user accounts for POS transactions

### Error Handling Patterns
```javascript
// Component error handling
const MyComponent = () => {
  const [error, setError] = useState(null);
  
  const handleOperation = async () => {
    try {
      setError(null);
      await someAsyncOperation();
    } catch (err) {
      setError(err.message);
      console.error('Operation failed:', err);
    }
  };
  
  return (
    <div>
      {error && <ErrorDisplay message={error} />}
      {/* Component content */}
    </div>
  );
};
```

## 🔒 Security Considerations

### Authentication & Authorization
- **Session Management**: JWT-based sessions with expiration
- **Role-Based Access**: Strict role and branch-based permissions
- **Password Security**: Currently plain text (needs hashing implementation)
- **Input Validation**: Server-side validation for all inputs

### Data Protection
- **Branch Isolation**: Complete data separation between branches
- **Customer Privacy**: Secure handling of customer data
- **Payment Security**: PCI-compliant payment processing via Xendit
- **File Uploads**: Secure file storage via Convex

### API Security
- **Input Sanitization**: All inputs validated and sanitized
- **SQL Injection Prevention**: Convex query builder prevents SQL injection
- **CORS Configuration**: Proper CORS settings for API access
- **Rate Limiting**: Implement rate limiting for API endpoints

## 🚀 Deployment & Environment

### Environment Variables
```env
# Convex Configuration
CONVEX_URL=your-convex-url
CONVEX_DEPLOY_KEY=your-deploy-key

# Payment Configuration
XENDIT_API_KEY=your-xendit-api-key
XENDIT_WEBHOOK_SECRET=your-webhook-secret

# Email Configuration
VITE_RESEND_API_KEY=your-resend-api-key

# Development
VITE_CONVEX_URL=your-dev-convex-url
```

### Build & Deployment
```bash
# Development
npm run dev

# Production build
npm run build

# Convex deployment
npx convex deploy

# Preview production build
npm run preview
```

### Database Migrations
- **Schema Updates**: Convex handles schema migrations automatically
- **Data Migration**: Custom migration scripts for data transformations
- **Backup Strategy**: Regular database backups before major changes

## 📈 Performance Optimization

### Frontend Optimization
- **Code Splitting**: Lazy loading for route-based components
- **Memoization**: React.memo for expensive components
- **Image Optimization**: Optimized images and lazy loading
- **Bundle Analysis**: Regular bundle size monitoring

### Backend Optimization
- **Query Optimization**: Efficient database queries with proper indexes
- **Caching**: Convex automatic caching system
- **Real-time Updates**: Efficient real-time data synchronization
- **Pagination**: Implement pagination for large datasets

## 🧪 Testing Strategy

### Component Testing
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **User Flow Tests**: End-to-end user journey testing

### API Testing
- **Service Tests**: Convex service function testing
- **Integration Tests**: External API integration testing
- **Performance Tests**: Load and stress testing

## 📚 Documentation Standards

### Code Documentation
- **Component Documentation**: JSDoc comments for complex components
- **API Documentation**: Comprehensive API documentation
- **README Files**: Component and service README files
- **Changelog**: Version history and change tracking

### User Documentation
- **User Guides**: Role-specific user documentation
- **API Reference**: Complete API reference documentation
- **Troubleshooting**: Common issues and solutions
- **FAQ**: Frequently asked questions

---

## 🔄 Version History

### v2.0 (Current)
- ✅ Multi-branch architecture implementation
- ✅ Complete POS system with walk-in customer support
- ✅ Email marketing system with Resend integration
- ✅ Payroll management with commission tracking
- ✅ QR code booking verification system
- ✅ AI barber assistant integration
- ✅ Comprehensive notification system

### v1.5
- ✅ Basic booking system with Xendit payment integration
- ✅ User management with role-based access
- ✅ Service catalog management
- ✅ Voucher system implementation

### v1.0
- ✅ Initial booking system
- ✅ User authentication
- ✅ Basic CRUD operations

---

*This specification is maintained automatically and reflects the current state of the TPX Barbershop Booking System. For the latest updates and changes, please refer to the commit history and release notes.*
