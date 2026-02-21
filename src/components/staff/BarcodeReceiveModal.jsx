import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import {
  X, Camera, Keyboard, Upload, Package, CheckCircle,
  AlertCircle, Loader2, ScanLine, RotateCcw,
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const MODES = { MANUAL: 'manual', CAMERA: 'camera', UPLOAD: 'upload' }

const BarcodeReceiveModal = ({ isOpen, onClose, branchId, userId }) => {
  const [mode, setMode] = useState(MODES.MANUAL)
  const [step, setStep] = useState('scan') // 'scan' | 'confirm' | 'success'
  const [scannedSku, setScannedSku] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [scanError, setScanError] = useState('')
  const [lookupSku, setLookupSku] = useState(null)
  const [form, setForm] = useState({ quantity: '', costPerUnit: '', supplier: '', expiryDate: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  const videoRef = useRef(null)
  const qrScannerRef = useRef(null)
  const fileInputRef = useRef(null)

  // Lookup product by scanned SKU — returns { product, pendingOrder } or null
  const scanResult = useQuery(
    api.services.products.getProductBySku,
    lookupSku && branchId ? { sku: lookupSku, branch_id: branchId } : 'skip'
  )
  const product = scanResult?.product ?? null

  const receiveBranchStock = useMutation(api.services.products.receiveBranchStock)

  // Start/stop camera scanner
  useEffect(() => {
    if (!isOpen || mode !== MODES.CAMERA || step !== 'scan') return

    let scanner = null
    const startScanner = async () => {
      if (!videoRef.current) return
      try {
        const QrScanner = (await import('qr-scanner')).default
        scanner = new QrScanner(
          videoRef.current,
          (result) => handleScannedCode(result.data),
          { returnDetailedScanResult: true, highlightScanRegion: true, highlightCodeOutline: true }
        )
        qrScannerRef.current = scanner
        await scanner.start()
      } catch {
        setScanError('Could not access camera. Please allow camera permission and try again.')
      }
    }

    startScanner()
    return () => { scanner?.destroy(); qrScannerRef.current = null }
  }, [isOpen, mode, step])

  // React to product lookup result
  useEffect(() => {
    if (scanResult === undefined || lookupSku === null) return
    if (scanResult === null) {
      setScanError(`No product found with SKU: "${lookupSku}". Make sure the product exists in your branch catalog.`)
      setLookupSku(null)
    } else if (!scanResult.pendingOrder) {
      setScanError(`"${scanResult.product.name}" has no approved or shipped order on record. Only products with a logged order can be received — unauthorized additions are not allowed.`)
      setLookupSku(null)
    } else {
      // Check if this product has already been fully received for this order
      const matchedItem = scanResult.pendingOrder.items.find(
        (item) => item.catalog_product_id === scanResult.product.catalog_product_id
      )
      const totalOrdered = matchedItem
        ? (matchedItem.quantity_approved ?? matchedItem.quantity_requested)
        : 0
      if (totalOrdered > 0 && scanResult.alreadyReceived >= totalOrdered) {
        setScanError(
          `All ${totalOrdered} ordered units of "${scanResult.product.name}" have already been received for order ${scanResult.pendingOrder.order_number}.`
        )
        setLookupSku(null)
      } else {
        setStep('confirm')
        setScanError('')
      }
    }
  }, [scanResult, lookupSku])

  const handleScannedCode = useCallback((code) => {
    if (!code?.trim()) return
    setScanError('')
    setScannedSku(code.trim())
    setLookupSku(code.trim())
    qrScannerRef.current?.stop()
  }, [])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const sku = manualInput.trim()
    if (!sku) return
    setScanError('')
    setScannedSku(sku)
    setLookupSku(sku)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanError('')

    try {
      const jsQR = (await import('jsqr')).default
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bitmap, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        handleScannedCode(code.data)
      } else {
        setScanError('No QR code found in the image. Try a clearer or closer photo.')
      }
    } catch {
      setScanError('Failed to process image. Try a different photo.')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!product || !userId) return
    const qty = parseInt(form.quantity)
    if (!qty || qty <= 0) return
    if (remaining > 0 && qty > remaining) {
      setScanError(`Quantity exceeds remaining amount (${remaining} units left of ${orderedQty} ordered). You cannot receive more than the logged order allows.`)
      return
    }

    setSubmitting(true)
    try {
      const res = await receiveBranchStock({
        product_id: product._id,
        quantity: qty,
        cost_per_unit: form.costPerUnit ? parseFloat(form.costPerUnit) : undefined,
        supplier: form.supplier || undefined,
        expiry_date: form.expiryDate ? new Date(form.expiryDate).getTime() : undefined,
        notes: form.notes || undefined,
        created_by: userId,
        scanned_barcode: scannedSku || undefined,
        order_number: scanResult?.pendingOrder?.order_number,
      })
      setResult(res)
      setStep('success')
    } catch (err) {
      setScanError(err.message || 'Failed to receive stock')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setStep('scan')
    setScannedSku('')
    setManualInput('')
    setScanError('')
    setLookupSku(null)
    setForm({ quantity: '', costPerUnit: '', supplier: '', expiryDate: '', notes: '' })
    setResult(null)
  }

  const handleClose = () => {
    handleReset()
    setMode(MODES.MANUAL)
    onClose()
  }

  const handleModeChange = (newMode) => {
    setMode(newMode)
    setScanError('')
    // Destroy camera scanner when switching away
    if (newMode !== MODES.CAMERA) {
      qrScannerRef.current?.destroy()
      qrScannerRef.current = null
    }
  }

  // Derived: ordered qty, already received, and remaining for this product/order
  const orderedItem = scanResult?.pendingOrder?.items?.find(
    (item) => item.catalog_product_id === product?.catalog_product_id
  )
  const orderedQty = orderedItem
    ? (orderedItem.quantity_approved ?? orderedItem.quantity_requested)
    : 0
  const alreadyReceived = scanResult?.alreadyReceived ?? 0
  const remaining = Math.max(0, orderedQty - alreadyReceived)
  const enteredQty = parseInt(form.quantity) || 0
  const isOverQty = remaining > 0 && enteredQty > remaining

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] shadow-2xl z-10 overflow-hidden max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A] sticky top-0 bg-[#1A1A1A] z-10">
          <div>
            <h2 className="text-lg font-bold text-white">Scan & Receive Stock</h2>
            <p className="text-xs text-gray-400 mt-0.5">Scan a QR code or enter SKU to log received stock</p>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Step: Scan ─── */}
        {step === 'scan' && (
          <div className="p-5 space-y-4">
            {/* Mode Selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: MODES.MANUAL, icon: Keyboard, label: 'Manual' },
                { id: MODES.CAMERA, icon: Camera, label: 'Camera' },
                { id: MODES.UPLOAD, icon: Upload, label: 'Upload' },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleModeChange(id)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-sm font-medium transition-all ${
                    mode === id
                      ? 'bg-[var(--color-primary)]/15 border-[var(--color-primary)] text-[var(--color-primary)]'
                      : 'bg-[#0A0A0A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A] hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* ── Manual Input ── */}
            {mode === MODES.MANUAL && (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Enter SKU / Barcode</label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="e.g. SKU-001 or scan code"
                    autoFocus
                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-600 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!manualInput.trim() || (lookupSku !== null && scanResult === undefined)}
                  className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {lookupSku !== null && scanResult === undefined
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Looking up...</>
                    : 'Look Up Product'
                  }
                </button>
              </form>
            )}

            {/* ── Camera Scanner ── */}
            {mode === MODES.CAMERA && (
              <div className="space-y-3">
                <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                  {/* Corner guides */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative w-48 h-48">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--color-primary)] rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--color-primary)] rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--color-primary)] rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--color-primary)] rounded-br-lg" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 inset-x-0 flex justify-center">
                    <span className="text-xs text-white/80 bg-black/50 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <ScanLine className="h-3 w-3" /> Point at QR code
                    </span>
                  </div>
                </div>
                {lookupSku !== null && scanResult === undefined && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Looking up product...
                  </div>
                )}
                <p className="text-xs text-gray-500 text-center">
                  Works with phone camera and webcam. Allow camera access when prompted.
                </p>
              </div>
            )}

            {/* ── Upload Image ── */}
            {mode === MODES.UPLOAD && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-12 border-2 border-dashed border-[#3A3A3A] rounded-xl flex flex-col items-center gap-3 text-gray-400 hover:border-[var(--color-primary)]/50 hover:text-gray-200 transition-all"
                >
                  <Upload className="h-8 w-8" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload a QR code photo</p>
                    <p className="text-xs text-gray-600 mt-1">Take a photo with your phone, then upload here</p>
                  </div>
                </button>
                {lookupSku !== null && scanResult === undefined && (
                  <div className="flex items-center gap-2 text-gray-400 text-sm justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Looking up product...
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {scanError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{scanError}</p>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Confirm ─── */}
        {step === 'confirm' && product && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Product card */}
            <div className="p-4 bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 rounded-xl flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-primary)]/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{product.name}</p>
                <p className="text-gray-400 text-xs">
                  {product.brand && `${product.brand} · `}SKU: {product.sku || scannedSku}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Current stock: <span className="text-white font-medium">{product.stock} units</span>
                </p>
                {scanResult?.pendingOrder && (
                  <p className="text-xs text-green-400 mt-1">
                    Order: <span className="font-mono">{scanResult.pendingOrder.order_number}</span>
                    {' · '}{scanResult.pendingOrder.status}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 flex items-center justify-between">
                  <span>Quantity Received <span className="text-red-400">*</span></span>
                  {orderedQty > 0 && (
                    <span className="text-gray-500">
                      {alreadyReceived > 0
                        ? <>{alreadyReceived}/{orderedQty} received · <span className={isOverQty ? 'text-red-400 font-semibold' : 'text-yellow-400'}>{remaining} left</span></>
                        : <>Ordered: <span className={isOverQty ? 'text-red-400 font-semibold' : 'text-white'}>{orderedQty}</span></>
                      }
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  min="1"
                  max={remaining || undefined}
                  value={form.quantity}
                  onChange={(e) => setForm(p => ({ ...p, quantity: e.target.value }))}
                  placeholder="0"
                  required
                  autoFocus
                  className={`w-full px-4 py-2.5 bg-[#0A0A0A] border ${isOverQty ? 'border-red-500 focus:ring-red-500' : 'border-[#444444] focus:ring-[var(--color-primary)]'} text-white placeholder-gray-600 rounded-lg focus:ring-2 focus:border-transparent text-sm`}
                />
                {isOverQty && (
                  <p className="text-xs text-red-400 mt-1">
                    Exceeds remaining quantity — max {remaining} units allowed
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Cost / Unit (₱)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPerUnit}
                  onChange={(e) => setForm(p => ({ ...p, costPerUnit: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">Expiry Date</label>
                <input
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Supplier</label>
                <input
                  type="text"
                  value={form.supplier}
                  onChange={(e) => setForm(p => ({ ...p, supplier: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optional"
                  rows={2}
                  className="w-full px-3 py-2.5 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-600 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm resize-none"
                />
              </div>
            </div>

            {scanError && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{scanError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#444444] text-gray-300 rounded-xl text-sm hover:bg-[#2A2A2A] transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Re-scan
              </button>
              <button
                type="submit"
                disabled={!form.quantity || submitting || isOverQty}
                className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : 'Confirm Receipt'
                }
              </button>
            </div>
          </form>
        )}

        {/* ─── Step: Success ─── */}
        {step === 'success' && result && (
          <div className="p-6 text-center space-y-5">
            <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Stock Received!</h3>
              <p className="text-gray-400 text-sm mt-1">Batch created and inventory updated</p>
            </div>
            <div className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] p-4 text-left space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Product</span>
                <span className="text-white font-medium">{product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Batch #</span>
                <span className="text-white font-mono text-xs">{result.batchNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Added</span>
                <span className="text-green-400 font-medium">+{form.quantity} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">New stock total</span>
                <span className="text-white font-medium">{result.newStock} units</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 border border-[#444444] text-gray-300 rounded-xl text-sm hover:bg-[#2A2A2A] transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default BarcodeReceiveModal
