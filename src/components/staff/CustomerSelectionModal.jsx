import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { User, UserPlus, Search, Phone, Mail, QrCode } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'

const CustomerSelectionModal = ({ isOpen, onClose, onCustomerSelected, onScanQR, onAddNewCustomer }) => {
  const { showAlert } = useAppModal()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCustomerType, setSelectedCustomerType] = useState('registered') // 'registered' or 'walkin'
  const [walkInData, setWalkInData] = useState({
    name: 'Walk-in',
    phone: '',
    email: ''
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
      showAlert({ title: 'Missing Name', message: 'Please enter customer name', type: 'error' })
      return
    }
    
    onCustomerSelected({
      type: 'walkin',
      customer: null,
      customer_name: walkInData.name.trim(),
      customer_phone: walkInData.phone.trim() || undefined,
      customer_email: walkInData.email.trim() || undefined
    })
    onClose()
  }

  const resetModal = () => {
    setSearchTerm('')
    setSelectedCustomerType('registered')
    setWalkInData({ name: 'Walk-in', phone: '', email: '' })
  }

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Customer" size="lg" variant="dark">
      <div className="space-y-6">
        {/* Customer Type Selection */}
        <div className="flex space-x-1 bg-[#1A1A1A] rounded-xl p-1 border border-[#444444]/50">
          <button
            onClick={() => setSelectedCustomerType('registered')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              selectedCustomerType === 'registered'
                ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                : 'text-gray-400 hover:text-[var(--color-primary)]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Registered Customer</span>
          </button>
          <button
            onClick={() => setSelectedCustomerType('walkin')}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 ${
              selectedCustomerType === 'walkin'
                ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white shadow-lg'
                : 'text-gray-400 hover:text-[var(--color-primary)]'
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
                  className="w-full pl-10 pr-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                />
              </div>
              <button
                onClick={onScanQR}
                className="px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors border border-blue-500/30 flex items-center space-x-2"
                title="Scan Customer QR"
              >
                <QrCode className="w-4 h-4" />
                <span className="hidden sm:inline">Scan</span>
              </button>
              <button
                onClick={onAddNewCustomer}
                className="px-4 py-3 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors border border-green-500/30 flex items-center space-x-2"
                title="Add New Customer"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New</span>
              </button>
            </div>

            {/* Customer List */}
            <div className="max-h-48 lg:max-h-64 overflow-y-auto space-y-2 custom-scrollbar">
              {filteredCustomers.length === 0 ? (
                <div className="text-center py-6 lg:py-8 text-gray-400">
                  <User className="w-6 h-6 lg:w-8 lg:h-8 mx-auto mb-2 opacity-50 text-gray-500" />
                  <p className="text-gray-400 text-sm lg:text-base">{searchTerm ? 'No customers found' : 'No customers available'}</p>
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full p-3 lg:p-4 bg-[#1A1A1A] border border-[#555555]/30 rounded-lg hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 transition-all duration-200 text-left"
                  >
                    <div className="flex items-center space-x-2 lg:space-x-3">
                      <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-white text-sm lg:text-base truncate">{customer.username}</h4>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-4 text-xs lg:text-sm text-gray-400">
                          <div className="flex items-center space-x-1 truncate">
                            <Mail className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{customer.email}</span>
                          </div>
                          {customer.mobile_number && (
                            <div className="flex items-center space-x-1 truncate">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{customer.mobile_number}</span>
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
          <div className="space-y-3 lg:space-y-4">
            <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg p-3 lg:p-4 border border-blue-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <UserPlus className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                <h3 className="font-semibold text-white text-sm lg:text-base">Walk-in Customer</h3>
              </div>
              <p className="text-xs lg:text-sm text-gray-400">Enter basic information for a walk-in customer who doesn't have an account.</p>
            </div>

            <div className="space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-semibold text-gray-300 mb-1.5 lg:mb-2">Customer Name *</label>
                <input
                  type="text"
                  value={walkInData.name}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Walk-in"
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm lg:text-base focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                  required
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-xs lg:text-sm font-semibold text-gray-300 mb-1.5 lg:mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={walkInData.phone}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone Number"
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm lg:text-base focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-semibold text-gray-300 mb-1.5 lg:mb-2">Email Address (Optional)</label>
                <input
                  type="email"
                  value={walkInData.email}
                  onChange={(e) => setWalkInData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Email Address (for account creation)"
                  className="w-full px-3 lg:px-4 py-2.5 lg:py-3 bg-[#1A1A1A] border border-[#555555] text-white placeholder-gray-400 rounded-lg text-sm lg:text-base focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
                />
              </div>

              {walkInData.email && 
               walkInData.email.trim() !== '' && 
               walkInData.email.includes('@') && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5 lg:p-3">
                  <p className="text-xs text-green-400 font-medium flex items-center">
                    <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
                    <span>Customer account will be created automatically</span>
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={handleWalkInSelect}
              disabled={!walkInData.name.trim()}
              className="w-full py-2.5 lg:py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl text-sm lg:text-base hover:from-[var(--color-accent)] hover:to-[var(--color-accent)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <UserPlus className="w-4 h-4 lg:w-5 lg:h-5" />
              <span>Select Walk-in Customer</span>
            </button>
          </div>
        )}

        {/* Cancel Button */}
        <div className="pt-3 lg:pt-4 border-t border-[#444444]/30">
          <button
            onClick={onClose}
            className="w-full py-2.5 lg:py-3 border border-[#555555] text-gray-300 font-semibold rounded-xl text-sm lg:text-base hover:bg-[#2A2A2A] hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerSelectionModal