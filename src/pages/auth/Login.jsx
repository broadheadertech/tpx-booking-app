import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignIn, SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import bannerImage from '../../assets/img/banner.jpg'
import { useBranding } from '../../context/BrandingContext'
import { useAuth } from '../../context/AuthContext'
import { APP_VERSION } from '../../config/version'

function Login() {
  const [loading, setLoading] = useState(false)
  const [sessionCreated, setSessionCreated] = useState(false)
  const navigate = useNavigate()
  const { branding } = useBranding()
  const { user: clerkUser, isLoaded } = useUser()
  const { isAuthenticated } = useAuth()
  const createSession = useMutation(api.services.clerkSync.createSessionForClerkUser)
  
  // Query user data from Convex to get role
  const convexUser = useQuery(
    api.services.clerkSync.getUserByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  )

  // Create AuthContext session after Clerk login
  useEffect(() => {
    const setupSession = async () => {
      if (isLoaded && clerkUser && !isAuthenticated && !sessionCreated && convexUser) {
        try {
          setLoading(true)
          
          // Create session in Convex
          const result = await createSession({
            clerkUserId: clerkUser.id
          })

          if (result && result.sessionToken) {
            // Store session token in localStorage for AuthContext
            localStorage.setItem('session_token', result.sessionToken)
            setSessionCreated(true)
            
            // Redirect based on user role
            let redirectPath = '/customer/dashboard'
            
            switch (convexUser.role) {
              case 'super_admin':
                redirectPath = '/admin/dashboard'
                break
              case 'staff':
              case 'admin':
              case 'branch_admin':
                redirectPath = '/staff/dashboard'
                break
              case 'barber':
                redirectPath = '/barber/home'
                break
              case 'customer':
              default:
                redirectPath = '/customer/dashboard'
                break
            }
            
            // Reload the page to trigger AuthContext to pick up the session
            window.location.href = redirectPath
          }
        } catch (error) {
          console.error('Failed to create session:', error)
          setLoading(false)
        }
      }
    }

    setupSession()
  }, [isLoaded, clerkUser, isAuthenticated, sessionCreated, createSession, convexUser])

  // Guest login handler
  const handleGuestLogin = () => {
    try {
      setLoading(true)
      navigate('/guest/booking')
    } catch (err) {
      console.error('Unable to continue as guest:', err)
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
                src={branding?.logo_light_url || '/img/tipuno_x_logo_white.avif'} 
                alt="Barbershop Logo" 
                className="w-52 h-32 object-contain"
              />
            </div>
            
            <p className="text-sm font-light text-gray-400">Welcome back! Please sign in to continue.</p>
          </div>

          {/* Clerk Sign In */}
          <SignedOut>
            <div>
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50 w-full",
                    headerTitle: "text-white text-2xl font-bold",
                    headerSubtitle: "text-gray-400 text-sm",
                    socialButtonsBlockButton: "bg-[#2A2A2A] border border-[#3A3A3A] text-white hover:bg-[#3A3A3A] transition-all rounded-xl",
                    socialButtonsBlockButtonText: "text-white font-medium",
                    formButtonPrimary: "bg-gradient-to-r from-[#FF8C42] to-[#FF6B35] hover:brightness-110 text-white font-semibold rounded-2xl h-12 shadow-lg",
                    formFieldInput: "bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-2xl h-14 px-5",
                    formFieldLabel: "text-gray-300 font-medium text-sm",
                    footerActionLink: "text-[#FF8C42] hover:text-[#FF6B35] font-semibold",
                    footerActionText: "text-gray-400 text-sm",
                    identityPreviewText: "text-white",
                    identityPreviewEditButtonIcon: "text-gray-400",
                    formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
                    dividerLine: "bg-[#3A3A3A]",
                    dividerText: "text-gray-400 text-sm",
                    formHeaderTitle: "text-white",
                    formHeaderSubtitle: "text-gray-400",
                    otpCodeFieldInput: "bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-xl",
                    formResendCodeLink: "text-[#FF8C42] hover:text-[#FF6B35]",
                    alert: "bg-[#2A2A2A] border border-[#FF8C42]/30 text-white rounded-xl",
                    alertText: "text-gray-300",
                    backLink: "text-[#FF8C42] hover:text-[#FF6B35]",
                    backRow: "text-gray-400",
                    alternativeMethodsBlockButton: "bg-[#2A2A2A] border border-[#3A3A3A] text-white hover:bg-[#3A3A3A] rounded-xl",
                    alternativeMethodsBlockButtonText: "text-white",
                    footer: "hidden"
                  },
                  layout: {
                    socialButtonsPlacement: "top",
                    socialButtonsVariant: "blockButton"
                  }
                }}
                signUpUrl="/auth/register"
                routing="path"
                path="/auth/login"
              />
              
              {/* Guest Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGuestLogin}
                  disabled={loading}
                  className="w-full h-12 bg-[#2A2A2A] hover:bg-[#3A3A3A] active:brightness-95 text-white font-semibold rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed text-sm border border-[#3A3A3A]"
                >
                  Book as Guest
                </button>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Limited access — your data won't be saved
                </p>
              </div>
            </div>
          </SignedOut>

          {/* Signed In State - Creating session */}
          <SignedIn>
            <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50 p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">✓ Login Successful!</h3>
                  <p className="text-sm text-gray-400">Setting up your session...</p>
                </div>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-3">Please wait...</p>
                </div>
              </div>
            </div>
          </SignedIn>
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

export default Login
