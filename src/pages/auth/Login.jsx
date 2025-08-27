import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await login(formData.email, formData.password)

      if (result.success) {
        const { role } = result.data

        if (role === 'staff' || role === 'admin') {
          navigate('/staff/dashboard')
        } else {
          navigate('/customer/dashboard')
        }
      } else {
        setError(result.error)
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Background with banner image */}
      <div className="absolute inset-0">
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-10"
          style={{
            backgroundImage: `url(${bannerImage})`,
            filter: 'brightness(0.3)'
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/20 to-orange-200/10"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-light tracking-wider mb-2" style={{color: '#36454F'}}>
              <span className="font-thin">TPX</span>
              <span className="font-extralight ml-2" style={{color: '#F68B24'}}>BARBERSHOP</span>
            </h1>
            <div className="flex justify-center mb-3">
              <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-400 to-transparent"></div>
            </div>
            <p className="text-sm font-light tracking-widest uppercase" style={{color: '#8B8B8B'}}>Welcome Back</p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-2xl shadow-xl border" style={{borderColor: '#E0E0E0'}}>
            <div className="p-8">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#36454F'}}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-200 text-sm"
                    style={{color: '#36454F'}}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: '#36454F'}}>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all duration-200 text-sm"
                    style={{color: '#36454F'}}
                  />
                </div>
                
                <div className="text-right">
                  <a href="#" className="text-sm font-medium hover:underline" style={{color: '#F68B24'}}>
                    Forgot Password?
                  </a>
                </div>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-lg"
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                
                <div className="text-center">
                  <span className="text-sm" style={{color: '#8B8B8B'}}>Don't have an account? </span>
                  <Link 
                    to="/auth/register" 
                    className="text-sm font-semibold hover:underline"
                    style={{color: '#F68B24'}}
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </div>

            {/* Development Navigation */}
            <div className="border-t px-8 py-6 space-y-3" style={{borderColor: '#E0E0E0', backgroundColor: '#FAFAFA'}}>
              <p className="text-xs font-medium text-center mb-4" style={{color: '#8B8B8B'}}>Quick Access (Development)</p>
              <div className="space-y-3">
              <Link 
                to="/staff/dashboard" 
                className="block w-full h-10 bg-gray-100 hover:bg-gray-200 text-center leading-10 text-sm font-medium rounded-lg transition-colors duration-200"
                style={{color: '#36454F'}}
              >
                Staff Dashboard
              </Link>
              
              <Link 
                to="/customer/client" 
                className="block w-full h-10 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-center leading-10 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md"
              >
                Client Portal
              </Link>
              
              <Link 
                to="/kiosk" 
                className="block w-full h-10 text-center leading-10 text-sm font-medium rounded-lg transition-all duration-200 border-2 hover:shadow-md"
                style={{borderColor: '#F68B24', color: '#F68B24'}}
              >
                Kiosk Mode
              </Link>
            </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default Login