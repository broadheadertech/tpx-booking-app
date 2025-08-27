import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { User, Mail, Phone, Scissors } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CreateBarberModal = ({ isOpen, onClose, onSubmit, editingBarber = null }) => {
  const [formData, setFormData] = useState({
    full_name: editingBarber?.full_name || '',
    email: editingBarber?.email || '',
    phone: editingBarber?.phone || '',
    is_active: editingBarber?.is_active ?? true,
    services: editingBarber?.services || [],
    experience: editingBarber?.experience || '0 years',
    specialties: editingBarber?.specialties || []
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Convex queries and mutations
  const services = useQuery(api.services.services.getAllServices)
  const createBarber = useMutation(api.services.barbers.createBarber)
  const updateBarber = useMutation(api.services.barbers.updateBarber)

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.full_name.trim() || !formData.email.trim()) {
      setError('Full name and email are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const barberData = {
        user: '1', // For now, using a default user ID - this should be the authenticated user
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || '',
        is_active: formData.is_active,
        services: formData.services,
        experience: formData.experience || '0 years',
        specialties: formData.specialties,
        avatar: ''
      }

      if (editingBarber) {
        await updateBarber({ id: editingBarber._id, ...barberData })
      } else {
        await createBarber(barberData)
      }

      // Call parent success handler
      if (onSubmit) {
        onSubmit()
      }
      
      // Reset form and close modal
      setFormData({
        full_name: '',
        email: '',
        phone: '',
        is_active: true,
        services: [],
        experience: '0 years',
        specialties: []
      })
      onClose()
    } catch (err) {
      console.error('Error saving barber:', err)
      setError(err.message || 'Failed to save barber')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      is_active: true,
      services: [],
      experience: '0 years',
      specialties: []
    })
    setError('')
    onClose()
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={editingBarber ? 'Edit Barber' : 'Create New Barber'} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {!services && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#FF8C42]"></div>
            <span className="ml-2 text-gray-600">Loading services...</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 mr-2 text-[#FF8C42]" />
              Personal Information
            </h3>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange('full_name', e.target.value)}
                placeholder="Enter barber's full name"
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="barber@example.com"
                  required
                  className="w-full h-12 pl-12 pr-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full h-12 pl-12 pr-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Experience
              </label>
              <input
                type="text"
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                placeholder="e.g., 5 years"
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
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
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Scissors className="w-5 h-5 mr-2 text-[#FF8C42]" />
              Services & Skills
            </h3>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Services Offered
              </label>
              <div className="max-h-32 overflow-y-auto border-2 border-[#F5F5F5] rounded-xl p-3">
                {!services ? (
                  <p className="text-sm text-gray-500 p-2">Loading services...</p>
                ) : services.length > 0 ? (
                  services.map(service => (
                    <label key={service._id} className="flex items-center py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.services.includes(service._id)}
                        onChange={(e) => {
                          const serviceId = service._id
                          setFormData(prev => ({
                            ...prev,
                            services: e.target.checked 
                              ? [...prev.services, serviceId]
                              : prev.services.filter(id => id !== serviceId)
                          }))
                        }}
                        className="h-4 w-4 text-[#FF8C42] focus:ring-[#FF8C42] rounded border-gray-300"
                      />
                      <span className="ml-2 text-sm text-[#1A1A1A]">
                        {service.name} - ₱{parseFloat(service.price).toFixed(2)}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 p-2">No services available</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Specialties (comma-separated)
              </label>
              <textarea
                value={formData.specialties.join(', ')}
                onChange={(e) => {
                  const specialties = e.target.value.split(',').map(s => s.trim()).filter(s => s)
                  handleInputChange('specialties', specialties)
                }}
                placeholder="e.g., Fade cuts, Beard styling, Hair coloring"
                rows={3}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>

            {/* Barber Preview */}
            <div className="bg-gradient-to-br from-[#FF8C42]/5 to-[#FF7A2B]/5 border-2 border-[#FF8C42]/20 rounded-xl p-4">
              <h4 className="text-[#1A1A1A] font-bold text-sm mb-2 uppercase tracking-wide">Barber Preview</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Name:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.full_name || 'Barber Name'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Email:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.email || 'email@example.com'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Experience:</span>
                  <span className="text-[#1A1A1A] font-bold text-sm">{formData.experience}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Services:</span>
                  <span className="text-[#FF8C42] font-bold text-sm">{formData.services.length} selected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#6B6B6B] text-sm">Status:</span>
                  <span className={`font-bold text-sm ${
                    formData.is_active ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
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
            disabled={loading || !services}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : (editingBarber ? 'Update Barber' : 'Create Barber')}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateBarberModal