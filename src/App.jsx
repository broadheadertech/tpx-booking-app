import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import StaffDashboard from './pages/staff/Dashboard'
import CustomerDashboard from './pages/customer/Dashboard'
import CustomerBooking from './pages/customer/Booking'
import Kiosk from './pages/customer/Kiosk'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-light">
        <Routes>
          <Route path="/" element={<Navigate to="/auth/login" replace />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />
          <Route path="/staff/dashboard" element={<StaffDashboard />} />
          <Route path="/customer/dashboard" element={<CustomerDashboard />} />
          <Route path="/customer/booking" element={<CustomerBooking />} />
          <Route path="/customer/kiosk" element={<Kiosk />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App