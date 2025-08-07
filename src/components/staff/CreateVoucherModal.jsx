import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { Gift, DollarSign, Calendar, User } from 'lucide-react'

const CreateVoucherModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    customerEmail: '',
    expiryDate: '',
    description: '',
    type: 'discount'
  })

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, code }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      id: Date.now(),
      code: formData.code,
      value: formData.type === 'fixed' ? `₱${formData.value}` : `${formData.value}%`,
      customer: formData.customerEmail,
      status: 'active',
      expires: formData.expiryDate,
      created: new Date().toISOString().split('T')[0],
      type: formData.type,
      description: formData.description
    })
    
    setFormData({
      code: '',
      value: '',
      customerEmail: '',
      expiryDate: '',
      description: '',
      type: 'discount'
    })
    onClose()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Voucher" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Gift className="w-5 h-5 text-[#FF8C42] mr-2" />
              Voucher Details
            </h3>
            
            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Voucher Code <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Enter voucher code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  required
                  className="flex-1 h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 font-mono"
                />
                <Button
                  type="button"
                  onClick={generateVoucherCode}
                  className="px-6 bg-[#6B6B6B] hover:bg-[#4A4A4A] text-white rounded-xl"
                >
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Voucher Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              >
                <option value="discount">Percentage Discount</option>
                <option value="fixed">Fixed Amount</option>
              </select>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder={formData.type === 'fixed' ? "1000" : "20"}
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  required
                  min="1"
                  max={formData.type === 'discount' ? "100" : "50000"}
                  className="w-full h-12 px-4 pr-12 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6B6B6B] font-bold">
                  {formData.type === 'fixed' ? '₱' : '%'}
                </div>
              </div>
            </div>

            <Input
              label="Expiry Date"
              type="date"
              value={formData.expiryDate}
              onChange={(e) => handleInputChange('expiryDate', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 text-[#FF8C42] mr-2" />
              Customer & Description
            </h3>
            
            <Input
              label="Customer Email (Optional)"
              type="email"
              placeholder="customer@example.com"
              value={formData.customerEmail}
              onChange={(e) => handleInputChange('customerEmail', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
            />

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Description
              </label>
              <textarea
                placeholder="Describe what this voucher is for..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200 resize-none"
              />
            </div>

            <div className="bg-[#FF8C42]/10 border-2 border-[#FF8C42]/20 rounded-2xl p-4">
              <h4 className="text-base font-bold text-[#1A1A1A] mb-2">Voucher Preview</h4>
              <div className="bg-white rounded-xl p-4 border border-[#FF8C42]/30">
                <div className="text-center">
                  <div className="text-lg font-black text-[#1A1A1A] font-mono">
                    {formData.code || 'VOUCHER-CODE'}
                  </div>
                  <div className="text-2xl font-black text-[#FF8C42] my-2">
                    {formData.type === 'fixed' ? '₱' : ''}{formData.value || '0'}{formData.type === 'discount' ? '%' : ''} OFF
                  </div>
                  <div className="text-sm text-[#6B6B6B]">
                    Expires: {formData.expiryDate || 'MM/DD/YYYY'}
                  </div>
                </div>
              </div>
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
            Create Voucher
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateVoucherModal