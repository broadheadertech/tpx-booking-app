import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { User, UserPlus, Search, Phone, Mail, QrCode } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CustomerSelectionModal = ({ isOpen, onClose, onCustomerSelected, onScanQR, onAddNewCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerType, setSelectedCustomerType] = useState('registered') // 'registered' or 'walkin'
  const [walkInData, setWalkInData] = useState({
    name: '',
    phone: ''
  })

  // Get all customers
  const customers = useQuery(api.services.auth.getAllUsers)
  const customerUsers = customers?.filter(customer => customer.role === 'customer') || []

  // Filter customers based on search term
  const filteredCustomers = customerUsers.filter(customer => 
    customer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.mobile_number && customer.mobile_number.includes(searchTerm))
  )

  const handleCustomerSelect = (customer) => {
    onCustomerSelected({
      type: 'registered',
      customer: customer,
      customer_name: customer.username,
      customer_phone: customer.mobile_number
    })
    onClose()
  }

  const handleWalkInSelect = () => {
    if (!walkInData.name.trim()) {
      alert('Please enter customer name')
      return
    }
    
    onCustomerSelected({
      type: 'walkin',
      customer: null,
      customer_name: walkInData.name.trim(),
      customer_phone: walkInData.phone.trim()
    })
    onClose()
  }

  const resetModal = () => {
    setSearchTerm('')
    setSelectedCustomerType('registered')
    setWalkInData({ name: '', phone: '' })
  }

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Customer" size="lg">
      <div className="space-y-6">
        {/* Customer Type Selection */}
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setSelectedCustomerType('registered')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              selectedCustomerType === 'registered'
                ? 'bg-[#FF8C42] text-white shadow-lg'
                : 'text-gray-600 hover:text-[#FF8C42]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Registered Customer</span>
          </button>
          <button
            onClick={() => setSelectedCustomerType('walkin')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              selectedCustomerType === 'walkin'
                ? 'bg-[#FF8C42] text-white shadow-lg'
                : 'text-gray-600 hover:text-[#FF8C42]'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Walk-in Customer</span>
          </button>
        </div>

        {/* Registered Customer Section */}
        {selectedCustomerType === 'registered' && (
          <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search customers by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              </div>
              <button
                onClick={onScanQR}
                className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
                title="Scan Customer QR"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Scan</span>
              </button>
              <button
                onClick={onAddNewCustomer}
                className="px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                title="Add New Customer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span>
              </button>
            </div>

            {/* Customer List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{searchTerm ? 'No customers found' : 'No customers available'}</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full p-4 border border-gray-200 rounded-lg hover:border-[#FF8C42] hover:bg-[#FF8C42]/5 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#FF8C42] rounded-lg flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{customer.username}</h4>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-3 h-3" />
                            <span>{customer.email}</span>
                          </div>
                          {customer.mobile_number && (
                            <div className="flex items-center space-x-1">
                              <Phone className="w-3 h-3" />
                              <span>{customer.mobile_number}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Walk-in Customer Section */}
        {selectedCustomerType === 'walkin' && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-blue-800">Walk-in Customer</h3>
              </div>
              <p className="text-sm text-blue-700">Enter basic information for a walk-in customer who doesn't have an account.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Customer Name *</label>
                <input
                  type="text"
                  value={walkInData.name}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter customer name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={walkInData.phone}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                />
              </div>
            </div>

            <button
              onClick={handleWalkInSelect}
              disabled={!walkInData.name.trim()}
              className="w-full py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-bold rounded-xl hover:from-[#FF7A2B] hover:to-[#E67E37] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-5 h-5" />
              <span>Select Walk-in Customer</span>
            </button>
          </div>
        )}

        {/* Cancel Button */}
        <div className="pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerSelectionModal