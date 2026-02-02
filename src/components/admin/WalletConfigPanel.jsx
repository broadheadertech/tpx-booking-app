import React, { useState, useEffect } from 'react'
import {
  Settings,
  Save,
  Wallet,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Percent,
  Clock,
  DollarSign,
  Shield,
  TestTube,
  Info,
  Calculator,
  Calendar,
  Banknote,
  Gift,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

/**
 * Wallet Configuration Panel
 *
 * Super Admin can configure:
 * - PayMongo credentials for wallet top-ups
 * - Test mode toggle
 * - Default commission rate
 * - Settlement frequency
 * - Minimum settlement amount
 *
 * Story 21.2: Configure Super Admin PayMongo for Wallet
 * Story 21.3: Configure Global Commission Rate
 */
const WalletConfigPanel = () => {
  const { user } = useCurrentUser()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showSecretKey, setShowSecretKey] = useState(false)
  const [showWebhookSecret, setShowWebhookSecret] = useState(false)
  const [commissionError, setCommissionError] = useState('')
  const [showCommissionInfo, setShowCommissionInfo] = useState(false)

  // Story 23.3: Bonus tiers state (empty until loaded from config)
  const [bonusTiers, setBonusTiers] = useState([])
  const [bonusTierError, setBonusTierError] = useState('')

  // Fetch existing config
  const config = useQuery(api.services.walletConfig.getWalletConfig)
  const updateConfigMutation = useMutation(api.services.walletConfig.updateWalletConfig)

  // Form state
  const [formValues, setFormValues] = useState({
    public_key: '',
    secret_key: '',
    webhook_secret: '',
    is_test_mode: true,
    default_commission_percent: 5,
    default_settlement_frequency: 'weekly',
    min_settlement_amount: 500,
  })

  // Update form when config loads
  useEffect(() => {
    if (config) {
      setFormValues(prev => ({
        ...prev,
        public_key: config.paymongo_public_key || '',
        // Don't overwrite secrets - user must re-enter
        is_test_mode: config.is_test_mode,
        default_commission_percent: config.default_commission_percent,
        default_settlement_frequency: config.default_settlement_frequency,
        min_settlement_amount: config.min_settlement_amount,
      }))

      // Story 23.3: Load bonus tiers from config
      if (config.bonus_tiers && config.bonus_tiers.length > 0) {
        setBonusTiers(config.bonus_tiers)
      }
    }
  }, [config])

  // Validate commission rate (0-100, integers only)
  const validateCommission = (value) => {
    const numValue = Number(value)
    if (isNaN(numValue)) {
      return 'Commission must be a number'
    }
    if (numValue < 0) {
      return 'Commission cannot be negative'
    }
    if (numValue > 100) {
      return 'Commission cannot exceed 100%'
    }
    if (!Number.isInteger(numValue)) {
      return 'Commission must be a whole number'
    }
    return ''
  }

  // Calculate commission preview (example: ₱1,000 payment)
  const calculateCommissionPreview = (percent) => {
    const exampleAmount = 1000
    const commission = Math.round(exampleAmount * (percent / 100))
    const branchReceives = exampleAmount - commission
    return { exampleAmount, commission, branchReceives }
  }

  // Story 23.3: Bonus tier management functions
  const addBonusTier = () => {
    // Find a unique minAmount (next 500 increment)
    const existingAmounts = bonusTiers.map(t => t.minAmount)
    let newAmount = 500
    while (existingAmounts.includes(newAmount)) {
      newAmount += 500
    }
    setBonusTiers([...bonusTiers, { minAmount: newAmount, bonus: 0 }])
    setBonusTierError('')
  }

  const updateBonusTier = (index, field, value) => {
    const updated = [...bonusTiers]
    updated[index] = { ...updated[index], [field]: Number(value) }
    setBonusTiers(updated)
    setBonusTierError('')
  }

  const removeBonusTier = (index) => {
    const updated = bonusTiers.filter((_, i) => i !== index)
    setBonusTiers(updated)
    setBonusTierError('')
  }

  const validateBonusTiers = () => {
    const amounts = bonusTiers.map(t => t.minAmount)
    const uniqueAmounts = new Set(amounts)
    if (amounts.length !== uniqueAmounts.size) {
      return 'Each tier must have a unique minimum amount'
    }
    for (const tier of bonusTiers) {
      if (tier.minAmount <= 0) {
        return 'Minimum amount must be greater than 0'
      }
      if (tier.bonus < 0) {
        return 'Bonus amount cannot be negative'
      }
    }
    return ''
  }

  // Handle form value change
  const handleValueChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    setMessage({ type: '', text: '' })

    // Real-time commission validation
    if (key === 'default_commission_percent') {
      const error = validateCommission(value)
      setCommissionError(error)
    }
  }

  // Save configuration
  const handleSave = async () => {
    if (!user?._id) {
      setMessage({ type: 'error', text: 'Not authenticated' })
      return
    }

    // Validation
    if (!formValues.public_key.trim()) {
      setMessage({ type: 'error', text: 'Public Key is required' })
      return
    }

    // Only require secrets on new config or if user is updating them
    const isNewConfig = !config?.has_secrets_configured
    if (isNewConfig && !formValues.secret_key.trim()) {
      setMessage({ type: 'error', text: 'Secret Key is required for new configuration' })
      return
    }
    if (isNewConfig && !formValues.webhook_secret.trim()) {
      setMessage({ type: 'error', text: 'Webhook Secret is required for new configuration' })
      return
    }

    // Validate commission rate
    const commissionValidation = validateCommission(formValues.default_commission_percent)
    if (commissionValidation) {
      setCommissionError(commissionValidation)
      setMessage({ type: 'error', text: commissionValidation })
      return
    }

    // Story 23.3: Validate bonus tiers
    const bonusTierValidation = validateBonusTiers()
    if (bonusTierValidation) {
      setBonusTierError(bonusTierValidation)
      setMessage({ type: 'error', text: bonusTierValidation })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const result = await updateConfigMutation({
        public_key: formValues.public_key,
        secret_key: formValues.secret_key || '___UNCHANGED___', // Marker for unchanged
        webhook_secret: formValues.webhook_secret || '___UNCHANGED___',
        is_test_mode: formValues.is_test_mode,
        default_commission_percent: formValues.default_commission_percent,
        default_settlement_frequency: formValues.default_settlement_frequency,
        min_settlement_amount: formValues.min_settlement_amount,
        // Story 23.3: Include bonus tiers
        bonus_tiers: bonusTiers,
      })

      setMessage({
        type: 'success',
        text: result.is_update ? 'Configuration updated successfully!' : 'Configuration created successfully!'
      })

      // Clear secret fields after save
      setFormValues(prev => ({
        ...prev,
        secret_key: '',
        webhook_secret: '',
      }))
    } catch (error) {
      console.error('Save error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save configuration'
      })
    } finally {
      setLoading(false)
    }
  }

  // Loading skeleton
  if (config === undefined) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#2A2A2A] rounded-lg animate-pulse"></div>
          <div className="h-6 w-48 bg-[#2A2A2A] rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-12 bg-[#2A2A2A] rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
          <Wallet className="w-5 h-5 text-[#FF8C42]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Wallet Configuration</h2>
          <p className="text-sm text-gray-400">Configure PayMongo for wallet top-ups</p>
        </div>
      </div>

      {/* Status Message */}
      {message.text && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Configuration Status */}
      {config && (
        <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
          config.has_secrets_configured
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
        }`}>
          <Shield className="w-4 h-4" />
          <span className="text-sm">
            {config.has_secrets_configured
              ? 'PayMongo credentials are configured and encrypted'
              : 'PayMongo credentials need to be configured'
            }
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
          <div className="flex items-center gap-3">
            <TestTube className="w-5 h-5 text-[#FF8C42]" />
            <div>
              <p className="text-white font-medium">Test Mode</p>
              <p className="text-sm text-gray-400">Use PayMongo test environment</p>
            </div>
          </div>
          <button
            onClick={() => handleValueChange('is_test_mode', !formValues.is_test_mode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              formValues.is_test_mode ? 'bg-[#FF8C42]' : 'bg-[#2A2A2A]'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              formValues.is_test_mode ? 'translate-x-7' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* PayMongo Credentials */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Key className="w-4 h-4" />
            PayMongo Credentials
          </h3>

          {/* Public Key */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">Public Key</label>
            <input
              type="text"
              value={formValues.public_key}
              onChange={(e) => handleValueChange('public_key', e.target.value)}
              placeholder={formValues.is_test_mode ? 'pk_test_...' : 'pk_live_...'}
              className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-[#FF8C42] focus:outline-none"
            />
          </div>

          {/* Secret Key */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Secret Key {config?.has_secrets_configured && '(leave empty to keep current)'}
            </label>
            <div className="relative">
              <input
                type={showSecretKey ? 'text' : 'password'}
                value={formValues.secret_key}
                onChange={(e) => handleValueChange('secret_key', e.target.value)}
                placeholder={config?.has_secrets_configured ? '••••••••' : (formValues.is_test_mode ? 'sk_test_...' : 'sk_live_...')}
                className="w-full px-4 py-3 pr-12 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-[#FF8C42] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSecretKey(!showSecretKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showSecretKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Webhook Secret */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Webhook Secret {config?.has_secrets_configured && '(leave empty to keep current)'}
            </label>
            <div className="relative">
              <input
                type={showWebhookSecret ? 'text' : 'password'}
                value={formValues.webhook_secret}
                onChange={(e) => handleValueChange('webhook_secret', e.target.value)}
                placeholder={config?.has_secrets_configured ? '••••••••' : 'whsec_...'}
                className="w-full px-4 py-3 pr-12 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white placeholder-gray-500 focus:border-[#FF8C42] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showWebhookSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Commission Rate Card - Story 21.3 */}
        <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                <Percent className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div>
                <p className="text-white font-medium">Global Commission Rate</p>
                <p className="text-sm text-gray-400">Platform fee on wallet payments</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCommissionInfo(!showCommissionInfo)}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
              title="Learn more about commission"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Commission Info Tooltip */}
          {showCommissionInfo && (
            <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-sm text-gray-300">
              <p className="mb-2">
                <strong className="text-white">How Commission Works:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Commission is deducted from each wallet payment at branches</li>
                <li>The platform (Super Admin) receives the commission amount</li>
                <li>Branches receive the payment minus commission</li>
                <li>Default rate is 5% - industry standard for payment platforms</li>
              </ul>
            </div>
          )}

          {/* Commission Input */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formValues.default_commission_percent}
                  onChange={(e) => handleValueChange('default_commission_percent', Number(e.target.value))}
                  className={`w-24 px-4 py-3 bg-[#1A1A1A] border rounded-lg text-white text-lg font-semibold focus:outline-none transition-colors ${
                    commissionError
                      ? 'border-red-500 focus:border-red-500'
                      : 'border-[#2A2A2A] focus:border-[#FF8C42]'
                  }`}
                />
                <span className="text-2xl font-bold text-[#FF8C42]">%</span>
              </div>
              {commissionError && (
                <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {commissionError}
                </p>
              )}
            </div>
          </div>

          {/* Commission Preview Calculator */}
          <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
              <Calculator className="w-4 h-4" />
              <span>Commission Preview</span>
            </div>
            {(() => {
              const preview = calculateCommissionPreview(formValues.default_commission_percent || 0)
              return (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-[#0A0A0A] rounded">
                    <p className="text-xs text-gray-500">Payment</p>
                    <p className="text-sm font-semibold text-white">₱{preview.exampleAmount.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-[#FF8C42]/10 rounded">
                    <p className="text-xs text-gray-500">Commission</p>
                    <p className="text-sm font-semibold text-[#FF8C42]">₱{preview.commission.toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-green-500/10 rounded">
                    <p className="text-xs text-gray-500">Branch Gets</p>
                    <p className="text-sm font-semibold text-green-400">₱{preview.branchReceives.toLocaleString()}</p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Settlement Parameters Card - Story 21.5 */}
        <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#FF8C42]" />
            </div>
            <div>
              <p className="text-white font-medium">Settlement Parameters</p>
              <p className="text-sm text-gray-400">Payout frequency and minimum amounts</p>
            </div>
          </div>

          {/* Settlement Frequency - Visual Buttons */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Default Payout Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'daily', label: 'Daily', desc: 'Every day' },
                { value: 'weekly', label: 'Weekly', desc: 'Every week' },
                { value: 'biweekly', label: 'Bi-weekly', desc: 'Every 2 weeks' },
              ].map(freq => (
                <button
                  key={freq.value}
                  type="button"
                  onClick={() => handleValueChange('default_settlement_frequency', freq.value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
                    formValues.default_settlement_frequency === freq.value
                      ? 'bg-[#FF8C42]/10 border-[#FF8C42] text-[#FF8C42]'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-gray-500'
                  }`}
                >
                  <span className="text-sm font-medium">{freq.label}</span>
                  <span className="text-xs opacity-70">{freq.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Minimum Settlement Amount */}
          <div className="p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
            <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
              <Banknote className="w-4 h-4" />
              Minimum Settlement Amount
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#FF8C42]">₱</span>
              <input
                type="number"
                min="0"
                value={formValues.min_settlement_amount}
                onChange={(e) => handleValueChange('min_settlement_amount', Number(e.target.value))}
                className="w-32 px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-lg font-semibold focus:border-[#FF8C42] focus:outline-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Branches cannot request settlement below this amount</p>
          </div>
        </div>

        {/* Story 23.3: Bonus Tiers Configuration Card */}
        <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div>
                <p className="text-white font-medium">Top-up Bonus Tiers</p>
                <p className="text-sm text-gray-400">Bonus amounts for wallet top-ups</p>
              </div>
            </div>
            <button
              type="button"
              onClick={addBonusTier}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#FF8C42]/10 hover:bg-[#FF8C42]/20 text-[#FF8C42] text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Tier
            </button>
          </div>

          {/* Bonus Tiers Error */}
          {bonusTierError && (
            <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              {bonusTierError}
            </div>
          )}

          {/* Tier List */}
          <div className="space-y-3">
            {bonusTiers.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No bonus tiers configured</p>
                <p className="text-xs text-gray-600 mt-1">Add tiers to reward larger top-ups</p>
              </div>
            ) : (
              bonusTiers
                .sort((a, b) => a.minAmount - b.minAmount)
                .map((tier, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {/* Min Amount */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Top-up</label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-[#FF8C42]">₱</span>
                          <input
                            type="number"
                            min="1"
                            value={tier.minAmount}
                            onChange={(e) => updateBonusTier(index, 'minAmount', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:border-[#FF8C42] focus:outline-none"
                          />
                        </div>
                      </div>
                      {/* Bonus Amount */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Bonus</label>
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium text-green-400">+₱</span>
                          <input
                            type="number"
                            min="0"
                            value={tier.bonus}
                            onChange={(e) => updateBonusTier(index, 'bonus', e.target.value)}
                            className="w-full px-2 py-1.5 bg-[#0A0A0A] border border-[#2A2A2A] rounded text-white text-sm focus:border-[#FF8C42] focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Bonus Rate Badge */}
                    <div className="text-center min-w-[60px]">
                      <span className="text-xs text-gray-500 block">Rate</span>
                      <span className="text-sm font-semibold text-green-400">
                        {tier.minAmount > 0 ? Math.round((tier.bonus / tier.minAmount) * 100) : 0}%
                      </span>
                    </div>
                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeBonusTier(index)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Remove tier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
            )}
          </div>

          {/* Preview Info */}
          {bonusTiers.length > 0 && (
            <div className="mt-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <Sparkles className="w-4 h-4" />
                <span>Customer Preview</span>
              </div>
              <div className="space-y-1">
                {bonusTiers
                  .sort((a, b) => b.minAmount - a.minAmount)
                  .map((tier, index) => (
                    <p key={index} className="text-sm text-gray-300">
                      Top-up <span className="text-white font-medium">₱{tier.minAmount.toLocaleString()}</span> or more →
                      <span className="text-green-400 font-medium ml-1">+₱{tier.bonus.toLocaleString()} bonus</span>
                    </p>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#FF8C42] hover:bg-[#FF7A2E] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              <span>Save Configuration</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default WalletConfigPanel
