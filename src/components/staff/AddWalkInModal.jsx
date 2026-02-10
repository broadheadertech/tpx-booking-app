import React, { useState, useEffect, useMemo } from 'react'
import { X, User, UserPlus, Phone, Scissors, Calendar, Clock, AlertCircle, CheckCircle, Package, Users } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { createPortal } from 'react-dom'

const formatSlotTime = (time) => {
  if (!time) return ''
  try {
    return new Date(`1970-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return time
  }
}

const AddWalkInModal = ({ isOpen, onClose }) => {
  const { user } = useCurrentUser()
  const branchId = user?.branch_id

  const [formData, setFormData] = useState({
    name: '',
    number: '',
    barberId: '',      // actual barber ID or 'any'
    serviceId: '',
    scheduledTime: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Fetch barbers for the user's branch
  const barbers = useQuery(api.services.barbers.getAllBarbers, { limit: 100 }) || []
  const branchBarbers = useMemo(
    () => barbers.filter((b) => b.branch_id === branchId && b.is_active !== false),
    [barbers, branchId]
  )

  // Fetch active services for the branch
  const services = useQuery(
    api.services.services.getActiveServicesByBranch,
    branchId ? { branch_id: branchId } : 'skip'
  )

  // Fetch available time slots (reactive)
  const isAnyBarber = formData.barberId === 'any'
  const realBarberId = !isAnyBarber && formData.barberId ? formData.barberId : undefined

  const slotsData = useQuery(
    api.services.walkIn.getAvailableSlots,
    branchId && formData.serviceId
      ? {
          branch_id: branchId,
          ...(realBarberId ? { barber_id: realBarberId } : {}),
          service_id: formData.serviceId,
        }
      : 'skip'
  )

  const createWalkIn = useMutation(api.services.walkIn.createWalkIn)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ name: '', number: '', barberId: '', serviceId: '', scheduledTime: '', notes: '' })
      setError('')
      setSuccess(null)
    }
  }, [isOpen])

  // Reset downstream selections when barber changes
  useEffect(() => {
    setFormData((prev) => ({ ...prev, scheduledTime: '' }))
  }, [formData.barberId, formData.serviceId])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.number.trim()) {
      setError('Name and phone number are required')
      return
    }
    if (!formData.barberId) {
      setError('Please select a barber')
      return
    }
    if (!formData.serviceId) {
      setError('Please select a service')
      return
    }
    if (!formData.scheduledTime) {
      setError('Please select a time slot')
      return
    }

    // For "any barber", resolve the actual barber from the slot selection
    let finalBarberId = formData.barberId
    if (isAnyBarber) {
      // scheduledTime is stored as "barberId|HH:MM"
      const [bId] = formData.scheduledTime.split('|')
      finalBarberId = bId
    }

    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const selectedBarber = barbers.find((b) => b._id === finalBarberId)
      if (!selectedBarber) {
        setError('Selected barber not found.')
        setLoading(false)
        return
      }

      const timeSlot = isAnyBarber ? formData.scheduledTime.split('|')[1] : formData.scheduledTime

      const payload = {
        name: formData.name.trim(),
        number: formData.number.trim(),
        barberId: finalBarberId,
        service_id: formData.serviceId,
        scheduled_time: timeSlot,
        notes: formData.notes?.trim() || undefined,
      }

      const result = await createWalkIn(payload)

      if (!result.success) {
        setError(result.message || 'Failed to create walk-in.')
        setLoading(false)
        return
      }

      setSuccess({
        message: result.message || 'Walk-in added successfully',
        queueNumber: result.queueNumber,
        time: timeSlot,
        barber: selectedBarber.name || selectedBarber.full_name,
      })

      setTimeout(() => onClose(), 2500)
    } catch (err) {
      console.error('Error creating walk-in:', err)
      setError(err.message || 'Failed to create walk-in.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  if (!isOpen) return null

  // Flatten slots for "any barber" display
  const allSlots = slotsData?.slots || []
  const hasSlots = allSlots.some((bs) => bs.slots.length > 0)

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-[#2A2A2A]/50 max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30 sticky top-0 bg-[#1A1A1A] z-10">
            <h3 className="text-xl font-bold text-white">Add Walk-in</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-400/20 border border-green-400/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-400">{success.message}</p>
                    <div className="mt-2 space-y-1">
                      {success.queueNumber && (
                        <p className="text-lg font-bold text-green-300">
                          Queue #{success.queueNumber}
                        </p>
                      )}
                      {success.time && (
                        <p className="text-sm text-green-300/80">
                          {formatSlotTime(success.time)} — {success.barber}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Customer Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="tel"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Assigned Barber */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Barber <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Scissors className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <select
                  name="barberId"
                  value={formData.barberId}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm appearance-none cursor-pointer disabled:opacity-50"
                  required
                  disabled={loading}
                >
                  <option value="">Select a barber</option>
                  <option value="any">Any Available Barber</option>
                  {branchBarbers.map((barber) => (
                    <option key={barber._id} value={barber._id}>
                      {barber.name || barber.full_name}
                    </option>
                  ))}
                </select>
              </div>
              {isAnyBarber && (
                <p className="mt-1 text-xs text-blue-400 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  System will assign the barber with the earliest slot
                </p>
              )}
            </div>

            {/* Service Selection */}
            {formData.barberId && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Service <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                  <select
                    name="serviceId"
                    value={formData.serviceId}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm appearance-none cursor-pointer disabled:opacity-50"
                    required
                    disabled={loading}
                  >
                    <option value="">Select a service</option>
                    {(services || []).map((svc) => (
                      <option key={svc._id} value={svc._id}>
                        {svc.name} — {svc.duration_minutes}min{svc.hide_price ? '' : ` (₱${svc.price})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Available Time Slots */}
            {formData.barberId && formData.serviceId && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Available Time Slots <span className="text-red-400">*</span>
                </label>

                {slotsData === undefined ? (
                  <div className="flex items-center gap-2 p-3 text-gray-400 text-sm">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--color-primary)]" />
                    Loading slots...
                  </div>
                ) : !hasSlots ? (
                  <div className="p-4 bg-amber-400/10 border border-amber-400/20 rounded-lg text-center">
                    <Clock className="h-5 w-5 text-amber-400 mx-auto mb-1" />
                    <p className="text-sm text-amber-400">No available slots for today</p>
                    <p className="text-xs text-gray-500 mt-1">All time slots are occupied or past</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {allSlots
                      .filter((bs) => bs.slots.length > 0)
                      .map((bs) => (
                        <div key={bs.barber_id}>
                          {/* Show barber name header only for "any barber" mode */}
                          {isAnyBarber && (
                            <p className="text-xs font-medium text-gray-400 mb-1.5">
                              {bs.barber_name}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {bs.slots.map((slot, idx) => {
                              const slotKey = isAnyBarber ? `${bs.barber_id}|${slot}` : slot
                              const isSelected = formData.scheduledTime === slotKey
                              const isFirst = idx === 0

                              return (
                                <button
                                  key={slotKey}
                                  type="button"
                                  disabled={loading}
                                  onClick={() =>
                                    setFormData((prev) => ({
                                      ...prev,
                                      scheduledTime: slotKey,
                                    }))
                                  }
                                  className={`relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                                    isSelected
                                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                                      : 'bg-[#0A0A0A] text-gray-300 border-[#444444] hover:border-[var(--color-primary)]/50 hover:text-white'
                                  }`}
                                >
                                  {formatSlotTime(slot)}
                                  {isFirst && idx === 0 && !isAnyBarber && (
                                    <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-green-500 text-white px-1 rounded-full">
                                      Next
                                    </span>
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes (optional)"
                rows="2"
                className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm resize-none disabled:opacity-50"
                disabled={loading}
              />
            </div>

            {/* Summary */}
            {formData.scheduledTime && (
              <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A]/50 rounded-lg p-3">
                <div className="flex items-center space-x-2 text-sm text-gray-400">
                  <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                  <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                  <span>
                    Scheduled for{' '}
                    <span className="text-white font-medium">
                      {formatSlotTime(
                        isAnyBarber
                          ? formData.scheduledTime.split('|')[1]
                          : formData.scheduledTime
                      )}
                    </span>
                    {isAnyBarber && formData.scheduledTime && (
                      <>
                        {' '}with{' '}
                        <span className="text-white font-medium">
                          {allSlots.find(
                            (bs) => bs.barber_id === formData.scheduledTime.split('|')[0]
                          )?.barber_name || 'Barber'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-[#444444]/30">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors text-sm font-medium"
                disabled={loading}
              >
                {success ? 'Close' : 'Cancel'}
              </button>
              {!success && (
                <button
                  type="submit"
                  disabled={loading || !formData.scheduledTime}
                  className="flex items-center space-x-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Add Walk-in</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AddWalkInModal
