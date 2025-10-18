import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ErrorDisplay from '../../components/common/ErrorDisplay'
import Card from '../../components/common/Card'

function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
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

    // Form validation
    if (!formData.fullName.trim()) {
      setError('Full name is required')
      setLoading(false)
      return
    }

    if (!formData.email.trim()) {
      setError('Email address is required')
      setLoading(false)
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (!formData.mobile_number.trim()) {
      setError('Mobile number is required')
      setLoading(false)
      return
    }

    if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(formData.mobile_number)) {
      setError('Please enter a valid mobile number')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      // Determine user role (default to customer for registration)
      const userRole = 'customer' // You can add role selection later

      // Generate username from full name and timestamp
      const timestamp = Date.now().toString(36);
      const baseUsername = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const username = baseUsername ? `${baseUsername}_${timestamp}` : `user_${timestamp}`;

      await registerUser({
        username: username,
        password: formData.password,
        nickname: formData.fullName || undefined,
        mobile_number: formData.mobile_number,
        email: formData.email,
        birthday: formData.birthday || undefined,
        role: userRole,
        branch_id: undefined // Customers don't need branch assignment
      })

      setSuccess('Registration successful! Please log in with your credentials.')
      setTimeout(() => {
        navigate('/auth/login')
      }, 2000)
    } catch (error) {
      console.error('Registration error:', error)
      let errorMessage = 'An unexpected error occurred. Please try again.'
      
      if (error.message) {
        if (error.message.includes('Email already exists')) {
          errorMessage = 'This email address is already registered. Please use a different email or try logging in.'
        } else if (error.message.includes('Username already exists')) {
          errorMessage = 'This full name is already taken. Please use a different name.'
        } else if (error.message.includes('Branch ID is required')) {
          errorMessage = 'Registration failed. Please contact support.'
        } else {
          errorMessage = error.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
            
            <p className="text-sm font-light text-gray-400">Create your account to get started</p>
          </div>

          {/* Registration Form */}
          <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
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
                <div className="mb-4">
                  <Card variant="success" className="text-center">
                    <p className="text-sm">{success}</p>
                  </Card>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Full Name"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                  
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                  
                  <input
                    type="tel"
                    name="mobile_number"
                    value={formData.mobile_number}
                    onChange={handleChange}
                    placeholder="Mobile number"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                  
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleChange}
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white"
                  />
                  
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                  
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm password"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
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
                
                <div className="text-center pt-4 border-t border-[#2A2A2A]/30 mt-6">
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