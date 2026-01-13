import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SignUp, SignedIn, SignedOut, useUser } from '@clerk/clerk-react'
import bannerImage from '../../assets/img/banner.jpg'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'
import { useAuth } from '../../context/AuthContext'
import { APP_VERSION } from '../../config/version'

function Register() {
  const [loading, setLoading] = useState(false)
  const [sessionCreated, setSessionCreated] = useState(false)
  const navigate = useNavigate()
  const { branding } = useBranding()
  const { user, isLoaded } = useUser()
  const { isAuthenticated } = useAuth()
  const syncClerkUser = useMutation(api.services.clerkSync.manualSyncClerkUser)
  const createSession = useMutation(api.services.clerkSync.createSessionForClerkUser)

  // Auto-sync and create session after registration
  useEffect(() => {
    const setupUserAndSession = async () => {
      if (isLoaded && user && !isAuthenticated && !sessionCreated) {
        try {
          setLoading(true)
          
          // Extract user data from Clerk
          const firstName = user.firstName || ''
          const lastName = user.lastName || ''
          const email = user.primaryEmailAddress?.emailAddress || ''
          const username = user.username || email.split('@')[0] || `user_${Date.now()}`
          const phoneNumber = user.primaryPhoneNumber?.phoneNumber || ''
          const avatar = user.imageUrl || ''

          // Step 1: Sync to Convex (creates user if doesn't exist)
          await syncClerkUser({
            clerkUserId: user.id,
            email: email,
            username: username,
            firstName: firstName,
            lastName: lastName,
            avatar: avatar,
            phoneNumber: phoneNumber,
          })

          console.log('✅ User synced to Convex successfully')

          // Step 2: Create session for AuthContext
          const result = await createSession({
            clerkUserId: user.id
          })

          if (result && result.sessionToken) {
            // Store session token in localStorage for AuthContext
            localStorage.setItem('session_token', result.sessionToken)
            setSessionCreated(true)
            
            // Reload to trigger AuthContext and redirect based on role
            window.location.href = '/customer/dashboard'
          }
        } catch (error) {
          console.error('Failed to setup user session:', error)
          setLoading(false)
        }
      }
    }

    setupUserAndSession()
  }, [isLoaded, user, isAuthenticated, sessionCreated, syncClerkUser, createSession])

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

          {/* Clerk Sign Up */}
          <SignedOut>
            <div>
              <SignUp 
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
                signInUrl="/auth/login"
                routing="path"
                path="/auth/register"
              />
            </div>
          </SignedOut>

          {/* Signed In State - Auto-sync to Convex */}
          <SignedIn>
            <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50 p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-white mb-2">✓ Registration Complete!</h3>
                  <p className="text-sm text-gray-400">Setting up your account...</p>
                </div>
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto"></div>
                  <p className="text-xs text-gray-500 mt-3">Creating your profile and session...</p>
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

export default Register