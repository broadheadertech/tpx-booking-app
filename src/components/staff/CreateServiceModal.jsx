import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Scissors, Clock, DollarSign } from 'lucide-react'
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

  // Update form data when editingService changes
  useEffect(() => {
    if (editingService) {
      setFormData({
        name: editingService.name || '',
        description: editingService.description || '',
        duration_minutes: editingService.duration_minutes || 30,
        price: editingService.price || '',
        category: editingService.category || 'General',
        is_active: editingService.is_active ?? true
      })
    } else {
      setFormData({
        name: '',
        description: '',
        duration_minutes: 30,
        price: '',
        category: 'General',
        is_active: true
      })
    }
  }, [editingService])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Convex mutations
  const createService = useMutation(api.services.services.createService)
  const updateService = useMutation(api.services.services.updateService)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.price) {
      setError('Name and price are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const serviceData = {
        ...formData,
        price: parseFloat(formData.price),
        duration_minutes: parseInt(formData.duration_minutes),
        branch_id: branchId // Add branch_id to service data
      }

      if (editingService) {
        await updateService({ id: editingService._id, ...serviceData })
      } else {
        await createService(serviceData)
      }

      // Call parent success handler
      if (onSubmit) {
        onSubmit()
      }
      
      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        duration_minutes: 30,
        price: '',
        category: 'General',
        is_active: true
      })
      onClose()
    } catch (err) {
      console.error('Error saving service:', err)
      setError(err.message || 'Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      price: '',
      category: 'General',
      is_active: true
    })
    setError('')
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingService ? 'Edit Service' : 'Create New Service'} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Scissors className="w-5 h-5 mr-2 text-[#FF8C42]" />
              Service Details
            </h3>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Service Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter service name"
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the service"
                rows={3}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="General">General</option>
                <option value="Haircut">Haircut</option>
                <option value="Beard">Beard</option>
                <option value="Styling">Styling</option>
                <option value="Treatment">Treatment</option>
                <option value="Package">Package</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <DollarSign className="w-5 h-5 mr-2 text-[#FF8C42]" />
              Pricing & Duration
            </h3>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Price <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#6B6B6B] font-bold text-base">₱</span>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  className="w-full h-12 pl-8 pr-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Duration (minutes)
              </label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => handleInputChange('duration_minutes', e.target.value)}
                  placeholder="30"
                  min="1"
                  className="w-full h-12 pl-12 pr-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Status
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === true}
                    onChange={() => handleInputChange('is_active', true)}
                    className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] border-gray-300"
                  />
                  <span className="ml-2 text-[#1A1A1A] font-medium">Active</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="is_active"
                    checked={formData.is_active === false}
                    onChange={() => handleInputChange('is_active', false)}
                    className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] border-gray-300"
                  />
                  <span className="ml-2 text-[#1A1A1A] font-medium">Inactive</span>
                </label>
              </div>
            </div>

            {/* Service Preview */}
            <div className="bg-gradient-to-br from-[#FF8C42]/5 to-[#FF7A2B]/5 border-2 border-[#FF8C42]/20 rounded-xl p-4">
              <h4 className="text-[#1A1A1A] font-bold text-sm mb-2 uppercase tracking-wide">Service Preview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Name:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.name || 'Service Name'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Price:</span>
                  <span className="text-[#FF8C42] font-bold text-sm">₱{formData.price || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Duration:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.duration_minutes || 30} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Category:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.category}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-6 border-t border-[#F5F5F5]">
          <Button
            type="button"
            onClick={handleClose}
            className="flex-1 bg-[#F5F5F5] text-[#6B6B6B] hover:bg-[#E0E0E0] border-2 border-[#F5F5F5]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateServiceModal