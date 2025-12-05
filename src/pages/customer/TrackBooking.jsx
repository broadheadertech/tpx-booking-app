import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useBranding } from '../../context/BrandingContext'
import {
  Search, Clock, CheckCircle, XCircle, Phone, AlertCircle,
  ArrowLeft, Calendar, User, MapPin, FileText, Mail
} from 'lucide-react'

const TrackBooking = () => {
  const { bookingCode: urlBookingCode } = useParams()
  const navigate = useNavigate()
  const { branding } = useBranding()
  const [searchCode, setSearchCode] = useState(urlBookingCode || '')
  const [activeCode, setActiveCode] = useState(urlBookingCode || '')

  // Query for booking by code
  const bookingResult = useQuery(
    api.services.customBookingSubmissions.getSubmissionByBookingCode,
    activeCode ? { booking_code: activeCode.toUpperCase() } : 'skip'
  )

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchCode.trim()) {
      setActiveCode(searchCode.trim().toUpperCase())
    }
  }

  // Status configuration
  const statusConfig = {
    pending: {
      label: 'Pending Review',
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      icon: AlertCircle,
      message: 'Your booking request is being reviewed. We will contact you shortly.',
      step: 1
    },
    contacted: {
      label: 'Contacted',
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      icon: Phone,
      message: 'We have reviewed your request and will contact you to discuss details.',
      step: 2
    },
    confirmed: {
      label: 'Confirmed',
      color: 'bg-green-500/20 text-green-400 border-green-500/30',
      icon: CheckCircle,
      message: 'Your booking is confirmed! We look forward to seeing you.',
      step: 3
    },
    completed: {
      label: 'Completed',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle,
      message: 'Thank you for your visit! We hope you enjoyed your experience.',
      step: 4
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-500/20 text-red-400 border-red-500/30',
      icon: XCircle,
      message: 'This booking has been cancelled. Please contact us if you have questions.',
      step: -1
    }
  }

  const StatusIcon = ({ status }) => {
    const config = statusConfig[status] || statusConfig.pending
    const Icon = config.icon
    return <Icon className="w-5 h-5" />
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-PH', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Timeline steps
  const timelineSteps = [
    { key: 'pending', label: 'Request Submitted', icon: FileText },
    { key: 'contacted', label: 'Contacted', icon: Phone },
    { key: 'confirmed', label: 'Confirmed', icon: CheckCircle },
    { key: 'completed', label: 'Completed', icon: CheckCircle }
  ]

  const getCurrentStep = (status) => {
    if (status === 'cancelled') return -1
    const steps = ['pending', 'contacted', 'confirmed', 'completed']
    return steps.indexOf(status) + 1
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">Track Booking</p>
              <p className="text-xs" style={{ color: branding?.primary_color || '#D4A574' }}>
                Custom Booking Status
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" style={{ color: branding?.primary_color || '#D4A574' }} />
              Track Your Booking
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                placeholder="Enter booking code (e.g., CB123456)"
                className="flex-1 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] uppercase font-mono"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-bold text-black transition-all"
                style={{ backgroundColor: branding?.primary_color || '#D4A574' }}
              >
                Track
              </button>
            </div>
          </div>
        </form>

        {/* Loading State */}
        {activeCode && bookingResult === undefined && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-4"
              style={{ borderColor: branding?.primary_color || '#D4A574' }}></div>
            <p className="text-gray-400">Looking up your booking...</p>
          </div>
        )}

        {/* Not Found State */}
        {activeCode && bookingResult === null && (
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-[#2A2A2A] text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Booking Not Found</h3>
            <p className="text-gray-400 mb-4">
              We couldn't find a booking with code <span className="font-mono text-white">{activeCode}</span>.
            </p>
            <p className="text-sm text-gray-500">
              Please check the code and try again, or contact us for assistance.
            </p>
          </div>
        )}

        {/* Booking Found */}
        {bookingResult && (
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Booking Code</p>
                  <p className="text-2xl font-mono font-bold" style={{ color: branding?.primary_color || '#D4A574' }}>
                    {bookingResult.booking_code || activeCode}
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg border ${statusConfig[bookingResult.status]?.color || statusConfig.pending.color}`}>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={bookingResult.status} />
                    <span className="font-semibold">{statusConfig[bookingResult.status]?.label || 'Pending'}</span>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="p-4 rounded-lg bg-[#0A0A0A] border-l-4"
                style={{ borderColor: branding?.primary_color || '#D4A574' }}>
                <p className="text-gray-300">
                  {statusConfig[bookingResult.status]?.message || 'Your booking is being processed.'}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {bookingResult.status !== 'cancelled' && (
              <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-6">Booking Progress</h3>
                <div className="relative">
                  {/* Progress Line */}
                  <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-[#2A2A2A]" />
                  <div
                    className="absolute left-4 top-4 w-0.5 transition-all duration-500"
                    style={{
                      height: `${Math.max(0, (getCurrentStep(bookingResult.status) - 1) / 3 * 100)}%`,
                      backgroundColor: branding?.primary_color || '#D4A574'
                    }}
                  />

                  {/* Steps */}
                  <div className="space-y-6">
                    {timelineSteps.map((step, index) => {
                      const currentStep = getCurrentStep(bookingResult.status)
                      const isCompleted = index + 1 <= currentStep
                      const isCurrent = index + 1 === currentStep
                      const StepIcon = step.icon

                      return (
                        <div key={step.key} className="flex items-start gap-4 relative">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                              isCompleted
                                ? 'border-transparent'
                                : 'bg-[#1A1A1A] border-[#2A2A2A]'
                            }`}
                            style={{
                              backgroundColor: isCompleted ? (branding?.primary_color || '#D4A574') : undefined
                            }}
                          >
                            <StepIcon className={`w-4 h-4 ${isCompleted ? 'text-black' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1 pt-1">
                            <p className={`font-semibold ${isCompleted ? 'text-white' : 'text-gray-500'}`}>
                              {step.label}
                            </p>
                            {isCurrent && (
                              <p className="text-sm text-gray-400 mt-1">Current status</p>
                            )}
                          </div>
                          {isCompleted && (
                            <CheckCircle className="w-5 h-5 mt-1" style={{ color: branding?.primary_color || '#D4A574' }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Booking Details */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
              <h3 className="text-lg font-bold text-white mb-4">Booking Details</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Customer Name</p>
                    <p className="text-white font-medium">{bookingResult.customer_name}</p>
                  </div>
                </div>

                {bookingResult.customer_email && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Email</p>
                      <p className="text-white font-medium">{bookingResult.customer_email}</p>
                    </div>
                  </div>
                )}

                {bookingResult.customer_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-400">Phone</p>
                      <p className="text-white font-medium">{bookingResult.customer_phone}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Barber</p>
                    <p className="text-white font-medium">{bookingResult.barber_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Branch</p>
                    <p className="text-white font-medium">{bookingResult.branch_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Form</p>
                    <p className="text-white font-medium">{bookingResult.form_title}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-400">Submitted</p>
                    <p className="text-white font-medium">{formatDate(bookingResult.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Responses */}
            {bookingResult.responses && Object.keys(bookingResult.responses).length > 0 && (
              <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
                <h3 className="text-lg font-bold text-white mb-4">Your Responses</h3>
                <div className="space-y-3">
                  {bookingResult.form_fields?.map(field => {
                    const response = bookingResult.responses[field.id]
                    if (response === undefined || response === null || response === '') return null

                    let displayValue = response
                    if (Array.isArray(response)) {
                      displayValue = response.join(', ')
                    } else if (typeof response === 'object') {
                      displayValue = `${response.from || ''} - ${response.to || ''}`
                    }

                    return (
                      <div key={field.id} className="p-3 bg-[#0A0A0A] rounded-lg">
                        <p className="text-sm text-gray-400 mb-1">{field.label}</p>
                        <p className="text-white">{displayValue}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A] text-center">
              <h3 className="text-lg font-bold text-white mb-2">Need Help?</h3>
              <p className="text-gray-400 mb-4">
                If you have any questions about your booking, please contact us.
              </p>
              <a
                href="/"
                className="inline-block px-6 py-3 rounded-xl font-bold text-black transition-all"
                style={{ backgroundColor: branding?.primary_color || '#D4A574' }}
              >
                Back to Home
              </a>
            </div>
          </div>
        )}

        {/* No Active Search */}
        {!activeCode && (
          <div className="bg-[#1A1A1A] rounded-xl p-8 border border-[#2A2A2A] text-center">
            <div className="w-16 h-16 rounded-full bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enter Your Booking Code</h3>
            <p className="text-gray-400">
              Enter the booking code you received when submitting your custom booking request.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrackBooking
