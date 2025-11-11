import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import bannerImage from '../../assets/img/banner.jpg'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/common/ToastNotification'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const { resetPassword } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  useEffect(() => {
    const t = searchParams.get('token') || ''
    setToken(t)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!token) {
      toast.error('Invalid link', 'Reset token is missing')
      return
    }
    if (password.length < 6) {
      toast.warning('Weak password', 'Use at least 6 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Mismatch', 'Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await resetPassword(token, password)
      if (res.success) {
        toast.success('Password reset', 'You can now sign in with your new password')
        navigate('/auth/login')
      } else {
        // Parse error message for better user experience
        let errorMessage = res.error || 'Failed to reset password'
        if (errorMessage.toLowerCase().includes('expired') || errorMessage.toLowerCase().includes('invalid')) {
          errorMessage = 'Your password reset link has expired or is invalid. Please request a new one.'
        }
        toast.error('Reset failed', errorMessage)
      }
    } catch (error) {
      console.error('Reset password error:', error)
      let errorMessage = 'Failed to reset password. Please try again.'
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message)
          if (parsed.message) {
            errorMessage = parsed.message
          }
        } catch {
          if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
            errorMessage = 'Your password reset link has expired or is invalid. Please request a new one.'
          } else {
            errorMessage = error.message
          }
        }
      }
      toast.error('Reset failed', errorMessage)
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
            <p className="text-sm font-light text-gray-400">Enter your new password below.</p>
          </div>

          <div className="bg-[#1A1A1A] backdrop-blur-xl rounded-3xl shadow-2xl border border-[#2A2A2A]/50">
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    name="confirm"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    className="w-full h-14 px-5 bg-[#2A2A2A] border border-[#3A3A3A] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42] transition-all duration-300 text-base text-white placeholder-gray-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] active:from-[#FF6B1A] active:to-[#E8610F] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:transform-none text-base"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPassword


