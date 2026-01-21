import React, { useState, useEffect } from 'react'
import { X, User, UserPlus, Phone, Scissors, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { createPortal } from 'react-dom'

const AddWalkInModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    assignedBarber: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(null)

  // Get barbers for the assigned barber dropdown
  const barbers = useQuery(api.services.barbers.getAllBarbers) || []
  
  // Mutation to create walk-in
  const createWalkIn = useMutation(api.services.walkIn.createWalkIn)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        number: '',
        assignedBarber: '',
        notes: ''
      })
      setError('')
      setSuccess(null)
    }
  }, [isOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name.trim() || !formData.number.trim() || !formData.assignedBarber) {
      setError('Name, phone number, and assigned barber are required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(null)
    try {
      const result = await createWalkIn({
        name: formData.name.trim(),
        number: formData.number.trim(),
        assignedBarber: formData.assignedBarber,
        notes: formData.notes?.trim() || undefined
      })
      console.log('Walk-in created successfully:', result)
      // Show success message with queue number
      setSuccess({
        message: result.message || 'Walk-in added successfully',
        queueNumber: result.queueNumber
      })
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Error creating walk-in:', error)
      setError(error.message || error.toString() || 'Failed to create walk-in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md transform rounded-2xl bg-[#1A1A1A] shadow-2xl transition-all z-[10000] border border-[#2A2A2A]/50">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
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
                    {success.queueNumber && (
                      <p className="text-lg font-bold text-green-300 mt-2">
                        Queue Number: {success.queueNumber}
                      </p>
                    )}
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
                />
              </div>
            </div>

            {/* Assigned Barber */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Assigned Barber <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Scissors className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none z-10" />
                <select
                  name="assignedBarber"
                  value={formData.assignedBarber}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm appearance-none cursor-pointer"
                  required
                >
                  <option value="">Select a barber</option>
                  {barbers.map((barber) => (
                    <option key={barber._id} value={barber.name}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

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
                rows="3"
                className="w-full px-4 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm resize-none"
              />
            </div>

            {/* Date & Time Info */}
            <div className="bg-[#0A0A0A]/50 border border-[#2A2A2A]/50 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Calendar className="h-4 w-4 text-[var(--color-primary)]" />
                <Clock className="h-4 w-4 text-[var(--color-primary)]" />
                <span>Walk-in will be recorded with current date & time</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-[#444444]/30">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors text-sm font-medium"
              >
                {success ? 'Close' : 'Cancel'}
              </button>
              {!success && (
                <button
                  type="submit"
                  disabled={loading}
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
