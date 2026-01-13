import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider } from '@clerk/clerk-react';
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { ToastProvider } from "./components/common/ToastNotification";
import { ClerkSync } from "./components/auth/ClerkSync";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AuthRedirect from "./components/common/AuthRedirect";
import Landing from "./pages/Landing";
import PlatformSelection from "./pages/PlatformSelection";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import FacebookCallback from "./pages/auth/FacebookCallback";
import StaffDashboard from "./pages/staff/Dashboard";
import POS from "./pages/staff/POS";
import AdminDashboard from "./pages/admin/Dashboard";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerBooking from "./pages/customer/Booking";
import GuestServiceBooking from "./pages/customer/GuestServiceBooking.jsx";
import TrackBooking from "./pages/customer/TrackBooking.jsx";
import Wallet from "./pages/customer/Wallet.jsx";
import WalletTopUp from "./pages/customer/WalletTopUp.jsx";
import CustomerProfile from "./pages/customer/Profile.jsx";
import BarberDashboard from "./components/barber/BarberDashboard";
import BarbersList from "./pages/barbers/BarbersList";
import BarberProfile from "./pages/barbers/BarberProfile";
import Kiosk from "./pages/Kiosk";
import PaymentSuccess from "./pages/booking/payment/success.jsx";
import PaymentFailure from "./pages/booking/payment/failure.jsx";
import Policy from "./pages/Policy.jsx";
import AccountDeletion from "./pages/AccountDeletion.jsx";
import EmailTest from "./pages/EmailTest.jsx";
import DownloadApp from "./pages/DownloadApp.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary";
import { getInitialRoute } from "./utils/platform";
import "./styles/index.css";
import "./styles/print.css";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.warn('Clerk Publishable Key not found. Clerk authentication will not be available.');
}

function App() {
  // Determine initial route based on platform
  const initialRoute = getInitialRoute();

  return (
    <AuthProvider>
      <ToastProvider>
        <BrandingProvider>
        <Router>
          <ClerkSync />
          <div className="min-h-screen bg-[var(--color-bg)]">
            <Routes>
              <Route
                path="/"
                element={
                  initialRoute === "/auth/login" ? (
                    <Navigate to="/auth/login" replace />
                  ) : (
                    <Landing />
                  )
                }
              />
              <Route path="/landing" element={<Landing />} />
              <Route path="/guest/booking" element={<GuestServiceBooking />} />
              <Route path="/track" element={<TrackBooking />} />
              <Route path="/track/:bookingCode" element={<TrackBooking />} />
              <Route path="/barbers" element={<BarbersList />} />
              <Route path="/barbers/:barberSlug" element={<BarberProfile />} />
              <Route
                path="/platform-selection"
                element={<PlatformSelection />}
              />
              <Route path="/privacy" element={<Policy />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/email-test" element={<EmailTest />} />
              <Route
                path="/auth/login"
                element={
                  <AuthRedirect>
                    <Login />
                  </AuthRedirect>
                }
              />
              <Route
                path="/auth/forgot-password"
                element={
                  <AuthRedirect>
                    <ForgotPassword />
                  </AuthRedirect>
                }
              />
              <Route
                path="/auth/reset-password"
                element={
                  <AuthRedirect>
                    <ResetPassword />
                  </AuthRedirect>
                }
              />
              <Route
                path="/auth/facebook/callback"
                element={<FacebookCallback />}
              />
              <Route
                path="/auth/register"
                element={
                  <AuthRedirect>
                    <Register />
                  </AuthRedirect>
                }
              />
              <Route
                path="/admin"
                element={<Navigate to="/admin/dashboard" replace />}
              />
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute requireSuperAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff"
                element={<Navigate to="/staff/dashboard" replace />}
              />
              <Route
                path="/staff/dashboard"
                element={
                  <ProtectedRoute requireStaff={true}>
                    <StaffDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/pos"
                element={
                  <ProtectedRoute requireStaff={true} requirePageAccess="pos">
                    <POS />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/barber"
                element={<Navigate to="/barber/home" replace />}
              />
              <Route
                path="/barber/:tab"
                element={
                  <ProtectedRoute requireBarber={true}>
                    <BarberDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer"
                element={<Navigate to="/customer/dashboard" replace />}
              />
              <Route
                path="/customer/dashboard"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/booking"
                element={
                  <ProtectedRoute>
                    <CustomerBooking />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/client"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/wallet"
                element={
                  <ProtectedRoute>
                    <Wallet />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/wallet/topup"
                element={
                  <ProtectedRoute>
                    <WalletTopUp />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/bookings"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard initialSection="bookings" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/vouchers"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard initialSection="vouchers" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/profile"
                element={
                  <ProtectedRoute>
                    <CustomerProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/notifications"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard initialSection="notifications" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/ai-assistant"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard initialSection="ai-assistant" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customer/loyalty"
                element={
                  <ProtectedRoute>
                    <CustomerDashboard initialSection="loyalty" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/kiosk"
                element={
                  <ErrorBoundary>
                    <Kiosk />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/booking/payment/success"
                element={<PaymentSuccess />}
              />
              <Route
                path="/booking/payment/failure"
                element={<PaymentFailure />}
              />
              <Route path="/download-app" element={<DownloadApp />} />
              </Routes>
          </div>
        </Router>
        </BrandingProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        elements: {
          // Global styling for all Clerk components
          rootBox: "w-full",
          card: "bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50",
          headerTitle: "text-white text-2xl font-bold",
          headerSubtitle: "text-gray-400 text-sm",
          socialButtonsBlockButton: "bg-[#2A2A2A] border border-[#3A3A3A] text-white hover:bg-[#3A3A3A] transition-all rounded-xl",
          formButtonPrimary: "bg-gradient-to-r from-[#FF8C42] to-[#FF6B35] hover:brightness-110 text-white font-semibold rounded-2xl h-12 shadow-lg",
          formFieldInput: "bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-2xl",
          formFieldLabel: "text-gray-300 font-medium text-sm",
          footerActionLink: "text-[#FF8C42] hover:text-[#FF6B35] font-semibold",
          identityPreviewText: "text-white",
          badge: "bg-[#FF8C42] text-white",
          otpCodeFieldInput: "bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-xl",
          alert: "bg-[#2A2A2A] border border-[#FF8C42]/30 text-white rounded-xl",
          alertText: "text-gray-300",
          backLink: "text-[#FF8C42] hover:text-[#FF6B35]",
          alternativeMethodsBlockButton: "bg-[#2A2A2A] border border-[#3A3A3A] text-white hover:bg-[#3A3A3A] rounded-xl",
        }
      }}
    >
      <ConvexProvider client={convex}>
        <App />
      </ConvexProvider>
    </ClerkProvider>
  </StrictMode>,
);
