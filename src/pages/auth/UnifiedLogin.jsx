/**
 * Unified Login Page
 * Story 14-7: Dual Auth System for Transition
 *
 * Supports both Clerk and legacy authentication during migration.
 * - If ENABLE_CLERK_AUTH only: Shows Clerk login
 * - If ENABLE_LEGACY_AUTH only: Shows legacy login
 * - If both enabled: Shows both options
 * - Routes users based on migration status
 */

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SignIn, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import ErrorDisplay from '../../components/common/ErrorDisplay'
import { APP_VERSION } from '../../config/version'

// Feature flags - can be moved to environment variables
const ENABLE_CLERK_AUTH = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY &&
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY !== 'pk_test_YOUR_PUBLISHABLE_KEY_HERE'
const ENABLE_LEGACY_AUTH = import.meta.env.VITE_ENABLE_LEGACY_AUTH !== 'false' // Default to true during migration

function UnifiedLogin() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [errorDetails, setErrorDetails] = useState('')
  const [authMode, setAuthMode] = useState(ENABLE_CLERK_AUTH ? 'clerk' : 'legacy')
  const navigate = useNavigate()
  const { login } = useAuth()
  const { branding } = useBranding()

  // Clerk auth state (only if Clerk is configured)
  const clerkAuth = ENABLE_CLERK_AUTH ? useClerkAuth() : { isSignedIn: false }
  const clerkUser = ENABLE_CLERK_AUTH ? useUser() : { user: null }

  // Handle legacy login submit
  const handleLegacySubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setErrorDetails('')

    try {
      const result = await login(formData.email, formData.password)

      if (result.success) {
        const { role, migration_status } = result.data

        // Show migration prompt for invited users
        if (migration_status === 'invited' && ENABLE_CLERK_AUTH) {
          setError('Your account is being migrated to our new authentication system.')
          setErrorDetails('Please check your email for migration instructions, or continue with your current password.')
        }

        // Navigate based on role
        if (role === 'staff' || role === 'admin' || role === 'super_admin' || role === 'branch_admin' || role === 'admin_staff') {
          navigate('/staff/dashboard')
        } else if (role === 'barber') {
          navigate('/barber/home')
        } else {
          navigate('/customer/dashboard')
        }
      } else {
        let cleanError = result.error || 'An error occurred'
        cleanError = cleanError.replace(/^(Server Error|Uncaught Error|Error):\s*/i, '')
        setError(cleanError)
        setErrorDetails(result.details || '')
      }
    } catch (error) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleGuestLogin = () => {
    navigate('/guest/booking')
  }

  // Show only Clerk login if legacy auth is disabled
  if (ENABLE_CLERK_AUTH && !ENABLE_LEGACY_AUTH) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <ClerkLoginContent branding={branding} onGuestLogin={handleGuestLogin} />
      </div>
    )
  }

  // Show only legacy login if Clerk is not configured
  if (!ENABLE_CLERK_AUTH) {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <LegacyLoginContent
          branding={branding}
          formData={formData}
          loading={loading}
          error={error}
          errorDetails={errorDetails}
          onChange={handleChange}
          onSubmit={handleLegacySubmit}
          onGuestLogin={handleGuestLogin}
          setError={setError}
          setErrorDetails={setErrorDetails}
        />
      </div>
    )
  }

  // Derive rgba from branding hex for subtle gradients
  const primaryHex = branding?.primary_color || "#000000";
  const toRgba = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  };

  // Show both options during migration period
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 20%, ${toRgba(primaryHex, 0.03)}, transparent 50%)` }}></div>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 70% 80%, ${toRgba(primaryHex, 0.02)}, transparent 50%)` }}></div>
        <div
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{ backgroundImage: `url(${bannerImage})`, filter: 'brightness(0.3)' }}
        ></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-1">
              <img
                src={branding?.logo_light_url || '/img/tipuno_x_logo_white.avif'}
                alt="Logo"
                className="w-52 h-32 object-contain"
              />
            </div>
            <p className="text-sm font-light text-gray-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Auth Mode Tabs */}
          <div className="flex mb-4 bg-[#1A1A1A] rounded-2xl p-1 border border-[#2A2A2A]/50">
            <button
              onClick={() => setAuthMode('clerk')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                authMode === 'clerk'
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In with SSO
            </button>
            <button
              onClick={() => setAuthMode('legacy')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all ${
                authMode === 'legacy'
                  ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Email & Password
            </button>
          </div>

          {/* Auth Content */}
          {authMode === 'clerk' ? (
            <ClerkLoginContent branding={branding} onGuestLogin={handleGuestLogin} />
          ) : (
            <LegacyLoginContent
              branding={branding}
              formData={formData}
              loading={loading}
              error={error}
              errorDetails={errorDetails}
              onChange={handleChange}
              onSubmit={handleLegacySubmit}
              onGuestLogin={handleGuestLogin}
              setError={setError}
              setErrorDetails={setErrorDetails}
            />
          )}
        </div>
      </div>

      {/* Version Display */}
      <div className="fixed bottom-4 right-4 text-xs text-gray-500 text-right">
        <p>v{APP_VERSION}</p>
        <p className="text-gray-600">Barbershop</p>
      </div>
    </div>
  )
}

// Clerk Login Content Component
function ClerkLoginContent({ branding, onGuestLogin }) {
  return (
    <div className="clerk-login-container">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: branding?.primary_color || '#000000',
            colorBackground: '#1A1A1A',
            colorInputBackground: '#2A2A2A',
            colorInputText: '#FFFFFF',
            colorText: '#FFFFFF',
            colorTextSecondary: '#9CA3AF',
            colorDanger: '#EF4444',
            borderRadius: '1rem',
            fontFamily: 'inherit',
          },
          elements: {
            rootBox: 'mx-auto w-full',
            card: 'bg-[#1A1A1A] shadow-2xl border border-[#2A2A2A]/50 rounded-3xl',
            headerTitle: 'text-white text-xl font-semibold',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-[#2A2A2A] border-[#3A3A3A] text-white hover:bg-[#3A3A3A] rounded-2xl h-12',
            socialButtonsBlockButtonText: 'text-white font-medium',
            dividerLine: 'bg-[#3A3A3A]',
            dividerText: 'text-gray-500',
            formFieldLabel: 'text-gray-300 text-sm',
            formFieldInput: 'bg-[#2A2A2A] border-[#3A3A3A] text-white placeholder-gray-500 rounded-2xl h-14 focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]',
            formButtonPrimary: 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 text-white font-semibold rounded-2xl h-14 shadow-lg',
            footerActionLink: 'text-[var(--color-primary)] hover:text-[var(--color-accent)] font-semibold',
          },
        }}
        fallbackRedirectUrl="/auth/clerk-callback"
        routing="path"
        path="/auth/login"
        signUpUrl="/auth/register"
      />

      {/* Guest Button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onGuestLogin}
          className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg text-sm"
        >
          Book as Guest
        </button>
        <p className="text-xs text-gray-500 text-center mt-2">Limited access — your data won't be saved</p>
      </div>
    </div>
  )
}

// Legacy Login Content Component
function LegacyLoginContent({ branding, formData, loading, error, errorDetails, onChange, onSubmit, onGuestLogin, setError, setErrorDetails }) {
  return (
    <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
      <div className="p-8">
        {error && (
          <div className="mb-4">
            <ErrorDisplay
              error={{ message: error, details: errorDetails }}
              variant="default"
              onClose={() => { setError(''); setErrorDetails('') }}
            />
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-5">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              placeholder="Email address"
              required
              className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] text-base text-white placeholder-gray-400"
            />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onChange}
              placeholder="Password"
              required
              className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)] text-base text-white placeholder-gray-400"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Link to="/auth/forgot-password" className="text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-accent)]">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:brightness-110 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl text-base"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>

          {/* Guest Button */}
          <button
            type="button"
            onClick={onGuestLogin}
            disabled={loading}
            className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white font-semibold rounded-2xl transition-all duration-200 shadow-md text-sm"
          >
            Book as Guest
          </button>
          <p className="text-xs text-gray-500 text-center">Limited access — your data won't be saved</p>

          <div className="text-center pt-4 border-t border-[#2A2A2A]/30 mt-8">
            <span className="text-sm text-gray-400">Don't have an account? </span>
            <Link to="/auth/register" className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-accent)]">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default UnifiedLogin
