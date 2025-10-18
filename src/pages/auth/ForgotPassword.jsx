import { useState } from 'react'
import { Link } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/common/ToastNotification'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const { requestPasswordReset } = useAuth()
  const toast = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await requestPasswordReset(email)
      if (res.success) {
        toast.success('Reset link sent', 'If the email exists, we sent instructions to your email.')
      } else {
        toast.error('Request failed', res.error || 'Please try again')
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      
      // Check if it's the restricted API key error
      if (error.message && error.message.includes('development mode')) {
        toast.error('Service unavailable', 'Email service is currently in development mode. Please contact support.')
      } else {
        toast.error('Request failed', error.message || 'Please try again')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{ backgroundImage: `url(${bannerImage})`, filter: 'brightness(0.3)' }}
        ></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto">
          <div className="text-center mb-6">
            <div className="flex justify-center mb-1">
              <img src="/img/tipuno_x_logo_white.avif" alt="TipunoX Angeles Barbershop Logo" className="w-52 h-32 object-contain" />
            </div>
            <p className="text-sm font-light text-gray-400">
              Forgot your password? We'll help you reset it with email instructions.
            </p>
          </div>

          <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] active:from-[#FF6B1A] active:to-[#E8610F] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:transform-none text-base"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>

                <div className="text-center pt-2">
                  <Link to="/auth/login" className="text-sm font-medium text-[#FF8C42] hover:text-[#FF7A2B] transition-colors">
                    Back to Sign In
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

export default ForgotPassword


