import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/common/ProtectedRoute'
import AuthRedirect from './components/common/AuthRedirect'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import StaffDashboard from './pages/staff/Dashboard'
import POS from './pages/staff/POS'
import CustomerDashboard from './pages/customer/Dashboard'
import CustomerBooking from './pages/customer/Booking'
import BarberDashboard from './components/barber/BarberDashboard'
import Kiosk from './pages/Kiosk'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-light">
          <Routes>
            <Route path="/" element={<Navigate to="/auth/login" replace />} />
            <Route 
              path="/auth/login" 
              element={
                <AuthRedirect>
                  <Login />
                </AuthRedirect>
              } 
            />
            <Route 
              path="/auth/register" 
              element={
                <AuthRedirect>
                  <Register />
                </AuthRedirect>
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
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App