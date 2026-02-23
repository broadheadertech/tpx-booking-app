import React, { useState, useEffect, useRef } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import { Gift, User, QrCode, Mail, CheckCircle, Layers, Download, Printer } from 'lucide-react'
import QRCode from 'qrcode'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'

const CreateVoucherModal = ({ isOpen, onClose, onSubmit, onSendNow }) => {
  const { user } = useCurrentUser()
  const { showAlert } = useAppModal()
  const [mode, setMode] = useState('standard') // 'standard' | 'flier'
  const [formData, setFormData] = useState({
    code: '',
    value: '',
    points_required: '',
    max_uses: '',
    expires_at: '',
    description: '',
    quantity: '10', // For flier mode
    code_prefix: '' // For flier mode — optional name prefix (e.g., "ASD" → "ASD-XXXXXXXX")
  })

  // Convex mutations
  const createVoucherMutation = useMutation(api.services.vouchers.createVoucherWithCode)
  const batchCreateMutation = useMutation(api.services.vouchers.batchCreateVouchers)

  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [createdVoucher, setCreatedVoucher] = useState(null)
  const [batchResult, setBatchResult] = useState(null) // { batchId, vouchers: [{_id, code}] }

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
        showAlert({ title: 'Authentication Required', message: 'You must be logged in to create vouchers', type: 'warning' })
        return
      }

      if (mode === 'flier') {
        // Batch/flier mode — create N unique vouchers
        const batchData = {
          quantity: parseInt(formData.quantity) || 10,
          value: parseFloat(formData.value) || 0,
          points_required: parseInt(formData.points_required) || 0,
          expires_at: new Date(formData.expires_at).getTime(),
          description: formData.description || undefined,
          code_prefix: formData.code_prefix?.trim() || undefined,
          branch_id: user.branch_id,
          created_by: user.id,
        }

        const result = await batchCreateMutation(batchData)

        if (onSubmit) {
          onSubmit(result)
        }

        setBatchResult({
          ...result,
          value: parseFloat(formData.value) || 0,
          expires_at: new Date(formData.expires_at).getTime(),
        })
      } else {
        // Standard mode — single voucher
        const voucherData = {
          code: formData.code,
          value: parseFloat(formData.value) || 0,
          points_required: parseInt(formData.points_required) || 0,
          max_uses: parseInt(formData.max_uses) || 1,
          expires_at: new Date(formData.expires_at).getTime(),
          description: formData.description || undefined,
          branch_id: user.branch_id,
          created_by: user.id
        }

        const response = await createVoucherMutation(voucherData)

        if (onSubmit) {
          onSubmit(response)
        }

        const voucherObj = {
          _id: response,
          code: formData.code,
          value: parseFloat(formData.value) || 0,
          expires_at: new Date(formData.expires_at).getTime(),
          description: formData.description,
          points_required: parseInt(formData.points_required) || 0,
          max_uses: parseInt(formData.max_uses) || 1,
        }

        setCreatedVoucher(voucherObj)
      }
    } catch (error) {
      console.error('Failed to create voucher:', error)
      showAlert({ title: 'Creation Failed', message: 'Failed to create voucher. Please try again.', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }


  const resetForm = () => {
    setCreatedVoucher(null)
    setBatchResult(null)
    setFormData({ code: '', value: '', points_required: '', max_uses: '', expires_at: '', description: '', quantity: '10', code_prefix: '' })
    setQrCodeUrl('')
    setMode('standard')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSendNow = () => {
    if (onSendNow && createdVoucher) {
      onSendNow(createdVoucher)
    }
    resetForm()
  }

  // Generate printable page with all QR codes for flier vouchers
  const handlePrintBatchQR = async () => {
    if (!batchResult?.vouchers) return
    const qrPromises = batchResult.vouchers.map(async (v) => {
      const qrData = JSON.stringify({ code: v.code, value: batchResult.value || 0 })
      const dataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 2, color: { dark: '#1A1A1A', light: '#FFFFFF' } })
      return { code: v.code, qr: dataUrl }
    })
    const qrCodes = await Promise.all(qrPromises)

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      showAlert({ title: 'Popup Blocked', message: 'Please allow popups to print QR codes.', type: 'warning' })
      return
    }
    printWindow.document.write(`
      <html><head><title>Flier Vouchers - QR Codes</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .card { border: 1px solid #ccc; border-radius: 8px; padding: 16px; text-align: center; page-break-inside: avoid; }
        .card img { width: 150px; height: 150px; }
        .code { font-family: monospace; font-size: 16px; font-weight: bold; margin: 8px 0 4px; }
        .value { font-size: 14px; color: #666; }
        @media print { .no-print { display: none; } body { padding: 10px; } }
      </style></head><body>
      <div class="no-print" style="margin-bottom:16px;">
        <button onclick="window.print()" style="padding:8px 20px;font-size:14px;cursor:pointer;">Print All</button>
        <span style="margin-left:12px;color:#666;">${qrCodes.length} voucher QR codes</span>
      </div>
      <div class="grid">
        ${qrCodes.map(q => `
          <div class="card">
            <img src="${q.qr}" alt="${q.code}" />
            <div class="code">${q.code}</div>
            <div class="value">₱${(batchResult.value || 0).toFixed(2)}</div>
          </div>
        `).join('')}
      </div>
      </body></html>
    `)
    printWindow.document.close()
  }

  // Batch success screen
  if (batchResult) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Flier Vouchers Created!" size="lg" compact variant="dark">
        <div className="space-y-4 py-2">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <p className="text-sm text-gray-300 mt-3">
              <span className="text-lg font-bold text-[var(--color-primary)]">{batchResult.vouchers.length}</span> unique vouchers created for flier distribution.
            </p>
          </div>

          {/* Voucher code list */}
          <div className="max-h-48 overflow-y-auto bg-[#1A1A1A] rounded-lg border border-[#333333] p-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {batchResult.vouchers.map((v, i) => (
                <div key={v._id} className="flex items-center gap-1.5 bg-[#222222] rounded px-2 py-1">
                  <span className="text-[10px] text-gray-500">{i + 1}.</span>
                  <span className="text-xs font-mono text-[var(--color-primary)] font-bold">{v.code}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] transition-colors text-sm font-medium"
            >
              Done
            </button>
            <button
              type="button"
              onClick={handlePrintBatchQR}
              className="flex-1 h-9 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print QR Codes
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  // Success screen after creation
  if (createdVoucher) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Voucher Created!" size="sm" compact variant="dark">
        <div className="text-center space-y-4 py-2">
          <div className="w-16 h-16 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <p className="text-lg font-mono font-bold text-[var(--color-primary)]">{createdVoucher.code}</p>
            <p className="text-sm text-gray-400 mt-1">Value: ₱{createdVoucher.value.toFixed(2)}</p>
          </div>
          <p className="text-sm text-gray-300">
            Voucher has been created successfully. Would you like to send it to customers now?
          </p>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 h-9 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] transition-colors text-sm font-medium"
            >
              Done
            </button>
            {onSendNow && (
              <button
                type="button"
                onClick={handleSendNow}
                className="flex-1 h-9 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Send to Customers
              </button>
            )}
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Voucher" size="lg" compact variant="dark">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-[#1A1A1A] rounded-lg border border-[#333333]">
          <button
            type="button"
            onClick={() => setMode('standard')}
            className={`flex-1 h-7 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'standard'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Gift className="w-3 h-3" /> Standard
          </button>
          <button
            type="button"
            onClick={() => setMode('flier')}
            className={`flex-1 h-7 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === 'flier'
                ? 'bg-[var(--color-primary)] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            <Layers className="w-3 h-3" /> Flier (Batch)
          </button>
        </div>

        {mode === 'flier' && (
          <p className="text-[10px] text-gray-500 -mt-2">
            Creates multiple unique vouchers for physical distribution. Each has its own code and QR — first to scan claims it.
          </p>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column - Voucher Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center">
              <Gift className="w-3.5 h-3.5 text-[var(--color-primary)] mr-1.5" />
              Details
            </h3>

            {/* Code — only for standard mode */}
            {mode === 'standard' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Voucher Code *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CODE"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                    required={mode === 'standard'}
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
            )}

            {/* Name prefix — only for flier mode */}
            {mode === 'flier' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. PROMO"
                  value={formData.code_prefix}
                  onChange={(e) => handleInputChange('code_prefix', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 font-mono transition-all"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Codes will be: {formData.code_prefix ? `${formData.code_prefix}-XXXXXXXX` : 'XXXXXXXX'}</p>
              </div>
            )}

            {/* Quantity — only for flier mode */}
            {mode === 'flier' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Quantity *</label>
                <input
                  type="number"
                  placeholder="10"
                  value={formData.quantity}
                  onChange={(e) => handleInputChange('quantity', e.target.value)}
                  required={mode === 'flier'}
                  min="1"
                  max="100"
                  className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Each voucher gets a unique auto-generated code (max 100)</p>
              </div>
            )}

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

            {/* Max Uses — only for standard mode */}
            {mode === 'standard' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Uses *</label>
                <input
                  type="number"
                  placeholder="1"
                  value={formData.max_uses}
                  onChange={(e) => handleInputChange('max_uses', e.target.value)}
                  required={mode === 'standard'}
                  min="1"
                  className="w-full h-8 px-2.5 border border-[#444444] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] bg-[#1A1A1A] text-gray-300 transition-all"
                />
              </div>
            )}

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
                {mode === 'flier' ? (
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-1">
                      <Layers className="w-4 h-4 text-[var(--color-primary)]" />
                      <span className="text-lg font-bold text-[var(--color-primary)]">{formData.quantity || '10'}x</span>
                    </div>
                    <div className="text-sm font-bold text-[var(--color-primary)]">
                      ₱{formData.value || '0'} each
                    </div>
                    <div className="text-xs text-gray-400 space-y-0.5">
                      <div>Each with unique code</div>
                      <div>Single-use per voucher</div>
                      <div>{formData.expires_at ? new Date(formData.expires_at).toLocaleDateString() : 'No date'}</div>
                    </div>
                    <div className="flex justify-center gap-1 pt-1">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-10 h-10 bg-[#2A2A2A] rounded border border-[#444444] flex items-center justify-center">
                          <QrCode className="w-5 h-5 text-gray-500" />
                        </div>
                      ))}
                      <div className="w-10 h-10 flex items-center justify-center text-xs text-gray-500">...</div>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-3 border-t border-[#333333]">
          <button
            type="button"
            onClick={handleClose}
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
            {isLoading ? 'Creating...' : mode === 'flier' ? `Create ${formData.quantity || 10} Vouchers` : 'Create Voucher'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateVoucherModal