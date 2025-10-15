import React from 'react'
import { createPortal } from 'react-dom'
import { Save, X, AlertCircle } from 'lucide-react'

const UserFormModal = ({ 
  isOpen, 
  onClose, 
  title, 
  buttonText = 'Create User',
  loadingText = 'Creating...',
  onSubmit, 
  formData, 
  onInputChange, 
  error, 
  loading,
  branches,
  isEditMode = false
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    placeholder="Enter username"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    required
                  >
                    <option value="branch_admin">Branch Admin</option>
                    <option value="staff">Staff</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
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

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {isEditMode ? '(leave blank to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                  required={!isEditMode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mobile Number</label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={onInputChange}
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter mobile number"
                />
              </div>

              {formData.role !== 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Branch *</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={onInputChange}
                    className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                    required
                  >
                    <option value="">Select Branch</option>
                    {branches?.map(branch => (
                      <option key={branch._id} value={branch._id}>
                        {branch.name} ({branch.branch_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={onInputChange}
                  rows="2"
                  className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="Enter address"
                />
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
                  <span>{loading ? loadingText : buttonText}</span>
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

export default UserFormModal