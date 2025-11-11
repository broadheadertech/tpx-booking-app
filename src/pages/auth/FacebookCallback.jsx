import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorDisplay from '../../components/common/ErrorDisplay'

function FacebookCallback() {
  const navigate = useNavigate()
  const { loginWithFacebook } = useAuth()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hash = window.location.hash || ''
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
    const accessToken = params.get('access_token')
    const errorParam = params.get('error')

    async function completeLogin() {
      try {
        if (errorParam) {
          setError('Facebook authorization was cancelled or failed')
          setLoading(false)
          return
        }
        if (!accessToken) {
          setError('No access token returned from Facebook')
          setLoading(false)
          return
        }
        const result = await loginWithFacebook(accessToken)
        if (result.success) {
          navigate('/customer/dashboard')
        } else {
          // Parse error for better user experience
          let errorMessage = result.error || 'Facebook login failed'
          if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('expired')) {
            errorMessage = 'Facebook authentication failed. The login token is invalid or expired. Please try again.'
          } else if (errorMessage.toLowerCase().includes('development')) {
            errorMessage = 'Facebook login is currently unavailable. Please use email/password login instead.'
          }
          setError(errorMessage)
        }
      } catch (e) {
        console.error('Facebook login error:', e)
        let errorMessage = 'Facebook login error. Please try again.'
        if (e?.message) {
          try {
            const parsed = JSON.parse(e.message)
            if (parsed.message) {
              errorMessage = parsed.message
            }
          } catch {
            if (e.message.toLowerCase().includes('invalid') || e.message.toLowerCase().includes('expired')) {
              errorMessage = 'Facebook authentication failed. Please try logging in again.'
            } else {
              errorMessage = e.message || errorMessage
            }
          }
        }
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    void completeLogin()
  }, [loginWithFacebook, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-sm p-6">
        {loading && (
          <div className="flex flex-col items-center gap-4 text-white">
            <LoadingSpinner />
            <span>Completing Facebook sign-in…</span>
          </div>
        )}
        {!!error && (
          <ErrorDisplay 
            error={error}
            onClose={() => setError('')}
          />
        )}
      </div>
    </div>
  )
}

export default FacebookCallback


