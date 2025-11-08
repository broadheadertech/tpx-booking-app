import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'
import ErrorDisplay from '../../components/common/ErrorDisplay'
import { APP_VERSION } from '../../config/version'

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState('')
  const [errorAction, setErrorAction] = useState('')
  const navigate = useNavigate()
  const { login, loginWithFacebook } = useAuth()
  const [fbLoading, setFbLoading] = useState(false)
  const [fbReady, setFbReady] = useState(false)

  // Load Facebook SDK with fbAsyncInit (recommended)
  useEffect(() => {
    if (window.FB) return
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (!appId) {
      console.warn('VITE_FACEBOOK_APP_ID is not set')
      setError('Facebook login is not configured. Please set VITE_FACEBOOK_APP_ID in .env.local')
    }
    window.fbAsyncInit = function () {
      try {
        window.FB.init({
          appId: appId,
          cookie: true,
          xfbml: false,
          version: 'v19.0'
        })
        setFbReady(true)
      } catch (e) {
        console.error('FB.init error:', e)
      }
    }
    ;(function (d, s, id) {
      const fjs = d.getElementsByTagName(s)[0]
      if (d.getElementById(id)) return
      const js = d.createElement(s)
      js.id = id
      js.async = true
      js.defer = true
      js.src = 'https://connect.facebook.net/en_US/sdk.js'
      fjs.parentNode.insertBefore(js, fjs)
    })(document, 'script', 'facebook-jssdk')
  }, [])

  const handleFacebookLogin = () => {
    const appId = import.meta.env.VITE_FACEBOOK_APP_ID
    if (!appId) {
      setError('Facebook login is not configured. Please set VITE_FACEBOOK_APP_ID in .env.local')
      return
    }
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError('Facebook login requires HTTPS. Please use HTTPS or localhost for development.')
      return
    }
    setFbLoading(true)
    setError('')
    const redirectUri = `${window.location.origin}/auth/facebook/callback`
    const scope = 'public_profile,email'
    const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${encodeURIComponent(appId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`
    window.location.href = authUrl
  }

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
    setErrorDetails('')
    setErrorAction('')

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
        setErrorDetails(result.details || '')
        setErrorAction(result.action || '')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
      setErrorDetails('If this problem persists, please contact support.')
    } finally {
      setLoading(false)
    }
  }

  // 🧩 NEW: Guest login handler
  const handleGuestLogin = () => {
    try {
      setLoading(true)
      setError('')
      // Optionally store guest state
      localStorage.setItem('guestUser', JSON.stringify({ role: 'guest', name: 'Guest User' }))
      navigate('/customer/dashboard') // or '/guest/dashboard' if you prefer
    } catch (err) {
      setError('Unable to continue as guest. Please try again.')
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
            
            <p className="text-sm font-light text-gray-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Login Form */}
          <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
            <div className="p-8">
              {error && (
                <div className="mb-4">
                  <ErrorDisplay 
                    error={error} 
                    variant="compact"
                    onClose={() => {
                      setError('')
                      setErrorDetails('')
                      setErrorAction('')
                    }}
                  />
                  {errorDetails && (
                    <p className="text-xs text-gray-400 mt-2">{errorDetails}</p>
                  )}
                  {errorAction && (
                    <p className="text-xs text-[#FF8C42] mt-1">{errorAction}</p>
                  )}
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
                      className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
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
                      className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-2">
                  <Link to="/auth/forgot-password" className="text-sm font-medium text-[#FF8C42] hover:text-[#FF7A2B] transition-colors active:text-[#FF6B1A]">
                    Forgot Password?
                  </Link>
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

                {/* Facebook Button */}
                <div className="pt-2">
                  <div className="relative">
                    <button
                      type="button"
                      disabled={true}
                      className="w-full h-12 bg-gray-600 text-gray-400 font-semibold rounded-2xl transition-all duration-200 cursor-not-allowed text-sm flex items-center justify-center gap-2 opacity-60"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M22.675 0h-21.35C.595 0 0 .594 0 1.326v21.348C0 23.406.595 24 1.325 24h11.495v-9.294H9.847v-3.622h2.973V8.413c0-2.943 1.796-4.548 4.418-4.548 1.256 0 2.336.093 2.65.135v3.07l-1.82.001c-1.428 0-1.703.679-1.703 1.675v2.197h3.406l-.444 3.622h-2.962V24h5.809C23.406 24 24 23.406 24 22.674V1.326C24 .594 23.406 0 22.675 0z"/></svg>
                      Continue with Facebook
                    </button>
                    <span className="absolute -top-2 -right-2 bg-[#FF8C42] text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      Coming Soon
                    </span>
                  </div>
                </div>

                {/* 🧩 New Guest Button */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleGuestLogin}
                    disabled={loading}
                    className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] active:bg-[#4A4A4A] text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed text-sm"
                  >
                    Continue as Guest
                  </button>
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Limited access — your data won’t be saved
                  </p>
                </div>

                <div className="text-center pt-4 border-t border-[#2A2A2A]/30 mt-8">
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

      {/* Version Display */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 text-right">
        <p>v{APP_VERSION}</p>
        <p className="text-gray-600">TPX Barbershop</p>
      </div>
    </div>
  )
}

export default Login
