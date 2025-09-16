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
          setError(result.error || 'Facebook login failed')
        }
      } catch (e) {
        setError('Facebook login error. Please try again.')
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


