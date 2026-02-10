import React, { useState } from 'react'
import { Crown, Plus, Edit2, Trash2, Users, Gift, AlertTriangle, CheckCircle, RefreshCw, X } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'

/**
 * Tier Management Panel
 *
 * Super Admin can:
 * - View/edit tier thresholds
 * - Manage tier benefits
 * - Create new tiers
 * - Trigger batch promotions
 *
 * Story 19.2: Tier Management Interface
 */
const TierManagementPanel = () => {
  const { showConfirm } = useAppModal()
  const [editingTier, setEditingTier] = useState(null)
  const [showNewTierModal, setShowNewTierModal] = useState(false)
  const [showPromotionDialog, setShowPromotionDialog] = useState(false)
  const [addingBenefitToTier, setAddingBenefitToTier] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  // Queries
  const tiersWithBenefits = useQuery(api.services.tiers.getAllTiersWithBenefits)
  const eligibleForPromotion = useQuery(api.services.tiers.countEligibleForPromotion)

  // Mutations
  const updateTierMutation = useMutation(api.services.tiers.updateTier)
  const createTierMutation = useMutation(api.services.tiers.createTier)
  const deleteTierMutation = useMutation(api.services.tiers.deleteTier)
  const addBenefitMutation = useMutation(api.services.tiers.addTierBenefit)
  const updateBenefitMutation = useMutation(api.services.tiers.updateTierBenefit)
  const removeBenefitMutation = useMutation(api.services.tiers.removeTierBenefit)
  const promoteAllMutation = useMutation(api.services.tiers.promoteAllEligible)

  // New tier form state
  const [newTier, setNewTier] = useState({
    name: '',
    threshold: 0,
    display_order: 5,
    icon: '⭐',
    color: '#FFD700',
  })

  // New benefit form state
  const [newBenefit, setNewBenefit] = useState({
    benefit_type: 'points_multiplier',
    benefit_value: 1.0,
    description: '',
  })

  const benefitTypes = [
    { value: 'points_multiplier', label: 'Points Multiplier', placeholder: 'e.g., 1.05 for 5% bonus' },
    { value: 'priority_booking', label: 'Priority Booking', placeholder: 'Set to 1 to enable' },
    { value: 'free_service', label: 'Free Service', placeholder: 'Number of free services' },
    { value: 'discount', label: 'Discount', placeholder: 'Percentage (e.g., 10 for 10%)' },
    { value: 'early_access', label: 'Early Access', placeholder: 'Set to 1 to enable' },
    { value: 'vip_line', label: 'VIP Line', placeholder: 'Set to 1 to enable' },
    { value: 'exclusive_event', label: 'Exclusive Event', placeholder: 'Set to 1 to enable' },
  ]

  // Handle tier update
  const handleUpdateTier = async (tierId, updates) => {
    setLoading(true)
    try {
      await updateTierMutation({ tierId, ...updates })
      setMessage({ type: 'success', text: 'Tier updated successfully!' })
      setEditingTier(null)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update tier' })
    } finally {
      setLoading(false)
    }
  }

  // Handle new tier creation
  const handleCreateTier = async () => {
    setLoading(true)
    try {
      await createTierMutation({
        ...newTier,
        threshold: newTier.threshold * 100, // Convert to ×100 format
      })
      setMessage({ type: 'success', text: `Tier "${newTier.name}" created!` })
      setShowNewTierModal(false)
      setNewTier({ name: '', threshold: 0, display_order: 5, icon: '⭐', color: '#FFD700' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to create tier' })
    } finally {
      setLoading(false)
    }
  }

  // Handle tier deletion
  const handleDeleteTier = async (tierId, tierName) => {
    const confirmed = await showConfirm({ title: 'Delete Tier', message: `Are you sure you want to delete the "${tierName}" tier?`, type: 'warning' })
    if (!confirmed) return

    setLoading(true)
    try {
      await deleteTierMutation({ tierId })
      setMessage({ type: 'success', text: `Tier "${tierName}" deleted!` })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete tier' })
    } finally {
      setLoading(false)
    }
  }

  // Handle add benefit
  const handleAddBenefit = async (tierId) => {
    setLoading(true)
    try {
      await addBenefitMutation({
        tierId,
        benefit_type: newBenefit.benefit_type,
        benefit_value: parseFloat(newBenefit.benefit_value) || 1,
        description: newBenefit.description,
      })
      setMessage({ type: 'success', text: 'Benefit added!' })
      setAddingBenefitToTier(null)
      setNewBenefit({ benefit_type: 'points_multiplier', benefit_value: 1.0, description: '' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to add benefit' })
    } finally {
      setLoading(false)
    }
  }

  // Handle remove benefit
  const handleRemoveBenefit = async (benefitId) => {
    const confirmed = await showConfirm({ title: 'Remove Benefit', message: 'Remove this benefit?', type: 'warning' })
    if (!confirmed) return

    setLoading(true)
    try {
      await removeBenefitMutation({ benefitId })
      setMessage({ type: 'success', text: 'Benefit removed!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove benefit' })
    } finally {
      setLoading(false)
    }
  }

  // Handle batch promotion
  const handlePromoteAll = async () => {
    setLoading(true)
    try {
      const result = await promoteAllMutation()
      setMessage({ type: 'success', text: `Promoted ${result.promotedCount} customers!` })
      setShowPromotionDialog(false)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to run promotions' })
    } finally {
      setLoading(false)
    }
  }

  if (!tiersWithBenefits) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Crown className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">VIP Tier Management</h3>
            <p className="text-sm text-gray-400">Configure tier thresholds and benefits</p>
          </div>
        </div>
        <div className="flex gap-2">
          {eligibleForPromotion?.totalEligible > 0 && (
            <button
              onClick={() => setShowPromotionDialog(true)}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 text-amber-400 rounded-lg text-sm hover:bg-amber-500/30 transition-colors"
            >
              <Users className="w-4 h-4" />
              {eligibleForPromotion.totalEligible} Pending Promotions
            </button>
          )}
          <button
            onClick={() => setShowNewTierModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Add Tier
          </button>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Tier Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tiersWithBenefits
          .filter(tier => tier.is_active !== false)
          .sort((a, b) => a.display_order - b.display_order)
          .map((tier) => (
            <div
              key={tier._id}
              className="bg-[#0A0A0A] rounded-xl border border-[#2A2A2A] overflow-hidden"
            >
              {/* Tier Header */}
              <div
                className="p-4 border-b border-[#2A2A2A]"
                style={{ borderLeftWidth: 4, borderLeftColor: tier.color }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{tier.icon}</span>
                    <div>
                      <h4 className="font-semibold text-white">{tier.name}</h4>
                      <p className="text-sm text-gray-400">
                        {tier.displayThreshold.toLocaleString()} pts threshold
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {tier.userCount}
                    </span>
                    <button
                      onClick={() => setEditingTier(tier)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {tier.userCount === 0 && tier.name !== 'Bronze' && (
                      <button
                        onClick={() => handleDeleteTier(tier._id, tier.name)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Benefits List */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">Benefits</span>
                  <button
                    onClick={() => setAddingBenefitToTier(tier._id)}
                    className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
                <div className="space-y-2">
                  {tier.benefits.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No benefits configured</p>
                  ) : (
                    tier.benefits.map((benefit) => (
                      <div
                        key={benefit._id}
                        className="flex items-center justify-between p-2 bg-[#1A1A1A] rounded-lg group"
                      >
                        <div className="flex items-center gap-2">
                          <Gift className="w-3 h-3 text-gray-500" />
                          <span className="text-sm text-gray-300">{benefit.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {benefit.benefit_type === 'points_multiplier'
                              ? `${benefit.benefit_value}x`
                              : benefit.benefit_value}
                          </span>
                          <button
                            onClick={() => handleRemoveBenefit(benefit._id)}
                            className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Benefit Form (inline) */}
                {addingBenefitToTier === tier._id && (
                  <div className="mt-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
                    <div className="space-y-2">
                      <select
                        value={newBenefit.benefit_type}
                        onChange={(e) => setNewBenefit({ ...newBenefit, benefit_type: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      >
                        {benefitTypes.map((bt) => (
                          <option key={bt.value} value={bt.value}>{bt.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={benefitTypes.find(b => b.value === newBenefit.benefit_type)?.placeholder}
                        value={newBenefit.benefit_value}
                        onChange={(e) => setNewBenefit({ ...newBenefit, benefit_value: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <input
                        type="text"
                        placeholder="Description (e.g., '5% bonus points')"
                        value={newBenefit.description}
                        onChange={(e) => setNewBenefit({ ...newBenefit, description: e.target.value })}
                        className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddBenefit(tier._id)}
                          disabled={loading || !newBenefit.description}
                          className="flex-1 px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm disabled:opacity-50"
                        >
                          Add Benefit
                        </button>
                        <button
                          onClick={() => setAddingBenefitToTier(null)}
                          className="px-3 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg text-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Edit Tier Modal */}
      {editingTier && (
        <TierEditModal
          tier={editingTier}
          onSave={handleUpdateTier}
          onClose={() => setEditingTier(null)}
          loading={loading}
        />
      )}

      {/* New Tier Modal */}
      {showNewTierModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowNewTierModal(false)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Create New Tier</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Tier Name</label>
                <input
                  type="text"
                  value={newTier.name}
                  onChange={(e) => setNewTier({ ...newTier, name: e.target.value })}
                  placeholder="e.g., Diamond"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Threshold (Points)</label>
                <input
                  type="number"
                  value={newTier.threshold}
                  onChange={(e) => setNewTier({ ...newTier, threshold: parseInt(e.target.value) || 0 })}
                  placeholder="e.g., 100000"
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Icon</label>
                  <input
                    type="text"
                    value={newTier.icon}
                    onChange={(e) => setNewTier({ ...newTier, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-center text-2xl focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Color</label>
                  <input
                    type="color"
                    value={newTier.color}
                    onChange={(e) => setNewTier({ ...newTier, color: e.target.value })}
                    className="w-full h-10 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Display Order</label>
                <input
                  type="number"
                  value={newTier.display_order}
                  onChange={(e) => setNewTier({ ...newTier, display_order: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreateTier}
                disabled={loading || !newTier.name || newTier.threshold <= 0}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Tier'}
              </button>
              <button
                onClick={() => setShowNewTierModal(false)}
                className="px-4 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion Confirmation Dialog */}
      {showPromotionDialog && eligibleForPromotion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowPromotionDialog(false)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Confirm Batch Promotion</h3>
                <p className="text-sm text-gray-400">{eligibleForPromotion.totalEligible} customers will be promoted</p>
              </div>
            </div>

            <div className="bg-[#0A0A0A] rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 uppercase mb-2">Promotion Summary</p>
              <div className="space-y-1">
                {Object.entries(eligibleForPromotion.summary || {}).map(([transition, count]) => (
                  <div key={transition} className="flex justify-between text-sm">
                    <span className="text-gray-400">{transition}</span>
                    <span className="text-white font-medium">{count} customers</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              This action will update tier assignments for all eligible customers based on their lifetime points. This cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={handlePromoteAll}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Promoting...' : 'Confirm Promotion'}
              </button>
              <button
                onClick={() => setShowPromotionDialog(false)}
                className="px-4 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Tier Edit Modal Component
 */
const TierEditModal = ({ tier, onSave, onClose, loading }) => {
  const [form, setForm] = useState({
    name: tier.name,
    threshold: tier.displayThreshold,
    icon: tier.icon,
    color: tier.color,
    display_order: tier.display_order,
  })

  const handleSave = () => {
    onSave(tier._id, {
      name: form.name,
      threshold: form.threshold * 100, // Convert to ×100 format
      icon: form.icon,
      color: form.color,
      display_order: form.display_order,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{form.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Edit {tier.name} Tier</h3>
            <p className="text-sm text-gray-400">{tier.userCount} customers currently on this tier</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tier Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Threshold (Points)
              {form.threshold !== tier.displayThreshold && (
                <span className="text-amber-400 ml-2">
                  (was {tier.displayThreshold.toLocaleString()})
                </span>
              )}
            </label>
            <input
              type="number"
              value={form.threshold}
              onChange={(e) => setForm({ ...form, threshold: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Icon</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-center text-2xl focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Color</label>
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-full h-10 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg cursor-pointer"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Display Order</label>
            <input
              type="number"
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </div>

        {form.threshold < tier.displayThreshold && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <p className="text-sm text-amber-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Lowering the threshold may trigger promotions. Run "Pending Promotions" after saving.
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2A2A2A] text-gray-400 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default TierManagementPanel
