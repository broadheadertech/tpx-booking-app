import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // TODO: Implement authentication logic
    // For now, redirect based on demo logic
    if (formData.email.includes('staff')) {
      navigate('/staff/dashboard')
    } else {
      navigate('/customer/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-gray-800 rounded-lg border-2 border-orange-500 p-6 shadow-2xl">
          <h1 className="text-white text-xl font-bold text-center mb-6">Login</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Username"
                required
                className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors duration-200 text-sm"
              />
            </div>
            
            <div>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Password"
                required
                className="w-full h-10 px-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 transition-colors duration-200 text-sm"
              />
            </div>
            
            <div className="text-right">
              <a href="#" className="text-gray-400 text-xs hover:text-gray-300">
                Forgot Password?
              </a>
            </div>
            
            <button
              type="submit"
              className="w-full h-10 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold rounded transition-all duration-200 text-sm"
            >
              Login
            </button>
            
            <div className="text-center">
              <span className="text-gray-400 text-xs">Don't have an account? </span>
              <Link 
                to="/auth/register" 
                className="text-orange-500 hover:text-orange-400 font-medium text-xs"
              >
                Sign up
              </Link>
            </div>
            
            {/* Development only button */}
            <div className="text-center mt-4">
              <Link 
                to="/staff/dashboard" 
                className="inline-block w-full h-8 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded transition-colors duration-200 leading-8"
              >
                Continue to Dashboard (Dev)
              </Link>
            </div>
            
            {/* Client Portal Button */}
            <div className="text-center mt-2">
              <Link 
                to="/customer/client" 
                className="inline-block w-full h-8 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white text-xs font-bold rounded transition-all duration-200 leading-8 shadow-lg"
              >
                Continue to Client Portal
              </Link>
            </div>
            
            {/* Kiosk Mode Button */}
            <div className="text-center mt-2">
              <Link 
                to="/kiosk" 
                className="inline-block w-full h-8 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-bold rounded transition-all duration-200 leading-8 shadow-lg"
              >
                Continue to Kiosk
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login