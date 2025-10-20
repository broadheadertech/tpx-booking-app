import React from 'react'
import { createPortal } from 'react-dom'
import { Save, X, AlertCircle } from 'lucide-react'

const BranchFormModal = ({ 
  isOpen, 
  onClose, 
  title, 
  onSubmit, 
  formData, 
  onInputChange, 
  error, 
  loading, 
  isEdit = false 
}) => {
  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] shadow-2xl transition-all z-[10000] border border-[#444444]/50">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Branch Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter branch name"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={onInputChange}
                  rows="3"
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter branch address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="border-t border-[#444444]/30 pt-4">
                <h4 className="text-sm font-semibold text-white mb-3">Booking Hours</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                    <select
                      name="booking_start_hour"
                      value={formData.booking_start_hour ?? 10}
                      onChange={onInputChange}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                    <select
                      name="booking_end_hour"
                      value={formData.booking_end_hour ?? 20}
                      onChange={onInputChange}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Set the available booking time range for this branch (default: 10:00 AM - 8:00 PM)
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : (isEdit ? 'Update Branch' : 'Create Branch')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BranchFormModal