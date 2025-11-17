import React, { useState } from 'react'
import { Mail, Send, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { sendTestEmail } from '../services/emailjsService'

const EmailTest = () => {
  const [testEmail, setTestEmail] = useState('')
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      alert('Please enter a valid email address')
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      console.log('🧪 Testing email to:', testEmail)

      const result = await sendTestEmail(testEmail)
      setTestResult(result)

      if (result.success) {
        console.log('✅ Test email sent successfully!')
      } else {
        console.error('❌ Test email failed:', result.error)
      }
    } catch (error) {
      console.error('❌ Test email error:', error)
      setTestResult({
        success: false,
        error: error.message || 'Unknown error occurred'
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A0A] to-[#1A1A1A]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <Link
            to="/staff/dashboard"
            className="p-2 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#3A3A3A] transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Email Configuration Test</h1>
            <p className="text-gray-400 mt-1">Debug and test your Resend email integration</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Current Configuration */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-6 rounded-xl border border-[#444444]/50">
            <h2 className="text-xl font-semibold text-white mb-4">Current Configuration</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1A1A1A] p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">EmailJS Service ID</div>
                <div className="text-white font-mono text-sm">
                  {import.meta.env.VITE_EMAILJS_SERVICE_ID ?
                    `${import.meta.env.VITE_EMAILJS_SERVICE_ID.substring(0, 8)}...` :
                    '❌ Not configured'
                  }
                </div>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">EmailJS Template ID</div>
                <div className="text-white font-mono text-sm">
                  {import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?
                    `${import.meta.env.VITE_EMAILJS_TEMPLATE_ID.substring(0, 8)}...` :
                    '❌ Not configured'
                  }
                </div>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">EmailJS Public Key</div>
                <div className="text-white font-mono text-sm">
                  {import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?
                    `${import.meta.env.VITE_EMAILJS_PUBLIC_KEY.substring(0, 8)}...` :
                    '❌ Not configured'
                  }
                </div>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Service Status</div>
                <div className="text-green-400 font-mono text-sm">
                  ✅ EmailJS (No Restrictions)
                </div>
              </div>
            </div>
          </div>

          {/* Test Email Section */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-6 rounded-xl border border-[#444444]/50">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Send Test Email</h2>
                <p className="text-gray-400">Verify your Resend integration is working</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Test Email Address
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] transition-colors"
                  disabled={isTesting}
                />
                <p className="text-xs text-green-400 mt-2">
                  ✅ EmailJS can send to any email address - no restrictions!
                </p>
              </div>

              <button
                onClick={handleTestEmail}
                disabled={isTesting || !testEmail}
                className="w-full px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending Test Email...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Send Test Email</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-6 rounded-xl border ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="flex items-start space-x-4">
                {testResult.success ? (
                  <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0 mt-1" />
                ) : (
                  <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0 mt-1" />
                )}
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${
                    testResult.success ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {testResult.success ? 'Test Email Sent Successfully!' : 'Test Email Failed'}
                  </h3>
                  {testResult.success ? (
                    <div className="text-green-300 mt-2 space-y-1">
                      <p>✅ Email sent to: <span className="font-mono">{testEmail}</span></p>
                      <p>✅ Resend integration is working correctly</p>
                      {testResult.data?.id && (
                        <p className="text-sm text-green-400">
                          Email ID: <span className="font-mono">{testResult.data.id}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-300 mt-2">
                      <p className="font-medium">❌ Error: {testResult.error}</p>
                      <div className="text-sm text-red-400 mt-3 bg-red-900/20 p-3 rounded-lg">
                        <p className="font-medium mb-2">Common troubleshooting steps:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Verify VITE_RESEND_API_KEY is correct in .env.local</li>
                          <li>Ensure from email domain is verified in Resend dashboard</li>
                          <li>Check if you've exceeded rate limits</li>
                          <li>Verify network connectivity</li>
                          <li>Check browser console for detailed errors</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Debug Information */}
          <div className="bg-[#1A1A1A] p-6 rounded-xl border border-[#444444]/50">
            <h3 className="text-lg font-semibold text-white mb-4">Debug Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Environment:</span>
                <span className="text-white">{import.meta.env.MODE}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">EmailJS Service:</span>
                <span className="text-white font-mono">Client-side sending</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Browser Console:</span>
                <span className="text-white">Check for detailed logs</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Restrictions:</span>
                <span className="text-green-400">None - send to any email!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailTest