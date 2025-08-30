import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ErrorDisplay from '../../components/common/ErrorDisplay'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    nickname: '',
    mobile_number: '',
    email: '',
    birthday: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  // Convex mutation
  const registerUser = useMutation(api.services.auth.registerUser)

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
    setSuccess('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Determine user role (default to customer for registration)
      const userRole = 'customer' // You can add role selection later

      await registerUser({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname || undefined,
        mobile_number: formData.mobile_number,
        email: formData.email,
        birthday: formData.birthday || undefined,
        role: userRole
      })

      setSuccess('Registration successful! Please log in with your credentials.')
      setTimeout(() => {
        navigate('/auth/login')
      }, 2000)
    } catch (error) {
      console.error('Registration error:', error)
      setError(error.message || 'An unexpected error occurred. Please try again.')
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
          <div className="text-center mb-8">
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-18 h-18 p-3 bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-3xl shadow-2xl ring-4 ring-[#FF8C42]/20">
                <img 
                  src="/img/tipuno_x_logo_white.avif" 
                  alt="TPX Barbershop Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            
            <h1 className="text-2xl font-light tracking-wider mb-3 text-white">
              <span className="font-thin">TPX</span>
              <span className="font-extralight ml-2 text-[#FF8C42]">BARBERSHOP</span>
            </h1>
            <p className="text-sm font-light text-gray-400">Create your account to get started</p>
          </div>

          {/* Registration Form */}
          <div className="bg-gradient-to-b from-[#2A2A2A]/90 to-[#333333]/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#444444]/30">
            <div className="p-6">
              {error && (
                <div className="mb-4">
                  <ErrorDisplay 
                    error={error} 
                    variant="compact"
                    onClose={() => setError('')}
                  />
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                  <p className="text-sm text-green-400">{success}</p>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Username"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                  
                  <input
                    type="text"
                    name="nickname"
                    value={formData.nickname}
                    onChange={handleChange}
                    placeholder="Nickname"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                  
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                  
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    placeholder="Mobile number"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                  
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white shadow-inner"
                  />
                  
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                  
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                    className="w-full h-14 px-5 bg-[#1A1A1A]/80 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:bg-[#1A1A1A] transition-all duration-300 text-base text-white placeholder-gray-400 shadow-inner"
                  />
                </div>
                
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] active:from-[#FF6B1A] active:to-[#E8610F] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:transform-none text-base"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
                
                <div className="text-center pt-4 border-t border-[#444444]/30 mt-6">
                  <span className="text-sm text-gray-400">Already have an account? </span>
                  <Link 
                    to="/auth/login" 
                    className="text-sm font-semibold text-[#FF8C42] hover:text-[#FF7A2B] active:text-[#FF6B1A] transition-colors"
                  >
                    Sign In
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

export default Register