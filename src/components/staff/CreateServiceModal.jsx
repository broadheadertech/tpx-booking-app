import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { Scissors, Clock, DollarSign, AlertCircle } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CreateServiceModal = ({ isOpen, onClose, onSubmit, editingService = null, branchId }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    price: '',
    category: 'General',
    is_active: true
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  // Update form data when editingService changes
  useEffect(() => {
    if (editingService) {
      setFormData({
        name: editingService.name || '',
        description: editingService.description || '',
        duration_minutes: editingService.duration_minutes || 30,
        price: editingService.price ? parseFloat(editingService.price).toFixed(2) : '',
        category: editingService.category || 'General',
        is_active: editingService.is_active ?? true
      })
    } else {
      resetForm()
    }
    setError('')
    setFieldErrors({})
  }, [editingService, isOpen])

  // Convex mutations
  const createService = useMutation(api.services.services.createService)
  const updateService = useMutation(api.services.services.updateService)

  const handleInputChange = (field, value) => {
    // Clear field error when user edits
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const validateForm = () => {
    const errors = {}

    // Service name validation
    if (!formData.name.trim()) {
      errors.name = 'Service name is required'
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Service name must be at least 2 characters'
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Service name must be 100 characters or less'
    }

    // Description validation
    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be 500 characters or less'
    }

    // Price validation
    if (!formData.price) {
      errors.price = 'Price is required'
    } else {
      const price = parseFloat(formData.price)
      if (isNaN(price)) {
        errors.price = 'Price must be a valid number'
      } else if (price < 0) {
        errors.price = 'Price cannot be negative'
      } else if (price > 999999.99) {
        errors.price = 'Price cannot exceed 999,999.99'
      }
    }

    // Duration validation
    if (!formData.duration_minutes) {
      errors.duration_minutes = 'Duration is required'
    } else {
      const duration = parseInt(formData.duration_minutes)
      if (isNaN(duration)) {
        errors.duration_minutes = 'Duration must be a valid number'
      } else if (duration < 1) {
        errors.duration_minutes = 'Duration must be at least 1 minute'
      } else if (duration > 480) {
        errors.duration_minutes = 'Duration cannot exceed 480 minutes (8 hours)'
      }
    }

    // Category validation
    const validCategories = ['General', 'Haircut', 'Beard', 'Styling', 'Treatment', 'Package']
    if (!validCategories.includes(formData.category)) {
      errors.category = 'Invalid category selected'
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setError('Please fix the errors below')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Verify branch_id is present
      if (!branchId) {
        setError('Branch information is missing. Please refresh the page.')
        setLoading(false)
        return
      }

      const serviceData = {
        name: formData.name.trim(),
        description: formData.description.trim() || '',
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        category: formData.category,
        is_active: formData.is_active,
        branch_id: branchId
      }

      // Validate numbers one more time before sending
      if (isNaN(serviceData.price) || isNaN(serviceData.duration_minutes)) {
        setError('Invalid price or duration. Please check and try again.')
        setLoading(false)
        return
      }

      if (editingService) {
        await updateService({ id: editingService._id, ...serviceData })
      } else {
        await createService(serviceData)
      }

      // Success - reset and close
      onClose()
      if (onSubmit) {
        onSubmit()
      }
      
    } catch (err) {
      console.error('Error saving service:', err)
      setError(err.message || 'Failed to save service. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: '',
      category: 'General',
      is_active: true
    })
    setError('')
    setFieldErrors({})
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingService ? 'Edit Service' : 'Create Service'} 
      size="lg"
      compact
      variant="dark"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Service Details */}
        <div className="bg-[#0F0F0F]/50 rounded-lg p-3.5 border border-[#333333]/50">
          <h3 className="text-xs font-bold text-gray-200 mb-3 flex items-center">
            <Scissors className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
            Service Details
          </h3>

          <div className="space-y-2.5">
            {/* Service Name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Service Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Classic Haircut"
                maxLength="100"
                className="w-full h-9 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 transition-all"
              />
              {fieldErrors.name && (
                <p className="text-red-400 text-xs mt-0.5">{fieldErrors.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description (Optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the service..."
                maxLength="500"
                rows={2}
                className="w-full px-2.5 py-1.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 resize-none transition-all"
              />
              <div className="text-xs text-gray-500 mt-0.5">{formData.description.length}/500</div>
              {fieldErrors.description && (
                <p className="text-red-400 text-xs mt-0.5">{fieldErrors.description}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full h-9 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 transition-all"
              >
                <option value="General">General</option>
                <option value="Haircut">Haircut</option>
                <option value="Beard">Beard</option>
                <option value="Styling">Styling</option>
                <option value="Treatment">Treatment</option>
                <option value="Package">Package</option>
              </select>
              {fieldErrors.category && (
                <p className="text-red-400 text-xs mt-0.5">{fieldErrors.category}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & Duration */}
        <div className="bg-[#0F0F0F]/50 rounded-lg p-3.5 border border-[#333333]/50">
          <h3 className="text-xs font-bold text-gray-200 mb-3 flex items-center">
            <DollarSign className="w-3.5 h-3.5 text-[#FF8C42] mr-1.5" />
            Pricing & Duration
          </h3>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Price */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Price (₱) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                max="999999.99"
                className="w-full h-9 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 transition-all"
              />
              {fieldErrors.price && (
                <p className="text-red-400 text-xs mt-0.5">{fieldErrors.price}</p>
              )}
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Duration (min) *</label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                placeholder="30"
                min="1"
                max="480"
                className="w-full h-9 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#FF8C42] bg-[#1A1A1A] text-gray-300 transition-all"
              />
              {fieldErrors.duration_minutes && (
                <p className="text-red-400 text-xs mt-0.5">{fieldErrors.duration_minutes}</p>
              )}
            </div>
          </div>
        </div>

        {/* Status & Preview */}
        <div className="grid grid-cols-2 gap-3">
          {/* Status */}
          <div className="bg-[#0F0F0F]/50 rounded-lg p-3 border border-[#333333]/50">
            <label className="block text-xs text-gray-400 mb-2.5">Status</label>
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="is_active"
                  checked={formData.is_active === true}
                  onChange={() => handleInputChange('is_active', true)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-gray-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="is_active"
                  checked={formData.is_active === false}
                  onChange={() => handleInputChange('is_active', false)}
                  className="w-3.5 h-3.5"
                />
                <span className="text-gray-300">Inactive</span>
              </label>
            </div>
          </div>

          {/* Service Preview */}
          <div className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] rounded-lg p-3 border border-[#FF8C42]/20">
            <h4 className="text-xs font-bold text-white mb-1.5 uppercase tracking-wide">Preview</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Price:</span>
                <span className="text-[#FF8C42] font-bold">₱{formData.price || '0.00'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Duration:</span>
                <span className="text-gray-300 font-bold">{formData.duration_minutes || 30}m</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Status:</span>
                <span className={`font-bold ${formData.is_active ? 'text-green-400' : 'text-red-400'}`}>
                  {formData.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg font-medium hover:bg-[#333333] transition-colors text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 h-9 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50 transition-all text-sm"
          >
            {loading ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateServiceModal