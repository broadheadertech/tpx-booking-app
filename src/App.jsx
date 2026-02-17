import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { AuthProvider } from "./context/AuthContext";
import { BrandingProvider } from "./context/BrandingContext";
import { BranchProvider } from "./context/BranchContext";
import { CartProvider } from "./context/CartContext";
import { ToastProvider } from "./components/common/ToastNotification";
import { AppModalProvider } from "./context/AppModalContext";
import ProtectedRoute from "./components/common/ProtectedRoute";
import AuthRedirect from "./components/common/AuthRedirect";
import Landing from "./pages/Landing";
import PlatformSelection from "./pages/PlatformSelection";
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";
import FacebookCallback from "./pages/auth/FacebookCallback";
import ClerkLogin from "./pages/auth/ClerkLogin";
import ClerkSignUp from "./pages/auth/ClerkSignUp";
import ClerkCallback from "./pages/auth/ClerkCallback";
import SecuritySettings from "./pages/settings/Security";
import StaffDashboard from "./pages/staff/Dashboard";
import POS from "./pages/staff/POS";
import AdminDashboard from "./pages/admin/Dashboard";
import ITAdminDashboard from "./pages/it-admin/Dashboard";
import AccountBanned from "./pages/AccountBanned";
import SubscriptionBlocked from "./pages/SubscriptionBlocked";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerBooking from "./pages/customer/Booking";
import GuestServiceBooking from "./pages/customer/GuestServiceBooking.jsx";
import TrackBooking from "./pages/customer/TrackBooking.jsx";
import Wallet from "./pages/customer/Wallet.jsx";
import WalletTopUp from "./pages/customer/WalletTopUp.jsx";
import CustomerProfile from "./pages/customer/Profile.jsx";
import Shop from "./pages/customer/Shop.jsx";
import BarberDashboard from "./components/barber/BarberDashboard";
import BarbersList from "./pages/barbers/BarbersList";
import BarberProfile from "./pages/barbers/BarberProfile";
import BranchProfile from "./pages/b/BranchProfile";
import LiveQueue from "./pages/b/LiveQueue";
import WalkInForm from "./pages/b/WalkInForm";
import Kiosk from "./pages/Kiosk";
import PaymentSuccess from "./pages/booking/payment/success.jsx";
import PaymentFailure from "./pages/booking/payment/failure.jsx";
import Policy from "./pages/Policy.jsx";
import AccountDeletion from "./pages/AccountDeletion.jsx";
import EmailTest from "./pages/EmailTest.jsx";
import FaceCheckIn from "./components/staff/FaceCheckIn";
import DownloadApp from "./pages/DownloadApp.jsx";
import ErrorBoundary from "./components/common/ErrorBoundary";
import MaintenanceGuard from "./components/common/MaintenanceGuard";
import { getInitialRoute } from "./utils/platform";

function App() {
  // Determine initial route based on platform
  const initialRoute = getInitialRoute();

  // Initialize Capacitor native plugins on app start
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Set status bar to overlay mode (full screen) with dark text
      import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        StatusBar.setOverlaysWebView({ overlay: true });
        StatusBar.setStyle({ style: Style.Dark });
        StatusBar.setBackgroundColor({ color: "#00000000" });
      }).catch(() => {});

      // Handle deep links for Clerk OAuth redirects
      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appUrlOpen", (event) => {
          const url = new URL(event.url);
          const path = url.pathname + url.search;
          if (path) {
            window.location.hash = path;
          }
        });
      }).catch(() => {});
    }
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AppModalProvider>
        <BrandingProvider>
          <BranchProvider>
            <CartProvider>
        <Router>
          <MaintenanceGuard>
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
              {/* Public Branch Profile */}
              <Route path="/b/:slug" element={<BranchProfile />} />
              <Route path="/b/:slug/queue" element={<LiveQueue />} />
              <Route path="/b/:slug/walkin" element={<WalkInForm />} />
              <Route
                path="/platform-selection"
                element={<PlatformSelection />}
              />
              <Route path="/privacy" element={<Policy />} />
              <Route path="/account-deletion" element={<AccountDeletion />} />
              <Route path="/email-test" element={<EmailTest />} />
              {/* Primary Login - Clerk Authentication */}
              {/* Clerk uses sub-routes for multi-step auth (factor-one, factor-two, etc.) */}
              <Route
                path="/auth/login/*"
                element={
                  <AuthRedirect>
                    <ClerkLogin />
                  </AuthRedirect>
                }
              />
              {/* Legacy login redirect to Clerk */}
              <Route
                path="/auth/clerk-login/*"
                element={<Navigate to="/auth/login" replace />}
              />
              {/* Staff/Admin Login - Redirect to Clerk (universal login) */}
              <Route
                path="/auth/staff-login"
                element={<Navigate to="/auth/login" replace />}
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
                path="/auth/clerk-callback"
                element={<ClerkCallback />}
              />
              {/* Security Settings (Story 10-5: MFA) */}
              <Route
                path="/settings/security"
                element={
                  <ProtectedRoute>
                    <SecuritySettings />
                  </ProtectedRoute>
                }
              />
              {/* Clerk uses sub-routes for multi-step signup (verification, etc.) */}
              <Route
                path="/auth/register/*"
                element={
                  <AuthRedirect>
                    <ClerkSignUp />
                  </AuthRedirect>
                }
              />
              <Route
                path="/it-admin"
                element={<Navigate to="/it-admin/dashboard" replace />}
              />
              <Route
                path="/it-admin/dashboard"
                element={
                  <ProtectedRoute requireItAdmin={true}>
                    <ITAdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="/account-banned" element={<AccountBanned />} />
              <Route path="/subscription-blocked" element={<SubscriptionBlocked />} />
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
                path="/staff/face-attendance"
                element={
                  <ProtectedRoute requireStaff={true} requirePageAccess="attendance">
                    <FaceCheckIn />
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
                path="/customer/shop"
                element={
                  <ProtectedRoute>
                    <Shop />
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
              {/* PayMongo payment redirect routes (Story 7.6) */}
              <Route
                path="/booking/payment-success"
                element={<PaymentSuccess />}
              />
              <Route
                path="/booking/payment-failed"
                element={<PaymentFailure />}
              />
              <Route path="/download-app" element={<DownloadApp />} />
              </Routes>
          </div>
          </MaintenanceGuard>
        </Router>
            </CartProvider>
          </BranchProvider>
        </BrandingProvider>
        </AppModalProvider>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
