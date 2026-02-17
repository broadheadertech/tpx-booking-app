import { useLocation } from 'react-router-dom'
import { CreditCard, AlertTriangle, Phone, Mail, ArrowLeft } from 'lucide-react'

export default function SubscriptionBlocked() {
  const location = useLocation()
  const { reason, overdueMonths, message } = location.state || {}

  const isCancelled = reason === 'cancelled'

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Card */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] p-8 text-center space-y-6">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
            isCancelled
              ? 'bg-red-500/10'
              : 'bg-amber-500/10'
          }`}>
            {isCancelled ? (
              <CreditCard className="w-10 h-10 text-red-500" />
            ) : (
              <AlertTriangle className="w-10 h-10 text-amber-500" />
            )}
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isCancelled ? 'Subscription Cancelled' : 'Subscription Payment Required'}
            </h1>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-3 ${
              isCancelled
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            }`}>
              {isCancelled ? 'Access Suspended' : `${overdueMonths || 1} Month${(overdueMonths || 1) !== 1 ? 's' : ''} Overdue`}
            </div>
          </div>

          {/* Message */}
          <p className="text-gray-400 leading-relaxed text-sm">
            {message || (isCancelled
              ? 'Your branch subscription has been cancelled. Access to the platform has been temporarily restricted.'
              : `Your branch has outstanding subscription payments. The 30-day grace period has expired and access has been temporarily restricted.`
            )}
          </p>

          {/* What to do */}
          <div className="bg-[#0A0A0A] rounded-xl p-5 text-left space-y-3 border border-[#2A2A2A]">
            <p className="text-sm font-medium text-white">To restore access:</p>
            <ol className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <span>Contact your branch administrator or IT department</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <span>{isCancelled ? 'Request subscription reactivation' : 'Settle all outstanding payments'}</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <span>Your access will be restored once the subscription is active</span>
              </li>
            </ol>
          </div>

          {/* Contact */}
          <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
            <a href="mailto:support@broadheader.com" className="flex items-center space-x-1.5 hover:text-gray-300 transition-colors">
              <Mail className="w-3.5 h-3.5" />
              <span>support@broadheader.com</span>
            </a>
          </div>

          {/* Back to login */}
          <div className="pt-2">
            <a
              href="/auth/login"
              className="inline-flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to login</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
