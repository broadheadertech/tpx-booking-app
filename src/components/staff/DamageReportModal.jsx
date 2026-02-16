import { useState } from 'react'
import {
  X,
  AlertTriangle,
  Plus,
  Minus,
  Camera,
  RefreshCw,
  Package,
} from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'

const DAMAGE_REASONS = [
  { value: 'packaging', label: 'Packaging Damage' },
  { value: 'defect', label: 'Product Defect' },
  { value: 'shipping', label: 'Shipping Damage' },
  { value: 'expired', label: 'Expired/Spoiled' },
  { value: 'wrong_item', label: 'Wrong Item Sent' },
  { value: 'other', label: 'Other' },
]

const DamageReportModal = ({ order, userId, onClose }) => {
  const { showAlert } = useAppModal()
  const submitClaim = useMutation(api.services.damageClaims.submitDamageClaim)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [description, setDescription] = useState('')
  const [damagedItems, setDamagedItems] = useState([])

  // Add an item to the damage report
  const addDamagedItem = (orderItem) => {
    const existing = damagedItems.find(
      (d) => d.catalog_product_id === orderItem.catalog_product_id
    )
    if (existing) return // Already added

    setDamagedItems([
      ...damagedItems,
      {
        catalog_product_id: orderItem.catalog_product_id,
        product_name: orderItem.product_name,
        max_quantity: orderItem.quantity_approved ?? orderItem.quantity_requested,
        unit_price: orderItem.unit_price,
        quantity_damaged: 1,
        damage_reason: 'shipping',
        reason_note: '',
      },
    ])
  }

  const removeDamagedItem = (catalogProductId) => {
    setDamagedItems(damagedItems.filter((d) => d.catalog_product_id !== catalogProductId))
  }

  const updateDamagedItem = (catalogProductId, field, value) => {
    setDamagedItems(
      damagedItems.map((d) =>
        d.catalog_product_id === catalogProductId ? { ...d, [field]: value } : d
      )
    )
  }

  const totalDamageAmount = damagedItems.reduce(
    (sum, d) => sum + d.quantity_damaged * d.unit_price,
    0
  )

  const handleSubmit = async () => {
    if (damagedItems.length === 0) {
      showAlert('No Items', 'Please add at least one damaged item to the report.')
      return
    }
    if (!description.trim()) {
      showAlert('Description Required', 'Please describe the damage.')
      return
    }

    setIsSubmitting(true)
    try {
      await submitClaim({
        order_id: order._id,
        items: damagedItems.map((d) => ({
          catalog_product_id: d.catalog_product_id,
          quantity_damaged: d.quantity_damaged,
          damage_reason: d.damage_reason,
          reason_note: d.reason_note?.trim() || undefined,
        })),
        description: description.trim(),
        submitted_by: userId,
      })
      showAlert('Claim Submitted', `Damage claim for ₱${totalDamageAmount.toLocaleString()} has been submitted for review.`)
      onClose()
    } catch (error) {
      showAlert('Error', error.message || 'Failed to submit damage claim.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Items available to report damage on
  const availableItems = order.items.filter(
    (oi) => !damagedItems.find((d) => d.catalog_product_id === oi.catalog_product_id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#2A2A2A]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-white text-lg font-semibold">Report Damage</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Order Reference */}
          <div className="bg-[#0A0A0A] rounded-xl p-3 border border-[#2A2A2A]">
            <span className="text-gray-400 text-xs">Order</span>
            <div className="text-[var(--color-primary)] font-mono font-semibold">
              {order.order_number}
            </div>
          </div>

          {/* Add Damaged Items */}
          {availableItems.length > 0 && (
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Select Damaged Items
              </label>
              <div className="space-y-2">
                {availableItems.map((item) => (
                  <button
                    key={item.catalog_product_id}
                    onClick={() => addDamagedItem(item)}
                    className="w-full flex items-center justify-between p-3 bg-[#2A2A2A] rounded-lg hover:bg-[#333] transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <div>
                        <span className="text-white text-sm">{item.product_name}</span>
                        <span className="text-gray-500 text-xs ml-2">
                          (Qty: {item.quantity_approved ?? item.quantity_requested})
                        </span>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-[var(--color-primary)]" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Damaged Items List */}
          {damagedItems.length > 0 && (
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Damaged Items ({damagedItems.length})
              </label>
              <div className="space-y-3">
                {damagedItems.map((item) => (
                  <div
                    key={item.catalog_product_id}
                    className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white text-sm font-medium">{item.product_name}</span>
                      <button
                        onClick={() => removeDamagedItem(item.catalog_product_id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-xs">Damaged Qty (max {item.max_quantity})</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateDamagedItem(
                              item.catalog_product_id,
                              'quantity_damaged',
                              Math.max(1, item.quantity_damaged - 1)
                            )
                          }
                          className="p-1 bg-[#3A3A3A] rounded text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-white font-bold w-8 text-center">
                          {item.quantity_damaged}
                        </span>
                        <button
                          onClick={() =>
                            updateDamagedItem(
                              item.catalog_product_id,
                              'quantity_damaged',
                              Math.min(item.max_quantity, item.quantity_damaged + 1)
                            )
                          }
                          disabled={item.quantity_damaged >= item.max_quantity}
                          className="p-1 bg-[#3A3A3A] rounded text-white disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Reason */}
                    <select
                      value={item.damage_reason}
                      onChange={(e) =>
                        updateDamagedItem(item.catalog_product_id, 'damage_reason', e.target.value)
                      }
                      className="w-full px-3 py-2 bg-[#3A3A3A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      {DAMAGE_REASONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>

                    {/* Amount */}
                    <div className="text-right text-red-400 text-sm font-semibold">
                      ₱{(item.quantity_damaged * item.unit_price).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1.5 block">
              Damage Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the damage in detail..."
              rows={3}
              className="w-full px-4 py-2.5 bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
            />
          </div>

          {/* Total */}
          {damagedItems.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-sm">Total Damage Claim</span>
                <span className="text-red-400 text-xl font-bold">
                  ₱{totalDamageAmount.toLocaleString()}
                </span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                This amount will be reviewed by the super admin before crediting.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[#2A2A2A]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || damagedItems.length === 0 || !description.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              `Submit Damage Claim — ₱${totalDamageAmount.toLocaleString()}`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DamageReportModal
