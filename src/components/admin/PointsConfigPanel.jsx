import React, { useState, useEffect, useCallback } from 'react'
import { Settings, Save, Coins, Wallet, Award, AlertCircle, CheckCircle, History, RefreshCw, HelpCircle } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import TierManagementPanel from './TierManagementPanel'
import CardConfigPanel from './CardConfigPanel'
import LoyaltyAnalyticsDashboard from './LoyaltyAnalyticsDashboard'
import ManualPointsAdjustment from './ManualPointsAdjustment'
import PointsExpiryPanel from './PointsExpiryPanel'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { loyaltySteps } from '../../config/walkthroughSteps'

/**
 * Points Configuration Panel
 *
 * Super Admin can configure:
 * - Base earning rate (points per peso)
 * - Wallet bonus multiplier
 * - Top-up bonus tiers
 * - Points system toggle
 *
 * Story 19.1: Points Configuration Panel
 */
const PointsConfigPanel = () => {
  const { user } = useCurrentUser()
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showPreview, setShowPreview] = useState(false)
  const [showAuditHistory, setShowAuditHistory] = useState(false)
  const [selectedConfigKey, setSelectedConfigKey] = useState(null)

  // Fetch all configs
  const configs = useQuery(api.services.loyaltyConfig.getAllConfigs)
  const setConfigMutation = useMutation(api.services.loyaltyConfig.setConfig)
  const seedConfigsMutation = useMutation(api.services.loyaltyConfig.seedDefaultConfigs)

  // Fetch audit history for selected config
  const auditHistory = useQuery(
    api.services.loyaltyConfig.getConfigAuditHistory,
    selectedConfigKey ? { key: selectedConfigKey } : 'skip'
  )

  // Local form state
  const [formValues, setFormValues] = useState({
    base_earning_rate: '1.0',
    wallet_bonus_multiplier: '1.5',
    points_enabled: 'true',
    min_redemption_points: '10000',
  })

  // Top-up bonus tiers (special handling for JSON)
  const [topUpTiers, setTopUpTiers] = useState([
    { amount: 500, bonus: 50 },
    { amount: 1000, bonus: 150 },
  ])

  // Update form when configs load
  useEffect(() => {
    if (configs) {
      const newValues = {}
      configs.forEach(config => {
        if (config.key === 'top_up_bonuses') {
          setTopUpTiers(config.value || [])
        } else {
          newValues[config.key] = String(config.rawValue)
        }
      })
      setFormValues(prev => ({ ...prev, ...newValues }))
    }
  }, [configs])

  // Handle form value change
  const handleValueChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    setMessage({ type: '', text: '' })
  }

  // Handle top-up tier change
  const handleTierChange = (index, field, value) => {
    setTopUpTiers(prev => {
      const newTiers = [...prev]
      newTiers[index] = { ...newTiers[index], [field]: Number(value) }
      return newTiers
    })
    setMessage({ type: '', text: '' })
  }

  // Add new top-up tier
  const addTopUpTier = () => {
    setTopUpTiers(prev => [...prev, { amount: 0, bonus: 0 }])
  }

  // Remove top-up tier
  const removeTopUpTier = (index) => {
    setTopUpTiers(prev => prev.filter((_, i) => i !== index))
  }

  // Save a single config
  const saveConfig = async (key, value) => {
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      return
    }

    setLoading(true)
    try {
      await setConfigMutation({
        key,
        value,
        userId: user._id,
        reason: 'Updated via Points Config Panel',
      })
      setMessage({ type: 'success', text: `Updated ${key} successfully!` })
    } catch (error) {
      console.error('Failed to save config:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save' })
    } finally {
      setLoading(false)
    }
  }

  // Save all configs
  const saveAllConfigs = async () => {
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      // Save individual configs
      for (const [key, value] of Object.entries(formValues)) {
        await setConfigMutation({
          key,
          value,
          userId: user._id,
          reason: 'Bulk update via Points Config Panel',
        })
      }

      // Save top-up tiers as JSON
      await setConfigMutation({
        key: 'top_up_bonuses',
        value: JSON.stringify(topUpTiers),
        userId: user._id,
        reason: 'Updated top-up bonus tiers',
      })

      setMessage({ type: 'success', text: 'All configurations saved successfully!' })
    } catch (error) {
      console.error('Failed to save configs:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to save configurations' })
    } finally {
      setLoading(false)
    }
  }

  // Seed default configs
  const handleSeedDefaults = async () => {
    setLoading(true)
    try {
      const result = await seedConfigsMutation()
      setMessage({
        type: 'success',
        text: `Seeded ${result.seededCount} of ${result.totalConfigs} default configs`,
      })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to seed defaults' })
    } finally {
      setLoading(false)
    }
  }

  // Calculate preview for sample payment
  const calculatePreview = (amount = 500) => {
    const baseRate = parseFloat(formValues.base_earning_rate) || 1.0
    const walletMultiplier = parseFloat(formValues.wallet_bonus_multiplier) || 1.5

    return {
      cashPoints: amount * baseRate,
      walletPoints: amount * walletMultiplier,
      topUpBonus: topUpTiers.find(t => amount >= t.amount)?.bonus || 0,
    }
  }

  const preview = calculatePreview(500)

  if (!configs) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div data-tour="loyalty-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center">
            <Coins className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Loyalty Points Configuration</h2>
            <p className="text-sm text-gray-400">Configure point earning rates and bonuses</p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={saveAllConfigs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Preview Card */}
      <div data-tour="loyalty-preview" className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--color-primary)]" />
            Preview: ₱500 Payment
          </h3>
          <span className="text-xs text-gray-500">Based on current settings</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
            <p className="text-xs text-gray-400 mb-1">Cash Payment</p>
            <p className="text-lg font-bold text-white">{preview.cashPoints.toFixed(0)} pts</p>
            <p className="text-xs text-gray-500">{formValues.base_earning_rate}x rate</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-amber-500/30">
            <p className="text-xs text-amber-400 mb-1">Wallet Payment</p>
            <p className="text-lg font-bold text-amber-400">{preview.walletPoints.toFixed(0)} pts</p>
            <p className="text-xs text-gray-500">{formValues.wallet_bonus_multiplier}x bonus</p>
          </div>
          <div className="bg-[#0A0A0A] rounded-lg p-3 border border-[#2A2A2A]">
            <p className="text-xs text-gray-400 mb-1">Top-up Bonus</p>
            <p className="text-lg font-bold text-green-400">+₱{preview.topUpBonus}</p>
            <p className="text-xs text-gray-500">Wallet credit</p>
          </div>
        </div>
      </div>

      <div data-tour="loyalty-config" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Point Earning Rates */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--color-primary)]" />
            Point Earning Rates
          </h3>

          <div className="space-y-4">
            {/* Base Earning Rate */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Base Earning Rate (Points per Peso)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={formValues.base_earning_rate}
                  onChange={(e) => handleValueChange('base_earning_rate', e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={() => setSelectedConfigKey('base_earning_rate')}
                  className="px-3 py-2 bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="View history"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                1.0 = 1 point per peso, 1.5 = 1.5 points per peso
              </p>
            </div>

            {/* Wallet Bonus Multiplier */}
            <div>
              <label className="block text-sm text-gray-400 mb-2">
                Wallet Bonus Multiplier
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={formValues.wallet_bonus_multiplier}
                  onChange={(e) => handleValueChange('wallet_bonus_multiplier', e.target.value)}
                  className="flex-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:outline-none focus:border-[var(--color-primary)]"
                />
                <button
                  onClick={() => setSelectedConfigKey('wallet_bonus_multiplier')}
                  className="px-3 py-2 bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
                  title="View history"
                >
                  <History className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Applied when customer pays with wallet balance (e.g., 1.5x = 50% bonus)
              </p>
            </div>

            {/* Points Enabled Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
              <div>
                <p className="text-sm font-medium text-white">Points System Enabled</p>
                <p className="text-xs text-gray-500">Toggle to enable/disable all points earning</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formValues.points_enabled === 'true'}
                  onChange={(e) => handleValueChange('points_enabled', e.target.checked ? 'true' : 'false')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Top-up Bonus Tiers */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
              Top-up Bonus Tiers
            </h3>
            <button
              onClick={addTopUpTier}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              + Add Tier
            </button>
          </div>

          <div className="space-y-3">
            {topUpTiers.map((tier, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
              >
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Min Amount</label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">₱</span>
                    <input
                      type="number"
                      min="0"
                      value={tier.amount}
                      onChange={(e) => handleTierChange(index, 'amount', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="text-gray-600">→</div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Bonus</label>
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">+₱</span>
                    <input
                      type="number"
                      min="0"
                      value={tier.bonus}
                      onChange={(e) => handleTierChange(index, 'bonus', e.target.value)}
                      className="w-full px-2 py-1 bg-transparent text-green-400 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={() => removeTopUpTier(index)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove tier"
                >
                  ×
                </button>
              </div>
            ))}

            {topUpTiers.length === 0 && (
              <p className="text-center text-gray-500 py-4">
                No bonus tiers configured. Click "Add Tier" to create one.
              </p>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Customers receive bonus wallet credit when topping up at or above tier amounts
          </p>
        </div>
      </div>

      {/* Audit History Modal */}
      {selectedConfigKey && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedConfigKey(null)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full mx-4 max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <h3 className="font-semibold text-white">Change History: {selectedConfigKey}</h3>
              <button
                onClick={() => setSelectedConfigKey(null)}
                className="p-2 text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {auditHistory?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No change history yet</p>
              ) : (
                <div className="space-y-3">
                  {auditHistory?.map((entry, index) => (
                    <div
                      key={index}
                      className="p-3 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">
                          {new Date(entry.changed_at).toLocaleString('en-PH')}
                        </span>
                        <span className="text-xs text-gray-500">{entry.changedByName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">{entry.old_value || '(none)'}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-green-400">{entry.new_value}</span>
                      </div>
                      {entry.change_reason && (
                        <p className="text-xs text-gray-500 mt-2">{entry.change_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-[#2A2A2A] my-8"></div>

      {/* Membership Card Configuration */}
      <CardConfigPanel onViewHistory={(key) => setSelectedConfigKey(key)} />

      {/* Divider */}
      <div className="border-t border-[#2A2A2A] my-8"></div>

      {/* Tier Management Section (Story 19.2) */}
      <TierManagementPanel />

      {/* Divider */}
      <div className="border-t border-[#2A2A2A] my-8"></div>

      {/* Analytics Dashboard Section (Story 19.3) */}
      <LoyaltyAnalyticsDashboard />

      {/* Divider */}
      <div className="border-t border-[#2A2A2A] my-8"></div>

      {/* Manual Points Adjustment Section (Story 19.4) */}
      <ManualPointsAdjustment />

      {/* Divider */}
      <div className="border-t border-[#2A2A2A] my-8"></div>

      {/* Points Expiry Section (Story 19.5) */}
      <PointsExpiryPanel />

      {/* Seed Defaults Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={handleSeedDefaults}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-400 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {showTutorial && (
        <WalkthroughOverlay steps={loyaltySteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  )
}

export default PointsConfigPanel
