# TPX Barbershop Booking System - Complete Technical Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Frontend Structure](#frontend-structure)
5. [Backend & Database](#backend--database)
6. [Convex Services](#convex-services)
7. [Configuration & Setup](#configuration--setup)
8. [Build & Deployment](#build--deployment)
9. [Security](#security)
10. [API Documentation](#api-documentation)
11. [Database Schema](#database-schema)
12. [Development Workflow](#development-workflow)

---

## Project Overview

**Project Name**: TPX Barbershop Booking System
**Type**: Multi-platform Barbershop Management Application
**Version**: 1.0.21
**Architecture**: React + Convex + Capacitor (Web/Mobile)
**Primary Focus**: Complete barbershop business management with booking, POS, payment processing, and staff management

### Key Features
- **Multi-branch Management**: Complete data isolation between branches
- **Role-based Access Control**: 6 user roles with different permissions
- **Real-time Booking System**: Live appointment scheduling and management
- **Point of Sale (POS)**: Walk-in customer management and payment processing
- **Payroll Management**: Complex commission tracking and calculations
- **Payment Integration**: Xendit gateway for Philippine payments
- **Mobile App**: Native Android deployment with Capacitor
- **Automated Notifications**: Email, SMS, and in-app notifications
- **Voucher & Loyalty System**: Customer engagement and retention tools

---

## Technology Stack

### Frontend Technologies
- **React 19.1.1** - Modern React with latest features and hooks
- **Vite 7.0.6** - Fast build tool and development server with HMR
- **TailwindCSS 4.1.11** - Utility-first CSS framework with custom design system
- **React Router DOM 7.7.1** - Client-side routing and navigation
- **Framer Motion 12.23.22** - Animation library for smooth transitions
- **Lucide React** - Comprehensive icon library
- **React Hot Toast 2.6.0** - Toast notification system
- **TypeScript** - Type safety for better development experience

### Backend & Database
- **Convex 1.26.1** - Serverless real-time database and backend-as-a-service
- **TypeScript Integration** - Type-safe database schema and API functions
- **Real-time Subscriptions** - Automatic data synchronization across clients
- **Serverless Functions** - API endpoints with built-in authentication

### Mobile Development
- **Capacitor 7.4.3** - Cross-platform mobile app framework
- **Android Native Support** - Full Android project with Gradle build system
- **SMS Integration** - @byteowls/capacitor-sms for messaging capabilities
- **Native Device Access** - Camera, geolocation, and device features

### Payment & External Services
- **Xendit Payment Gateway** - PHP (Philippine Pesos) payment processing
- **SendGrid/Resend** - Email service for notifications and marketing
- **Facebook OAuth** - Social authentication integration
- **EmailJS** - Client-side email functionality
- **Google Images API** - Service image management

### Development & Testing
- **TestSprite** - Automated testing platform
- **ESLint & Prettier** - Code quality and formatting
- **PostCSS & Autoprefixer** - CSS processing and browser compatibility
- **Hot Module Replacement** - Fast development with live reload

---

## Architecture

### Multi-Platform Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │    │  Mobile App     │    │   Kiosk Mode    │
│   (React SPA)   │    │ (Capacitor)     │    │  (Full Screen)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Convex Backend│
                    │ (Real-time API) │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │ (24 Tables)     │
                    └─────────────────┘
```

### Component Architecture
```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific components
│   ├── barber/         # Barber-specific components
│   ├── customer/       # Customer-facing components
│   ├── staff/          # Staff management components
│   └── common/         # Shared UI components
├── pages/              # Page-level components with routing
├── context/            # React Context providers
├── hooks/              # Custom React hooks
├── utils/              # Utility functions and helpers
└── styles/             # Global styles and CSS
```

### Data Flow Architecture
```
User Action → React Component → Convex Mutation → Database Update
     ↑                                                        ↓
Real-time Update ← Convex Subscription ← Database Trigger
```

---

## Frontend Structure

### Entry Points
- **Main Entry**: `src/main.jsx` - Application bootstrap
- **App Root**: `src/App.jsx` - Central routing and context providers
- **Platform Detection**: `utils/platform.js` - Mobile/Web detection

### Routing Structure
```
/                           → Landing Page (web) / Login redirect (mobile)
/auth/login                → Login page with Facebook OAuth
/auth/register             → User registration with email verification
/auth/forgot-password      → Password reset flow
/staff/dashboard            → Staff management interface
/staff/pos                  → Point of sale system
/admin/dashboard           → Super admin panel
/barber/dashboard          → Barber-specific interface
/customer/dashboard        → Customer portal
/customer/booking          → Booking management
/kiosk                     → Self-service kiosk mode
/guest/booking             → Guest booking flow
/booking/payment/*         → Payment success/failure pages
```

### Key Components

#### Common Components (`/src/components/common/`)
- **Button.jsx** - Reusable button with variants (primary, secondary, outline)
- **Modal.jsx** - Portal-based modal with dark/light themes
- **ToastNotification.jsx** - Comprehensive toast system with Framer Motion
- **ProtectedRoute.jsx** - Authentication wrapper with role-based access
- **LoadingScreen.jsx** & **LoadingSpinner.jsx** - Loading states
- **ErrorBoundary.jsx** - Error catching and graceful fallbacks
- **Input.jsx** - Form input component with validation

#### Customer Components (`/src/components/customer/`)
- **ServiceBooking.jsx** - Service selection and appointment booking
- **MyBookings.jsx** - User's booking history and management
- **VoucherManagement.jsx** - Voucher system integration
- **LoyaltyPoints.jsx** - Points tracking and rewards
- **AIBarberAssistant.jsx** - AI-powered barber recommendations

#### Staff Components (`/src/components/staff/`)
- **DashboardHeader.jsx** - Staff dashboard header
- **QuickActions.jsx** - Quick action buttons for common tasks
- **StatsCards.jsx** - Statistics and metrics display
- **BookingsManagement.jsx** - Booking administration
- **ServicesManagement.jsx** - Service catalog management
- **BarbersManagement.jsx** - Barber administration
- **VoucherManagement.jsx** - Voucher administration

#### Admin Components (`/src/components/admin/`)
- **DashboardHeader.jsx** - Admin dashboard header
- **BranchManagement.jsx** - Multi-branch administration
- **UserManagement.jsx** - User administration across branches
- **SystemReports.jsx** - System-wide reports and analytics
- **GlobalSettings.jsx** - System configuration

### State Management

#### Context Providers
1. **AuthProvider** (`/src/context/AuthContext.jsx`)
   - User authentication state and session management
   - Facebook authentication integration
   - Password reset flow
   - Role-based access control

2. **NotificationProvider** (`/src/context/NotificationContext.tsx`)
   - Real-time notifications from Convex
   - Unread count tracking
   - Mark as read/delete functionality
   - Auto-refresh every 30 seconds

3. **ToastProvider** (`/src/components/common/ToastNotification.jsx`)
   - Toast notification system with multiple types
   - Auto-dismiss with progress indicators
   - Action buttons support
   - Framer Motion animations

#### Custom Hooks
- **useRealtimeNotifications** - Real-time notification monitoring
- **useBookingNotifications** - Booking-specific notifications
- **usePlatform** - Platform detection and routing logic

### Styling System

#### TailwindCSS Configuration
- **Custom Color Palette**:
  - Primary orange: `#D9641E`
  - Primary black: `#141414`
  - Gray scales: light `#F7F7F7`, medium `#ECE2D2`, dark `#8B8B8B`
  - Accent colors: cream, coral, neutral

#### Custom CSS (`/src/styles/index.css`)
- **Custom scrollbars** with project branding
- **Mobile-first utilities** (`touch-manipulation`, `min-h-44`)
- **Dark theme** date input styling
- **Line clamp utilities** for text truncation
- **Responsive design** considerations

---

## Backend & Database

### Convex Database Schema

The system uses Convex as a serverless real-time database with the following structure:

#### Core Tables (24 total)
1. **branches** - Multi-branch support with complete isolation
2. **users** - Authentication with role-based access control
3. **bookings** - Appointment management with time conflict detection
4. **services** - Service catalog with dynamic pricing
5. **payments** - Transaction processing with multiple payment methods
6. **notifications** - Multi-channel messaging system
7. **payrollRecords** - Complex payroll with commission tracking
8. **inventory** - Product management with stock tracking
9. **vouchers** - Customer engagement and discount system
10. **loyaltyPoints** - Customer rewards tracking
11. **events** - Marketing event management
12. **emailCampaigns** - Email marketing automation
13. **barberServices** - Service-barber relationship mapping
14. **marketingAnalytics** - Campaign performance tracking
15. **branchSettings** - Per-branch configuration
16. **notificationsQueue** - Batch email processing
17. **emailTemplates** - Dynamic email template management
18. **apiKeys** - Third-party service management
19. **auditLogs** - System audit trail
20. **userSessions** - Active session management
21. **passwordResetTokens** - Secure password reset flow
22. **emailVerificationTokens** - Email verification system
23. **branchTransfers** - Inventory and stock transfers
24. **customers** - Enhanced customer profile management

#### Key Features
- **Branch Isolation**: Complete data separation between branches
- **Role-Based Access**: 6 different user roles with specific permissions
- **Real-time Synchronization**: Automatic updates across all clients
- **Type Safety**: Full TypeScript integration with generated types
- **Optimized Indexing**: 60+ strategic indexes for performance
- **Audit Trails**: Complete tracking of data changes

---

## Convex Services

### Backend Functions Organization

The backend is organized into 12 main service modules:

#### 1. Authentication (`auth.ts`)
- User registration and login
- Facebook OAuth integration
- Password reset functionality
- Session management with token expiration
- Email verification system

#### 2. Users Management (`users.ts`)
- CRUD operations for user management
- Role-based access control
- Profile management
- Branch assignment and restrictions

#### 3. Bookings (`bookings.ts`)
- Appointment creation and management
- Time conflict detection and resolution
- QR code generation for check-ins
- Automated reminders and notifications
- Booking status tracking

#### 4. Services Management (`services.ts`)
- Service catalog management
- Dynamic pricing with duration and complexity
- Barber-service assignment
- Service availability and scheduling

#### 5. Payments (`payments.ts`)
- Xendit payment gateway integration
- Multiple payment methods (GCash, PayMaya, credit card)
- Payment status tracking and webhooks
- Refund processing and management
- Transaction history and reporting

#### 6. Payroll System (`payroll.ts`)
- Complex commission calculations
- Daily rate vs commission optimization
- Barber performance tracking
- Payroll period management
- Automated payroll processing

#### 7. Inventory Management (`inventory.ts`)
- Product tracking and stock management
- Low stock alerts and reordering
- Branch transfers and adjustments
- Sales reporting and analytics

#### 8. Notification System (`notifications.ts`)
- Multi-channel notifications (email, SMS, in-app)
- Real-time notification delivery
- Notification templates and customization
- Delivery tracking and analytics

#### 9. Voucher System (`vouchers.ts`)
- Dynamic voucher creation and management
- Assignment-based distribution
- Usage tracking and limitations
- Expiration and validity management

#### 10. Email Marketing (`emailCampaigns.ts`)
- Campaign creation and management
- Customer segmentation and targeting
- Automated email sequences
- Performance analytics and tracking

#### 11. Reports (`reports.ts`)
- Business intelligence and analytics
- Custom report generation
- Data export functionality
- Performance metrics and KPIs

#### 12. System Administration (`system.ts`)
- System settings and configuration
- Branch management and setup
- User role and permission management
- System maintenance and utilities

### API Functions Summary
- **Total Functions**: 100+ API endpoints
- **Query Functions**: 45+ data retrieval functions
- **Mutation Functions**: 35+ data modification functions
- **Action Functions**: 20+ complex business logic functions
- **Real-time Subscriptions**: Automatic data synchronization

---

## Configuration & Setup

### Build Configuration (`vite.config.js`)
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          convex: ['convex/react'],
        },
      },
    },
    sourcemap: false,
  },
});
```

### Styling Configuration (`tailwind.config.js`)
```javascript
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          orange: '#D9641E',
          black: '#141414',
        },
        neutral: {
          light: '#F7F7F7',
          medium: '#ECE2D2',
          dark: '#8B8B8B',
        },
      },
    },
  },
};
```

### Capacitor Configuration (`capacitor.config.json`)
```json
{
  "appId": "com.tpx.barbershop",
  "appName": "TPX Barbershop",
  "webDir": "dist",
  "server": {
    "androidScheme": "https"
  },
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 3000,
      "launchAutoHide": true,
      "backgroundColor": "#D9641E",
      "androidSplashResourceName": "splash",
      "androidScaleType": "CENTER_CROP"
    }
  }
}
```

### Environment Variables
```javascript
// API Keys (should be in .env files)
const KIMI_API_KEY = process.env.VITE_KIMI_API_KEY;
const GOOGLE_IMAGES_API_KEY = process.env.VITE_GOOGLE_IMAGES_API_KEY;
const EMAILJS_PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY;
const FACEBOOK_APP_ID = process.env.VITE_FACEBOOK_APP_ID;
```

---

## Build & Deployment

### Development Workflow
```bash
# Development
npm run dev              # Start development server with HMR

# Build
npm run build            # Production build optimization
npm run preview          # Production preview server

# Mobile Development
npm run android:sync     # Sync web build to Android project
npm run android:build    # Build Android APK
npm run android:open     # Open Android Studio
```

### Automated Deployment Scripts
```bash
npm run deploy           # Patch version deployment (1.0.21 → 1.0.22)
npm run deploy:minor     # Minor version deployment (1.0.21 → 1.1.0)
npm run deploy:major     # Major version deployment (1.0.21 → 2.0.0)
```

### Deployment Pipeline
1. **Version Management**: Semantic versioning with automatic incrementing
2. **Convex Deployment**: Backend synchronization and schema updates
3. **Static Assets**: File uploads to Vercel/static hosting
4. **Mobile App**: APK generation for Android distribution
5. **Release Notes**: Automatic documentation generation

### Production Build Features
- **Code Splitting**: Manual chunk optimization for vendor libraries
- **Asset Optimization**: Image compression and bundling
- **Source Maps**: Disabled for production security
- **Tree Shaking**: Dead code elimination
- **Minification**: JavaScript and CSS optimization

---

## Security

### Authentication & Authorization
- **Multi-Role Authentication**: 6 user roles with specific permissions
  - `customer` - Basic booking and profile access
  - `staff` - Branch-level management access
  - `barber` - Personal booking and schedule management
  - `admin` - Full branch management
  - `branch_admin` - Multi-branch oversight
  - `super_admin` - System-wide administrative access

- **Branch-Based Access Control**: Complete data isolation between branches
- **Facebook OAuth Integration**: Social authentication with secure token handling
- **Password Reset Flow**: Secure token-based password recovery
- **Session Management**: JWT-like tokens with expiration and refresh

### Data Security
- **Environment Variable Protection**: Sensitive data in .gitignore
- **CORS Configuration**: Security headers in vercel.json
- **API Key Management**: Secure storage of third-party service keys
- **Input Validation**: Comprehensive validation through Convex schema
- **Role-Based Data Access**: Database-level access restrictions

### Security Best Practices
- **Password Hashing**: Bcrypt for secure password storage
- **HTTPS Enforcement**: Secure communication channels
- **Input Sanitization**: Protection against injection attacks
- **Error Handling**: Secure error messages without information leakage
- **Audit Logging**: Complete tracking of system access and changes

---

## API Documentation

### Convex API Structure

#### Authentication APIs
```typescript
// User Registration
mutation registerUser(args: {
  email: string,
  password: string,
  fullName: string,
  role: UserRole,
  branchId?: string
}) => Promise<User>

// User Login
mutation loginUser(args: {
  email: string,
  password: string
}) => Promise<{ user: User; token: string }>

// Facebook OAuth
mutation loginWithFacebook(args: {
  accessToken: string
}) => Promise<{ user: User; token: string }>
```

#### Booking APIs
```typescript
// Create Booking
mutation createBooking(args: {
  serviceId: string,
  barberId: string,
  customerId: string,
  branchId: string,
  startTime: number,
  endTime: number,
  notes?: string
}) => Promise<Booking>

// Get User Bookings
query getUserBookings(args: {
  userId: string,
  status?: BookingStatus
}) => Promise<Booking[]>

// Check Time Availability
query checkTimeAvailability(args: {
  barberId: string,
  branchId: string,
  startTime: number,
  endTime: number
}) => Promise<boolean>
```

#### Payment APIs
```typescript
// Create Payment
mutation createPayment(args: {
  bookingId: string,
  amount: number,
  method: PaymentMethod,
  xenditId?: string
}) => Promise<Payment>

// Process Xendit Payment
mutation processXenditPayment(args: {
  paymentId: string,
  xenditTokenId: string
}) => Promise<Payment>

// Payment Webhook
mutation handleXenditWebhook(args: {
  payload: any
}) => Promise<void>
```

### Real-time Subscriptions
```typescript
// Real-time Bookings
useQuery(api.bookings.getBookingsByBranch, { branchId })
// Automatic updates when bookings change

// Real-time Notifications
useQuery(api.notifications.getUserNotifications, { userId })
// Live notification updates

// Real-time Inventory
useQuery(api.inventory.getInventoryByBranch, { branchId })
// Stock level updates across all clients
```

---

## Database Schema

### Key Tables Overview

#### Users Table
```typescript
{
  _id: string,
  email: string,
  password: string, // bcrypt hashed
  fullName: string,
  role: 'customer' | 'staff' | 'barber' | 'admin' | 'branch_admin' | 'super_admin',
  branchId: string, // For role-based access
  profileImage?: string,
  phoneNumber?: string,
  emailVerified: boolean,
  isActive: boolean,
  createdAt: number,
  updatedAt: number
}
```

#### Bookings Table
```typescript
{
  _id: string,
  serviceId: string,
  barberId: string,
  customerId: string,
  branchId: string,
  startTime: number,
  endTime: number,
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled',
  totalAmount: number,
  paymentId?: string,
  checkInCode?: string,
  notes?: string,
  createdAt: number,
  updatedAt: number
}
```

#### Services Table
```typescript
{
  _id: string,
  name: string,
  description: string,
  duration: number, // in minutes
  price: number,
  branchId: string,
  category: string,
  isActive: boolean,
  imageUrls: string[],
  complexity: 'simple' | 'medium' | 'complex',
  createdAt: number,
  updatedAt: number
}
```

#### Payments Table
```typescript
{
  _id: string,
  bookingId?: string,
  branchId: string,
  amount: number,
  method: 'cash' | 'gcash' | 'paymaya' | 'card',
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  xenditId?: string,
  xenditStatus?: string,
  refundId?: string,
  createdAt: number,
  updatedAt: number
}
```

### Database Relationships
```
Branches (1) ←→ (N) Users
Branches (1) ←→ (N) Services
Branches (1) ←→ (N) Bookings
Branches (1) ←→ (N) Payments
Services (1) ←→ (N) Bookings
Users (1) ←→ (N) Bookings (as customer)
Users (1) ←→ (N) Bookings (as barber)
Bookings (1) ←→ (0..1) Payments
```

### Indexing Strategy
- **Branch-based indexes** for multi-tenant efficiency
- **Time-based indexes** for booking availability checks
- **User-based indexes** for personalized data retrieval
- **Status-based indexes** for workflow management
- **Composite indexes** for complex query optimization

---

## Development Workflow

### Project Structure
```
tpx-booking-app/
├── src/                    # Main application source code
│   ├── components/         # React components
│   ├── pages/             # Page-level components
│   ├── context/           # React Context providers
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   └── styles/            # Global styles
├── convex/                # Convex backend services
│   ├── schema.ts          # Database schema definition
│   └── functions/         # API functions organized by domain
├── public/                # Static assets and images
├── android/               # Native Android project
├── scripts/               # Build and deployment scripts
├── testsprite_tests/      # Automated test suites
└── docs/                  # Documentation
```

### Development Commands
```bash
# Start Development Server
npm run dev                # Start Vite dev server on port 3000

# Convex Development
npx convex dev            # Start Convex backend in development mode

# Database Management
npx convex schema upload  # Upload schema changes
npx convex dashboard      # Open Convex dashboard

# Testing
npm run test              # Run automated tests
npm run test:coverage     # Run tests with coverage report

# Code Quality
npm run lint              # Run ESLint
npm run format            # Format code with Prettier
```

### Git Workflow
```bash
# Feature Development
git checkout -b feature/new-feature
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# Deployment
git checkout main
git merge feature/new-feature
npm run deploy            # Automatic version increment and deployment
```

### Testing Strategy
- **TestSprite Integration**: Automated end-to-end testing
- **Unit Testing**: Component and function testing
- **Integration Testing**: API and database testing
- **Manual Testing**: User acceptance testing
- **Performance Testing**: Load and stress testing

### Code Quality Tools
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting and consistency
- **TypeScript**: Type safety and developer experience
- **Husky**: Git hooks for code quality
- **Conventional Commits**: Standardized commit messages

---

## Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Manual chunk optimization for vendor libraries
- **Lazy Loading**: Routes and components loaded on demand
- **Image Optimization**: Proper formats and compression
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching Strategies**: Static asset caching with service workers

### Backend Optimizations
- **Database Indexing**: 60+ strategic indexes for query performance
- **Real-time Subscriptions**: Efficient data synchronization
- **API Rate Limiting**: Protection against abuse
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Efficient data retrieval patterns

### Mobile Optimizations
- **Touch-Friendly UI**: 44px minimum touch targets
- **Responsive Design**: Mobile-first approach
- **Performance Budget**: <100KB initial bundle
- **Progressive Loading**: Content loads as needed
- **Offline Support**: Basic offline functionality

---

## Monitoring & Analytics

### Application Monitoring
- **Convex Dashboard**: Real-time database and API monitoring
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Load times and user experience tracking
- **User Analytics**: Feature usage and user behavior analysis

### Business Intelligence
- **Booking Analytics**: Appointment trends and patterns
- **Revenue Tracking**: Financial performance monitoring
- **Customer Analytics**: Customer behavior and retention
- **Staff Performance**: Barber productivity and service quality

### System Health
- **Uptime Monitoring**: Application availability tracking
- **Database Performance**: Query performance and optimization
- **API Response Times**: Backend performance monitoring
- **User Feedback**: Customer satisfaction and issue tracking

---

## Conclusion

The TPX Barbershop Booking System represents a sophisticated, modern web application with comprehensive business management capabilities. The architecture demonstrates:

- **Scalability**: Multi-branch support with complete data isolation
- **Real-time Capabilities**: Live data synchronization across all clients
- **Mobile-First Approach**: Native mobile app with responsive web interface
- **Comprehensive Business Logic**: Complete barbershop management solution
- **Modern Development Practices**: TypeScript, React, and modern tooling
- **Security Focus**: Role-based access control and data protection
- **Performance Optimization**: Efficient data retrieval and user experience

The system is production-ready and designed for growth from a single location to a multi-branch enterprise operation. The combination of modern web technologies with real-time backend capabilities provides an excellent foundation for continued development and scaling.

---

*This documentation is maintained and updated as part of the development process. For the most current information, refer to the source code and Convex dashboard.*