import React, { useState } from 'react'
import { Mail, Send, Loader2, X, CheckCircle, AlertCircle } from 'lucide-react'
import Modal from './Modal'
import { sendTestEmail } from '../../services/resendService'

const EmailTestModal = ({ isOpen, onClose }) => {
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

  const handleClose = () => {
    setTestEmail('')
    setTestResult(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Test Email Configuration" size="md">
      <div className="space-y-6">
        {/* Test Email Section */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-6 rounded-xl border border-[#444444]/50">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Email Configuration Test</h3>
              <p className="text-sm text-gray-400">Send a test email to verify Resend integration</p>
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
            </div>

            <button
              onClick={handleTestEmail}
              disabled={isTesting || !testEmail}
              className="w-full px-4 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className={`p-4 rounded-xl border ${
            testResult.success
              ? 'bg-green-500/10 border-green-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className="flex items-start space-x-3">
              {testResult.success ? (
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <h4 className={`font-semibold ${
                  testResult.success ? 'text-green-400' : 'text-red-400'
                }`}>
                  {testResult.success ? 'Test Email Sent Successfully!' : 'Test Email Failed'}
                </h4>
                {testResult.success ? (
                  <div className="text-sm text-green-300 mt-1">
                    <p>✅ Email sent to: {testEmail}</p>
                    <p>✅ Resend integration is working correctly</p>
                    <p className="text-xs text-green-400 mt-2">
                      Email ID: {testResult.data?.id || 'N/A'}
                    </p>
                  </div>
                ) : (
                  <div className="text-sm text-red-300 mt-1">
                    <p>❌ Error: {testResult.error}</p>
                    <div className="text-xs text-red-400 mt-2">
                      <p>Common issues:</p>
                      <ul className="list-disc list-inside ml-2 space-y-1">
                        <li>Invalid Resend API key</li>
                        <li>From email domain not verified</li>
                        <li>Rate limit exceeded</li>
                        <li>Network connectivity issues</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Configuration Info */}
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#444444]/50">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Current Configuration</h4>
          <div className="space-y-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>API Key:</span>
              <span className="text-gray-300">
                {import.meta.env.RESEND_API_KEY ?
                  `${import.meta.env.RESEND_API_KEY.substring(0, 8)}...` :
                  'Not configured'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>From Email:</span>
              <span className="text-gray-300">
                {import.meta.env.VITE_RESEND_FROM_EMAIL || 'no-reply@tipunox.broadheader.com'}
              </span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default EmailTestModal