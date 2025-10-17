import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Save, X, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset validation errors when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setValidationErrors({})
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Real-time validation
  const validateField = (name, value) => {
    const errors = { ...validationErrors }
    
    switch (name) {
      case 'username':
        if (!value.trim()) {
          errors.username = 'Username is required'
        } else if (value.length < 3) {
          errors.username = 'Username must be at least 3 characters'
        } else if (value.length > 50) {
          errors.username = 'Username must be less than 50 characters'
        } else if (!/^[a-zA-Z0-9_\-\.]+$/.test(value)) {
          errors.username = 'Username can only contain letters, numbers, hyphens, underscores, and dots'
        } else if (value.startsWith('.') || value.endsWith('.')) {
          errors.username = 'Username cannot start or end with a dot'
        } else if (value.includes('..')) {
          errors.username = 'Username cannot contain consecutive dots'
        } else {
          delete errors.username
        }
        break
        
      case 'email':
        if (!value.trim()) {
          errors.email = 'Email is required'
        } else if (value.length > 254) {
          errors.email = 'Email must be less than 254 characters'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = 'Please enter a valid email address'
        } else if (value.includes('..')) {
          errors.email = 'Email cannot contain consecutive dots'
        } else {
          delete errors.email
        }
        break
        
      case 'password':
        if (!isEditMode && !value.trim()) {
          errors.password = 'Password is required'
        } else if (value.trim() && value.length < 6) {
          errors.password = 'Password must be at least 6 characters'
        } else if (value.trim() && value.length > 128) {
          errors.password = 'Password must be less than 128 characters'
        } else if (value.trim() && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          errors.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        } else if (value.trim() && /[<>'"]/.test(value)) {
          errors.password = 'Password cannot contain <, >, single quotes, or double quotes'
        } else {
          delete errors.password
        }
        break
        
      case 'mobile_number':
        if (value.trim()) {
          const cleanPhone = value.replace(/[\s\-\(\)]/g, '')
          if (cleanPhone.length < 7) {
            errors.mobile_number = 'Phone number is too short'
          } else if (cleanPhone.length > 20) {
            errors.mobile_number = 'Phone number is too long'
          } else if (!/^[\+]?[1-9][\d]{6,19}$/.test(cleanPhone)) {
            errors.mobile_number = 'Please enter a valid phone number'
          } else {
            delete errors.mobile_number
          }
        } else {
          delete errors.mobile_number
        }
        break
        
      case 'address':
        if (value.trim() && value.length > 500) {
          errors.address = 'Address must be less than 500 characters'
        } else if (value.trim() && /[<>]/.test(value)) {
          errors.address = 'Address cannot contain < or > characters'
        } else {
          delete errors.address
        }
        break
        
      case 'branch_id':
        if (formData.role !== 'super_admin' && !value) {
          errors.branch_id = 'Branch is required for this role'
        } else {
          delete errors.branch_id
        }
        break
    }
    
    setValidationErrors(errors)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    onInputChange(e)
    validateField(name, value)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    // Validate all fields
    const fieldsToValidate = ['username', 'email', 'password', 'mobile_number']
    if (formData.role !== 'super_admin') {
      fieldsToValidate.push('branch_id')
    }
    
    fieldsToValidate.forEach(field => {
      validateField(field, formData[field])
    })
    
    // Check if there are any validation errors
    const hasErrors = Object.keys(validationErrors).length > 0
    if (hasErrors) {
      setIsSubmitting(false)
      return
    }
    
    try {
      await onSubmit(e)
    } catch (error) {
      console.error('Form submission error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    const requiredFields = ['username', 'email']
    if (!isEditMode) requiredFields.push('password')
    if (formData.role !== 'super_admin') requiredFields.push('branch_id')
    
    return requiredFields.every(field => {
      const value = formData[field]
      return value && value.trim() && !validationErrors[field]
    }) && Object.keys(validationErrors).length === 0
  }

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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Username *
                    {validationErrors.username ? (
                      <span className="text-red-400 ml-2 text-xs">({validationErrors.username})</span>
                    ) : formData.username && !validationErrors.username ? (
                      <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                    ) : null}
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 bg-[#1A1A1A] border text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                      validationErrors.username 
                        ? 'border-red-400 focus:ring-red-400' 
                        : formData.username && !validationErrors.username 
                        ? 'border-green-400' 
                        : 'border-[#444444]'
                    }`}
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
                    onChange={handleInputChange}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email *
                  {validationErrors.email ? (
                    <span className="text-red-400 ml-2 text-xs">({validationErrors.email})</span>
                  ) : formData.email && !validationErrors.email ? (
                    <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                  ) : null}
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-[#1A1A1A] border text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                    validationErrors.email 
                      ? 'border-red-400 focus:ring-red-400' 
                      : formData.email && !validationErrors.email 
                      ? 'border-green-400' 
                      : 'border-[#444444]'
                  }`}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password {isEditMode ? '(leave blank to keep current)' : '*'}
                  {validationErrors.password ? (
                    <span className="text-red-400 ml-2 text-xs">({validationErrors.password})</span>
                  ) : formData.password && !validationErrors.password ? (
                    <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                  ) : null}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 pr-10 bg-[#1A1A1A] border text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                      validationErrors.password 
                        ? 'border-red-400 focus:ring-red-400' 
                        : formData.password && !validationErrors.password 
                        ? 'border-green-400' 
                        : 'border-[#444444]'
                    }`}
                    placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                    required={!isEditMode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {!isEditMode && (
                  <p className="text-xs text-gray-400 mt-1">
                    Must contain at least 6 characters with uppercase, lowercase, and number
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mobile Number
                  {validationErrors.mobile_number ? (
                    <span className="text-red-400 ml-2 text-xs">({validationErrors.mobile_number})</span>
                  ) : formData.mobile_number && !validationErrors.mobile_number ? (
                    <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                  ) : null}
                </label>
                <input
                  type="tel"
                  name="mobile_number"
                  value={formData.mobile_number}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 bg-[#1A1A1A] border text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                    validationErrors.mobile_number 
                      ? 'border-red-400 focus:ring-red-400' 
                      : formData.mobile_number && !validationErrors.mobile_number 
                      ? 'border-green-400' 
                      : 'border-[#444444]'
                  }`}
                  placeholder="Enter mobile number (e.g., +1234567890)"
                />
              </div>

              {formData.role !== 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Branch *
                    {validationErrors.branch_id ? (
                      <span className="text-red-400 ml-2 text-xs">({validationErrors.branch_id})</span>
                    ) : formData.branch_id && !validationErrors.branch_id ? (
                      <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                    ) : null}
                  </label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 bg-[#1A1A1A] border text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                      validationErrors.branch_id 
                        ? 'border-red-400 focus:ring-red-400' 
                        : formData.branch_id && !validationErrors.branch_id 
                        ? 'border-green-400' 
                        : 'border-[#444444]'
                    }`}
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
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                  {validationErrors.address ? (
                    <span className="text-red-400 ml-2 text-xs">({validationErrors.address})</span>
                  ) : formData.address && !validationErrors.address ? (
                    <CheckCircle className="inline h-4 w-4 text-green-400 ml-2" />
                  ) : null}
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows="2"
                  className={`w-full px-3 py-2 bg-[#1A1A1A] border text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent ${
                    validationErrors.address 
                      ? 'border-red-400 focus:ring-red-400' 
                      : formData.address && !validationErrors.address 
                      ? 'border-green-400' 
                      : 'border-[#444444]'
                  }`}
                  placeholder="Enter address"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {formData.address.length}/500 characters
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isSubmitting || !isFormValid()}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF7A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading || isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{loadingText}</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>{buttonText}</span>
                    </>
                  )}
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