import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Truck,
  Store,
  DollarSign,
  Gift,
  ShoppingBag,
  Clock,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

/**
 * ShopConfigPanel - Super Admin shop configuration
 *
 * Manages:
 * - Delivery fee
 * - Free delivery threshold
 * - Minimum order amount
 * - Enable/disable delivery & pickup
 */
function ShopConfigPanel() {
  const config = useQuery(api.services.shopConfig.getShopConfigAdmin)
  const saveConfig = useMutation(api.services.shopConfig.saveShopConfig)

  const [formData, setFormData] = useState({
    delivery_fee: 50,
    free_delivery_threshold: 0,
    min_order_amount: 0,
    enable_delivery: true,
    enable_pickup: true,
    estimated_delivery_days: 3,
  })

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null) // 'success' | 'error' | null

  // Load config when available
  useEffect(() => {
    if (config) {
      setFormData({
        delivery_fee: config.delivery_fee,
        free_delivery_threshold: config.free_delivery_threshold,
        min_order_amount: config.min_order_amount,
        enable_delivery: config.enable_delivery,
        enable_pickup: config.enable_pickup,
        estimated_delivery_days: config.estimated_delivery_days,
      })
    }
  }, [config])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus(null)

    try {
      await saveConfig({
        delivery_fee: formData.delivery_fee,
        free_delivery_threshold: formData.free_delivery_threshold,
        min_order_amount: formData.min_order_amount,
        enable_delivery: formData.enable_delivery,
        enable_pickup: formData.enable_pickup,
        estimated_delivery_days: formData.estimated_delivery_days,
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus(null), 3000)
    } catch (error) {
      console.error('Failed to save shop config:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  if (config === undefined) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#2A2A2A] rounded w-1/3" />
        <div className="h-32 bg-[#2A2A2A] rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Shop Configuration</h2>
            <p className="text-sm text-gray-400">Configure delivery fees and order settings</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
            saveStatus === 'success'
              ? 'bg-green-500 text-white'
              : saveStatus === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-[var(--color-primary)] text-white hover:opacity-90'
          } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {saveStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved!
            </>
          ) : saveStatus === 'error' ? (
            <>
              <AlertCircle className="w-5 h-5" />
              Error
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </>
          )}
        </button>
      </div>

      {/* Config not set notice */}
      {!config && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">Shop not configured</p>
            <p className="text-sm text-amber-400/70">Default values are being used. Save to create configuration.</p>
          </div>
        </div>
      )}

      {/* Configuration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Fee */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Delivery Fee</h3>
              <p className="text-xs text-gray-500">Flat rate charged for delivery orders</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
            <input
              type="number"
              value={formData.delivery_fee}
              onChange={(e) => setFormData({ ...formData, delivery_fee: Number(e.target.value) })}
              min="0"
              className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Free Delivery Threshold */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Free Delivery Threshold</h3>
              <p className="text-xs text-gray-500">Min order for free delivery (0 = disabled)</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
            <input
              type="number"
              value={formData.free_delivery_threshold}
              onChange={(e) => setFormData({ ...formData, free_delivery_threshold: Number(e.target.value) })}
              min="0"
              className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
          {formData.free_delivery_threshold > 0 && (
            <p className="text-xs text-green-400 mt-2">
              Orders ₱{formData.free_delivery_threshold}+ get free delivery
            </p>
          )}
        </div>

        {/* Minimum Order Amount */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Minimum Order Amount</h3>
              <p className="text-xs text-gray-500">Min amount to place order (0 = no minimum)</p>
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
            <input
              type="number"
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
              min="0"
              className="w-full pl-10 pr-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold focus:border-[var(--color-primary)] focus:outline-none"
            />
          </div>
        </div>

        {/* Estimated Delivery Days */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Estimated Delivery</h3>
              <p className="text-xs text-gray-500">Default delivery timeframe in days</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="number"
              value={formData.estimated_delivery_days}
              onChange={(e) => setFormData({ ...formData, estimated_delivery_days: Number(e.target.value) })}
              min="1"
              max="30"
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl text-white text-lg font-bold focus:border-[var(--color-primary)] focus:outline-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">days</span>
          </div>
        </div>
      </div>

      {/* Fulfillment Toggles */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
        <h3 className="font-semibold text-white mb-4">Fulfillment Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Enable Delivery */}
          <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.enable_delivery ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                <Truck className={`w-5 h-5 ${formData.enable_delivery ? 'text-green-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-medium text-white">Delivery</p>
                <p className="text-xs text-gray-500">Allow delivery orders</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enable_delivery: !formData.enable_delivery })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.enable_delivery ? 'bg-green-500' : 'bg-[#3A3A3A]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.enable_delivery ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Enable Pickup */}
          <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${formData.enable_pickup ? 'bg-blue-500/20' : 'bg-gray-500/20'}`}>
                <Store className={`w-5 h-5 ${formData.enable_pickup ? 'text-blue-400' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-medium text-white">Pickup</p>
                <p className="text-xs text-gray-500">Allow in-store pickup</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, enable_pickup: !formData.enable_pickup })}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                formData.enable_pickup ? 'bg-green-500' : 'bg-[#3A3A3A]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.enable_pickup ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Warning if both disabled */}
        {!formData.enable_delivery && !formData.enable_pickup && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-sm text-red-400">At least one fulfillment option must be enabled</p>
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#2A2A2A]">
        <h3 className="font-semibold text-white mb-4">Customer Preview</h3>
        <div className="bg-[#0A0A0A] rounded-xl p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">₱500.00</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delivery Fee</span>
            {formData.free_delivery_threshold > 0 && 500 >= formData.free_delivery_threshold ? (
              <span className="text-green-400">FREE</span>
            ) : (
              <span className="text-white">₱{formData.delivery_fee.toLocaleString()}</span>
            )}
          </div>
          <div className="border-t border-[#2A2A2A] pt-2 flex justify-between">
            <span className="text-white font-semibold">Total</span>
            <span className="text-green-400 font-bold">
              ₱{(500 + (formData.free_delivery_threshold > 0 && 500 >= formData.free_delivery_threshold ? 0 : formData.delivery_fee)).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShopConfigPanel
