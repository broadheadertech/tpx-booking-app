import React, { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Gift, User, QrCode } from 'lucide-react'
import QRCode from 'qrcode'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

const CreateVoucherModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useCurrentUser()
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
        branch_id: user.branch_id, // Add branch_id for branch-scoped vouchers
        created_by: user.id
      }

      const response = await createVoucherMutation(voucherData)

      // Call parent callback but don't require it for the modal to close
      if (onSubmit) {
        onSubmit(response)
      }

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

      // Close modal without page refresh
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
    <Modal isOpen={isOpen} onClose={onClose} title="Create Voucher" size="lg" compact variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Voucher Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center">
              <Gift className="w-3.5 h-3.5 text-[var(--color-primary)] mr-1.5" />
              Details
            </h3>

            {/* Code */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Voucher Code *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="CODE"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  required
                  className="flex-1 h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 font-mono transition-all"
                />
                <button
                  type="button"
                  onClick={generateVoucherCode}
                  className="px-3 h-8 bg-[#2A2A2A] hover:bg-[#333333] text-gray-300 rounded-lg text-xs font-medium transition-colors"
                >
                  Gen
                </button>
              </div>
            </div>

            {/* Points Required */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Points Required *</label>
              <input
                type="number"
                placeholder="100"
                value={formData.points_required}
                onChange={(e) => handleInputChange('points_required', e.target.value)}
                required
                min="0"
                className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
              />
            </div>

            {/* Max Uses */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Uses *</label>
              <input
                type="number"
                placeholder="1"
                value={formData.max_uses}
                onChange={(e) => handleInputChange('max_uses', e.target.value)}
                required
                min="1"
                className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
              />
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Value (₱) *</label>
              <input
                type="number"
                placeholder="50.00"
                value={formData.value}
                onChange={(e) => handleInputChange('value', e.target.value)}
                required
                min="0.01"
                step="0.01"
                className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Expiry Date *</label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => handleInputChange('expires_at', e.target.value)}
                required
                className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
              />
            </div>
          </div>

          {/* Right Column - Description & Preview */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center">
              <User className="w-3.5 h-3.5 text-[var(--color-primary)] mr-1.5" />
              Info & Preview
            </h3>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description (Optional)</label>
              <textarea
                placeholder="What is this voucher for?"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 resize-none transition-all"
              />
            </div>

            {/* QR Preview */}
            <div className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] border border-[var(--color-primary)]/20 rounded-lg p-2.5">
              <h4 className="text-xs font-bold text-white mb-2 flex items-center">
                <QrCode className="w-3 h-3 mr-1.5" />
                Preview
              </h4>
              <div className="bg-[#0F0F0F]/50 rounded-lg p-2.5 border border-[#333333]/50">
                <div className="text-center space-y-1">
                  <div className="text-xs font-mono text-[var(--color-primary)] font-bold">
                    {formData.code || 'CODE'}
                  </div>
                  <div className="text-sm font-bold text-[var(--color-primary)]">
                    ₱{formData.value || '0'}
                  </div>
                  <div className="text-xs text-gray-400 space-y-0.5">
                    <div>Pts: {formData.points_required || '0'}</div>
                    <div>Max: {formData.max_uses || '1'}</div>
                    <div>{formData.expires_at ? new Date(formData.expires_at).toLocaleDateString() : 'No date'}</div>
                  </div>
                  {qrCodeUrl && (
                    <div className="flex justify-center pt-1.5">
                      <img src={qrCodeUrl} alt="Voucher QR" className="w-16 h-16" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] transition-colors text-sm font-medium disabled:opacity-50"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 h-9 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition-all text-sm font-medium"
          >
            {isLoading ? 'Creating...' : 'Create Voucher'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateVoucherModal