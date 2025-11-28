import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle } from 'lucide-react'
import bannerImage from '../../assets/img/banner.jpg'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'

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
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()
  const { branding } = useBranding()

  // Convex mutation
  const registerUser = useMutation(api.services.auth.registerUser)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters'
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // Mobile number validation
    if (!formData.mobile_number.trim()) {
      newErrors.mobile_number = 'Mobile number is required'
    } else if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(formData.mobile_number)) {
      newErrors.mobile_number = 'Please enter a valid mobile number (at least 7 digits)'
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Clear previous messages
    setSuccess('')
    setErrors({})

    // Validate form
    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)

    try {
      // Determine user role (default to customer for registration)
      const userRole = 'customer'

      // Generate username from full name and timestamp
      const timestamp = Date.now().toString(36)
      const baseUsername = formData.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const username = baseUsername ? `${baseUsername}_${timestamp}` : `user_${timestamp}`

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

      setSuccess('✓ Registration successful! Redirecting to login...')
      setTimeout(() => {
        navigate('/auth/login')
      }, 2000)
    } catch (error) {
      console.error('Registration error:', error)
      
      // Parse error using the same logic as AuthContext
      let parsedError = {
        message: 'An unexpected error occurred. Please try again.',
        details: 'Please try again or contact support if the problem persists.',
        action: '',
        code: ''
      }
      
      try {
        // Try to parse structured error
        if (error?.message) {
          try {
            const parsed = JSON.parse(error.message)
            if (parsed.message && parsed.code) {
              parsedError = parsed
            }
          } catch (jsonError) {
            // Not JSON, check for common patterns
            const message = error.message.toLowerCase()
            if (message.includes('email') && (message.includes('already exists') || message.includes('exists'))) {
              parsedError = {
                message: 'An account with this email already exists.',
                details: 'This email address is already registered in our system.',
                action: 'Try signing in instead, or use a different email address.',
                code: 'AUTH_EMAIL_EXISTS'
              }
              setErrors({ email: parsedError.message })
            } else if (message.includes('username') && (message.includes('already exists') || message.includes('taken'))) {
              parsedError = {
                message: 'This username is already taken.',
                details: 'Someone else is already using this username.',
                action: 'Please choose a different name.',
                code: 'AUTH_USERNAME_EXISTS'
              }
              setErrors({ fullName: parsedError.message })
            } else if (message.includes('branch') && message.includes('required')) {
              parsedError = {
                message: 'Registration failed.',
                details: 'Branch assignment is required for this account type.',
                action: 'Please contact support for assistance.',
                code: 'VALIDATION_ERROR'
              }
        } else {
              parsedError.message = error.message
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing registration error:', parseError)
      }
      
      // Set general error if not field-specific
      if (!errors.email && !errors.fullName) {
        setErrors({ general: parsedError.message })
      }
    } finally {
      setLoading(false)
    }
  }

  const getFieldError = (fieldName) => errors[fieldName]
  const hasFieldError = (fieldName) => !!errors[fieldName]

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
                src={branding?.logo_light_url } 
                alt=" Barbershop Logo" 
                className="w-52 h-32 object-contain"
              />
            </div>
            
            <p className="text-sm font-light text-gray-400">Create your account to get started</p>
          </div>

          {/* Registration Form */}
          <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
            <div className="p-6">
              {/* General Error Display */}
              {errors.general && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-300 font-medium">Registration Error</p>
                    <p className="text-xs text-red-200 mt-1">{errors.general}</p>
                  </div>
                </div>
              )}

              {/* Success Display */}
              {success && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-green-300 font-medium">{success}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Full Name"
                      className={`w-full h-14 px-5 bg-[#2A2A2A] border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base text-white placeholder-gray-400 ${
                        hasFieldError('fullName')
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-[#3A3A3A] focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]'
                      }`}
                    />
                    {getFieldError('fullName') && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{getFieldError('fullName')}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email address"
                      className={`w-full h-14 px-5 bg-[#2A2A2A] border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base text-white placeholder-gray-400 ${
                        hasFieldError('email')
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-[#3A3A3A] focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]'
                      }`}
                    />
                    {getFieldError('email') && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{getFieldError('email')}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Mobile Number */}
                  <div>
                    <input
                      type="tel"
                      name="mobile_number"
                      value={formData.mobile_number}
                      onChange={handleChange}
                      placeholder="Mobile number"
                      className={`w-full h-14 px-5 bg-[#2A2A2A] border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base text-white placeholder-gray-400 ${
                        hasFieldError('mobile_number')
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-[#3A3A3A] focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]'
                      }`}
                    />
                    {getFieldError('mobile_number') && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{getFieldError('mobile_number')}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date of Birth (Optional)</label>
                    <input
                      type="date"
                      name="birthday"
                      value={formData.birthday}
                      onChange={handleChange}
                      className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] transition-all duration-300 text-base text-white"
                    />
                  </div>
                  
                  {/* Password */}
                  <div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Password"
                      className={`w-full h-14 px-5 bg-[#2A2A2A] border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base text-white placeholder-gray-400 ${
                        hasFieldError('password')
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-[#3A3A3A] focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]'
                      }`}
                    />
                    {getFieldError('password') && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{getFieldError('password')}</span>
                      </p>
                    )}
                    {!getFieldError('password') && formData.password && (
                      <p className="text-xs text-gray-400 mt-1">✓ Password requirements met</p>
                    )}
                  </div>
                  
                  {/* Confirm Password */}
                  <div>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Confirm password"
                      className={`w-full h-14 px-5 bg-[#2A2A2A] border rounded-2xl focus:outline-none focus:ring-2 transition-all duration-300 text-base text-white placeholder-gray-400 ${
                        hasFieldError('confirmPassword')
                          ? 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500'
                          : 'border-[#3A3A3A] focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]'
                      }`}
                    />
                    {getFieldError('confirmPassword') && (
                      <p className="text-xs text-red-400 mt-1 flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{getFieldError('confirmPassword')}</span>
                      </p>
                    )}
                    {!getFieldError('confirmPassword') && formData.confirmPassword && formData.password === formData.confirmPassword && (
                      <p className="text-xs text-green-400 mt-1">✓ Passwords match</p>
                    )}
                  </div>
                </div>
                
                <div className="pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 active:from-[var(--color-accent)] active:brightness-75 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:transform-none text-base"
                  >
                    {loading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </div>
                
                <div className="text-center pt-4 border-t border-[#2A2A2A]/30 mt-6">
                  <span className="text-sm text-gray-400">Already have an account? </span>
                  <Link 
                    to="/auth/login" 
                    className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent)] active:text-[var(--color-accent)] transition-colors"
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