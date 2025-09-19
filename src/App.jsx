import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import AuthRedirect from './components/common/AuthRedirect'
import Landing from './pages/Landing'
import PlatformSelection from './pages/PlatformSelection'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import FacebookCallback from './pages/auth/FacebookCallback'
import StaffDashboard from './pages/staff/Dashboard'
import POS from './pages/staff/POS'
import AdminDashboard from './pages/admin/Dashboard'
import CustomerDashboard from './pages/customer/Dashboard'
import CustomerBooking from './pages/customer/Booking'
import BarberDashboard from './components/barber/BarberDashboard'
import Kiosk from './pages/Kiosk'
import PaymentSuccess from './pages/booking/payment/success.jsx'
import PaymentFailure from './pages/booking/payment/failure.jsx'
import Policy from './pages/Policy.jsx'
import AccountDeletion from './pages/AccountDeletion.jsx'
import EmailTest from './pages/EmailTest.jsx'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-light">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/landing" element={<Landing />} />
            <Route path="/platform-selection" element={<PlatformSelection />} />
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
            <Route path="/auth/facebook/callback" element={<FacebookCallback />} />
            <Route 
              path="/auth/register" 
              element={
                <AuthRedirect>
                  <Register />
                </AuthRedirect>
              } 
            />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route 
              path="/admin/dashboard" 
              element={
                <ProtectedRoute requireSuperAdmin={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="/staff" element={<Navigate to="/staff/dashboard" replace />} />
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
                <ProtectedRoute requireStaff={true}>
                  <POS />
                </ProtectedRoute>
              } 
            />
            <Route path="/barber" element={<Navigate to="/barber/dashboard" replace />} />
            <Route 
              path="/barber/dashboard" 
              element={
                <ProtectedRoute requireBarber={true}>
                  <BarberDashboard />
                </ProtectedRoute>
              } 
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
            <Route path="/kiosk" element={<Kiosk />} />
            <Route path="/booking/payment/success" element={<PaymentSuccess />} />
            <Route path="/booking/payment/failure" element={<PaymentFailure />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App