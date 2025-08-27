import React, { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Gift, User, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const CreateVoucherModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    points_required: '',
    max_uses: '',
    expires_at: '',
    description: ''
  })

  // Convex mutation
  const createVoucherMutation = useMutation(api.services.vouchers.createVoucherWithCode)
  
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setFormData(prev => ({ ...prev, code }))
    generateQRCode(code)
  }

  const generateQRCode = async (code) => {
    if (!code) return
    try {
      const qrData = {
        username: "", // Will be filled when voucher is assigned to a user
        code: code,
        value: formData.value || "0"
      }
      
      const url = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 2,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF'
        }
      })
      setQrCodeUrl(url)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

  useEffect(() => {
    if (formData.code) {
      generateQRCode(formData.code)
    }
  }, [formData.code, formData.value])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      if (!user?.id) {
        alert('You must be logged in to create vouchers')
        return
      }

      const voucherData = {
        code: formData.code,
        value: parseFloat(formData.value) || 0,
        points_required: parseInt(formData.points_required) || 0,
        max_uses: parseInt(formData.max_uses) || 1,
        expires_at: new Date(formData.expires_at).getTime(),
        description: formData.description || undefined,
        created_by: user.id
      }

      const response = await createVoucherMutation(voucherData)

      onSubmit(response)
      
      // Reset form
      setFormData({
        code: '',
        value: '',
        points_required: '',
        max_uses: '',
        expires_at: '',
        description: ''
      })
      setQrCodeUrl('')
      onClose()
    } catch (error) {
      console.error('Failed to create voucher:', error)
      alert('Failed to create voucher. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
                Points Required <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="100"
                value={formData.points_required}
                onChange={(e) => handleInputChange('points_required', e.target.value)}
                required
                min="0"
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Max Uses <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="1"
                value={formData.max_uses}
                onChange={(e) => handleInputChange('max_uses', e.target.value)}
                required
                min="1"
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Value <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="50.00"
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', e.target.value)}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full h-12 px-4 pr-12 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#6B6B6B] font-bold">
                  ₱
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[#1A1A1A] font-bold text-base mb-2">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => handleInputChange('expires_at', e.target.value)}
                required
                className="w-full h-12 px-4 border-2 border-[#F5F5F5] rounded-xl text-base focus:outline-none focus:border-[#FF8C42] transition-colors duration-200"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 text-[#FF8C42] mr-2" />
              Description
            </h3>

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
              <h4 className="text-base font-bold text-[#1A1A1A] mb-2 flex items-center">
                <QrCode className="w-4 h-4 mr-2" />
                Voucher Preview
              </h4>
              <div className="bg-white rounded-xl p-4 border border-[#FF8C42]/30">
                <div className="text-center">
                  <div className="text-lg font-black text-[#1A1A1A] font-mono mb-2">
                    {formData.code || 'VOUCHER-CODE'}
                  </div>
                  <div className="text-2xl font-black text-[#FF8C42] my-2">
                    ₱{formData.value || '0'} OFF
                  </div>
                  <div className="text-sm text-[#6B6B6B] mb-2">
                    Points Required: {formData.points_required || '0'}
                  </div>
                  <div className="text-sm text-[#6B6B6B] mb-2">
                    Max Uses: {formData.max_uses || '1'}
                  </div>
                  <div className="text-sm text-[#6B6B6B] mb-3">
                    Expires: {formData.expires_at ? new Date(formData.expires_at).toLocaleDateString() : 'Not Set'}
                  </div>
                  {qrCodeUrl && (
                    <div className="flex justify-center">
                      <img src={qrCodeUrl} alt="Voucher QR Code" className="w-24 h-24" />
                    </div>
                  )}
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
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Creating...' : 'Create Voucher'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateVoucherModal