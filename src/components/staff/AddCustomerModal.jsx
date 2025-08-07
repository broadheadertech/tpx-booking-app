import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { User, Mail, Phone, MapPin } from 'lucide-react'

const AddCustomerModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthdate: '',
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      id: Date.now(),
      points: 0,
      visits: 0,
      status: 'new',
      lastVisit: null,
      created: new Date().toISOString().split('T')[0]
    })
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      birthdate: '',
      notes: ''
    })
    onClose()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 text-[#FF8C42] mr-2" />
              Personal Information
            </h3>
            <Input
              label="Full Name"
              placeholder="Enter customer's full name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Phone Number"
              type="tel"
              placeholder="+63 912 345 6789"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
            <Input
              label="Birth Date"
              type="date"
              value={formData.birthdate}
              onChange={(e) => handleInputChange('birthdate', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <MapPin className="w-5 h-5 text-[#FF8C42] mr-2" />
              Additional Details
            </h3>
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Address
              </label>
              <textarea
                placeholder="Enter customer's address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Notes
              </label>
              <textarea
                placeholder="Any special notes or preferences..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-6 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg"
          >
            Add Customer
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCustomerModal