import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'
import ErrorDisplay from '../../components/common/ErrorDisplay'

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

        if (role === 'staff' || role === 'admin' || role === 'super_admin' || role === 'branch_admin') {
          navigate('/staff/dashboard')
        } else if (role === 'barber') {
          navigate('/barber/dashboard')
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
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(${bannerImage})`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            {/* Logo */}
            <div className="flex justify-center mb-1">
              <img 
                src="/img/tipuno_x_logo_white.avif" 
                alt="TipunoX Angeles Barbershop Logo" 
                className="w-52 h-32 object-contain"
              />
            </div>
            
            <p className="text-sm font-light text-gray-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Login Form */}
          <div className="bg-gradient-to-b from-[#2A2A2A]/90 to-[#333333]/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#444444]/30">
            <div className="p-8">
              {error && (
                <div className="mb-4">
                  <ErrorDisplay 
                    error={error} 
                    variant="compact"
                    onClose={() => setError('')}
                  />
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-5">
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      required
                      className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
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
                      className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <a href="#" className="text-sm font-medium text-[#FF8C42] hover:text-[#FF7A2B] transition-colors active:text-[#FF6B1A]">
                    Forgot Password?
                  </a>
                </div>
                
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] active:from-[#FF6B1A] active:to-[#E8610F] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:transform-none text-base"
                  >
                    {loading ? 'Signing In...' : 'Sign In'}
                  </button>
                </div>
                
                <div className="text-center pt-4 border-t border-[#444444]/30 mt-8">
                  <span className="text-sm text-gray-400">Don't have an account? </span>
                  <Link 
                    to="/auth/register" 
                    className="text-sm font-semibold text-[#FF8C42] hover:text-[#FF7A2B] active:text-[#FF6B1A] transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}

export default Login