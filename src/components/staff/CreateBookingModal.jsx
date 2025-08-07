import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { Calendar, Clock, User, Scissors } from 'lucide-react'

const CreateBookingModal = ({ isOpen, onClose, onSubmit, customers, services, staff }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    serviceId: '',
    staffId: '',
    date: '',
    time: '',
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    const selectedCustomer = customers.find(c => c.id === parseInt(formData.customerId))
    const selectedService = services.find(s => s.id === parseInt(formData.serviceId))
    const selectedStaff = staff.find(s => s.id === parseInt(formData.staffId))

    onSubmit({
      id: Date.now(),
      customer: selectedCustomer?.name || '',
      service: selectedService?.name || '',
      staff: selectedStaff?.name || '',
      date: formData.date,
      time: formData.time,
      price: selectedService?.price || '₱0',
      status: 'pending',
      notes: formData.notes,
      created: new Date().toISOString()
    })
    
    setFormData({
      customerId: '',
      serviceId: '',
      staffId: '',
      date: '',
      time: '',
      notes: ''
    })
    onClose()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const mockCustomers = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Mike Johnson' },
    { id: 4, name: 'Sarah Wilson' }
  ]

  const mockServices = [
    { id: 1, name: 'Premium Haircut', price: '₱1,750', duration: '45 min' },
    { id: 2, name: 'Beard Trim & Style', price: '₱1,250', duration: '30 min' },
    { id: 3, name: 'Classic Cut', price: '₱1,000', duration: '30 min' },
    { id: 4, name: 'Hot Towel Shave', price: '₱1,500', duration: '40 min' }
  ]

  const mockStaff = [
    { id: 1, name: 'Alex Rodriguez' },
    { id: 2, name: 'Mike Chen' },
    { id: 3, name: 'Sarah Johnson' },
    { id: 4, name: 'David Martinez' }
  ]

  const timeSlots = [
    '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
    '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM'
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Booking" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 text-[#FF8C42] mr-2" />
              Customer & Service
            </h3>
            
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.customerId}
                onChange={(e) => handleInputChange('customerId', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="">Select a customer</option>
                {mockCustomers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Service <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => handleInputChange('serviceId', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="">Select a service</option>
                {mockServices.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} - {service.price} ({service.duration})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Staff Member <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.staffId}
                onChange={(e) => handleInputChange('staffId', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="">Select staff member</option>
                {mockStaff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Calendar className="w-5 h-5 text-[#FF8C42] mr-2" />
              Schedule & Notes
            </h3>
            
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Time <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="">Select time</option>
                {timeSlots.map(time => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Notes
              </label>
              <textarea
                placeholder="Any special requests or notes..."
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
            Create Booking
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateBookingModal