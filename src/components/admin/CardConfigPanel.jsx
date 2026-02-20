import React, { useState, useEffect } from 'react'
import { CreditCard, Save, History, AlertCircle, CheckCircle } from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * Membership Card Configuration Panel
 *
 * Super Admin can configure:
 * - Card system toggle
 * - Silver purchase price & multiplier
 * - Gold/Platinum top-up thresholds & multipliers
 * - XP thresholds for tier upgrades
 * - XP earning rates (per peso, per booking)
 * - Renewal period, grace period, maintenance window
 */
const CardConfigPanel = ({ onViewHistory }) => {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const cardConfig = useQuery(api.services.membershipCards.getCardConfig)
  const setConfigMutation = useMutation(api.services.loyaltyConfig.setConfig)

  const [form, setForm] = useState({
    card_enabled: 'true',
    card_silver_price: '299',
    card_gold_topup_threshold: '2000',
    card_platinum_topup_threshold: '5000',
    card_silver_multiplier: '1.5',
    card_gold_multiplier: '2.0',
    card_platinum_multiplier: '3.0',
    card_gold_xp_threshold: '200000',
    card_platinum_xp_threshold: '500000',
    card_xp_per_peso: '100',
    card_xp_per_booking: '5000',
    card_renewal_months: '12',
    card_grace_period_days: '30',
    card_maintenance_days: '30',
  })

  useEffect(() => {
    if (cardConfig) {
      const updated = {}
      for (const [key, val] of Object.entries(cardConfig)) {
        if (val !== null && val !== undefined) {
          updated[key] = String(val)
        }
      }
      setForm(prev => ({ ...prev, ...updated }))
    }
  }, [cardConfig])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    setMessage({ type: '', text: '' })
  }

  const saveAll = async () => {
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      for (const [key, value] of Object.entries(form)) {
        await setConfigMutation({
          key,
          value,
          userId: user._id,
          reason: 'Updated via Card Config Panel',
        })
      }
      setMessage({ type: 'success', text: 'Card configuration saved!' })
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' })
    } finally {
      setLoading(false)
    }
  }

  const ConfigInput = ({ label, configKey, hint, type = 'number', step, min, prefix }) => (
    <div>
      <label className="block text-sm text-gray-400 mb-2">{label}</label>
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-1 px-4 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg focus-within:border-[var(--color-primary)]">
          {prefix && <span className="text-gray-500 text-sm">{prefix}</span>}
          <input
            type={type}
            step={step}
            min={min}
            value={form[configKey]}
            onChange={(e) => handleChange(configKey, e.target.value)}
            className="flex-1 bg-transparent text-white focus:outline-none"
          />
        </div>
        {onViewHistory && (
          <button
            onClick={() => onViewHistory(configKey)}
            className="px-3 py-2 bg-[#2A2A2A] rounded-lg text-gray-400 hover:text-white transition-colors"
            title="View history"
          >
            <History className="w-4 h-4" />
          </button>
        )}
      </div>
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Membership Card Settings</h3>
            <p className="text-sm text-gray-400">Configure card pricing, multipliers, and thresholds</p>
          </div>
        </div>
        <button
          onClick={saveAll}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Card Config'}
        </button>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/30'
            : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      {/* Card System Toggle */}
      <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
        <div>
          <p className="text-sm font-medium text-white">Membership Card System</p>
          <p className="text-xs text-gray-500">Enable or disable the virtual card / paid membership system</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={form.card_enabled === 'true'}
            onChange={(e) => handleChange('card_enabled', e.target.checked ? 'true' : 'false')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing & Thresholds */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">💰</span>
            Pricing & Thresholds
          </h4>
          <div className="space-y-4">
            <ConfigInput
              label="Silver Card Price"
              configKey="card_silver_price"
              prefix="₱"
              step="1"
              min="0"
              hint="One-time purchase price for the Silver membership card"
            />
            <ConfigInput
              label="Gold Fast-Track Top-up"
              configKey="card_gold_topup_threshold"
              prefix="₱"
              step="100"
              min="0"
              hint="Wallet top-up amount to instantly upgrade to Gold"
            />
            <ConfigInput
              label="Platinum Fast-Track Top-up"
              configKey="card_platinum_topup_threshold"
              prefix="₱"
              step="100"
              min="0"
              hint="Wallet top-up amount to instantly upgrade to Platinum"
            />
          </div>
        </div>

        {/* Points Multipliers */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            Points Multipliers
          </h4>
          <div className="space-y-4">
            <ConfigInput
              label="Silver Multiplier"
              configKey="card_silver_multiplier"
              step="0.1"
              min="1"
              hint="e.g. 1.5 = 1.5x points earned"
            />
            <ConfigInput
              label="Gold Multiplier"
              configKey="card_gold_multiplier"
              step="0.1"
              min="1"
              hint="e.g. 2.0 = 2x points earned"
            />
            <ConfigInput
              label="Platinum Multiplier"
              configKey="card_platinum_multiplier"
              step="0.1"
              min="1"
              hint="e.g. 3.0 = 3x points earned"
            />

            {/* Preview */}
            <div className="mt-2 p-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
              <p className="text-xs text-gray-500 mb-2">Preview: ₱500 payment</p>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-400">🥈 {(500 * parseFloat(form.card_silver_multiplier || 1.5)).toFixed(0)} pts</span>
                <span className="text-yellow-400">🥇 {(500 * parseFloat(form.card_gold_multiplier || 2)).toFixed(0)} pts</span>
                <span className="text-purple-400">💎 {(500 * parseFloat(form.card_platinum_multiplier || 3)).toFixed(0)} pts</span>
              </div>
            </div>
          </div>
        </div>

        {/* XP Configuration */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            XP & Tier Progression
          </h4>
          <div className="space-y-4">
            <ConfigInput
              label="XP per Peso Spent"
              configKey="card_xp_per_peso"
              step="10"
              min="0"
              hint="XP earned per peso (×100 format, e.g. 100 = 1.00 XP per peso)"
            />
            <ConfigInput
              label="XP per Booking"
              configKey="card_xp_per_booking"
              step="100"
              min="0"
              hint="Flat XP bonus per service booking (×100 format, e.g. 5000 = 50 XP)"
            />
            <ConfigInput
              label="Gold XP Threshold"
              configKey="card_gold_xp_threshold"
              step="10000"
              min="0"
              hint="XP needed to auto-upgrade from Silver to Gold (×100 format)"
            />
            <ConfigInput
              label="Platinum XP Threshold"
              configKey="card_platinum_xp_threshold"
              step="10000"
              min="0"
              hint="XP needed to auto-upgrade from Gold to Platinum (×100 format)"
            />
          </div>
        </div>

        {/* Duration & Maintenance */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] p-5">
          <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">📅</span>
            Duration & Maintenance
          </h4>
          <div className="space-y-4">
            <ConfigInput
              label="Renewal Period (Months)"
              configKey="card_renewal_months"
              step="1"
              min="1"
              hint="How long a card lasts before needing renewal"
            />
            <ConfigInput
              label="Grace Period (Days)"
              configKey="card_grace_period_days"
              step="1"
              min="0"
              hint="Days after expiry where user can renew without losing tier"
            />
            <ConfigInput
              label="Maintenance Window (Days)"
              configKey="card_maintenance_days"
              step="1"
              min="0"
              hint="Inactivity days before Gold/Platinum drops one tier (0 = disabled)"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default CardConfigPanel
