import { useState, useEffect } from 'react'
import {
  Building,
  Save,
  Percent,
  CreditCard,
  Wallet,
  Building2,
  User,
  Hash,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  RefreshCw,
  Info,
  Calendar,
  Clock
} from 'lucide-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

/**
 * Branch Wallet Settings Panel
 *
 * Super Admin can configure per-branch wallet settings:
 * - Commission override (optional, uses global if not set)
 * - Payout method (GCash, Maya, Bank Transfer)
 * - Payout account details
 *
 * Story 21.4: Configure Branch Wallet Settings
 */
const BranchWalletSettingsPanel = () => {
  const [selectedBranchId, setSelectedBranchId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showCommissionInfo, setShowCommissionInfo] = useState(false)

  // Fetch all branches with their settings
  const branchList = useQuery(api.services.branchWalletSettings.listAllBranchSettings)
  const globalConfig = useQuery(api.services.walletConfig.getCommissionRate)
  const settlementParams = useQuery(api.services.walletConfig.getSettlementParams)

  // Get settings for selected branch
  const branchSettings = useQuery(
    api.services.branchWalletSettings.getBranchWalletSettings,
    selectedBranchId ? { branch_id: selectedBranchId } : "skip"
  )

  const updateSettingsMutation = useMutation(api.services.branchWalletSettings.updateBranchWalletSettings)

  // Form state
  const [formValues, setFormValues] = useState({
    use_commission_override: false,
    commission_override: '',
    use_settlement_override: false,
    settlement_frequency: '',
    payout_method: '',
    payout_account_number: '',
    payout_account_name: '',
    payout_bank_name: '',
  })

  // Validation state
  const [errors, setErrors] = useState({})

  // Update form when branch settings load
  useEffect(() => {
    if (branchSettings) {
      setFormValues({
        use_commission_override: branchSettings.commission_override !== undefined && branchSettings.commission_override !== null,
        commission_override: branchSettings.commission_override?.toString() || '',
        use_settlement_override: !!branchSettings.settlement_frequency,
        settlement_frequency: branchSettings.settlement_frequency || '',
        payout_method: branchSettings.payout_method || '',
        payout_account_number: branchSettings.payout_account_number || '',
        payout_account_name: branchSettings.payout_account_name || '',
        payout_bank_name: branchSettings.payout_bank_name || '',
      })
      setErrors({})
    } else if (branchSettings === null) {
      // No settings yet - reset form
      setFormValues({
        use_commission_override: false,
        commission_override: '',
        use_settlement_override: false,
        settlement_frequency: '',
        payout_method: '',
        payout_account_number: '',
        payout_account_name: '',
        payout_bank_name: '',
      })
      setErrors({})
    }
  }, [branchSettings])

  // Handle form value change
  const handleValueChange = (key, value) => {
    setFormValues(prev => ({ ...prev, [key]: value }))
    setMessage({ type: '', text: '' })

    // Clear related errors
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }))
    }

    // Clear bank name if payout method changes away from bank
    if (key === 'payout_method' && value !== 'bank') {
      setFormValues(prev => ({ ...prev, payout_bank_name: '' }))
    }
  }

  // Toggle commission override
  const handleToggleCommissionOverride = () => {
    const newValue = !formValues.use_commission_override
    setFormValues(prev => ({
      ...prev,
      use_commission_override: newValue,
      commission_override: newValue ? (globalConfig?.commission_percent?.toString() || '5') : '',
    }))
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    // Validate commission override if enabled
    if (formValues.use_commission_override) {
      const commission = Number(formValues.commission_override)
      if (isNaN(commission)) {
        newErrors.commission_override = 'Must be a number'
      } else if (commission < 0 || commission > 100) {
        newErrors.commission_override = 'Must be between 0 and 100'
      } else if (!Number.isInteger(commission)) {
        newErrors.commission_override = 'Must be a whole number'
      }
    }

    // Validate payout details if method is set
    if (formValues.payout_method) {
      if (!formValues.payout_account_number?.trim()) {
        newErrors.payout_account_number = 'Account number is required'
      }
      if (!formValues.payout_account_name?.trim()) {
        newErrors.payout_account_name = 'Account name is required'
      }
      if (formValues.payout_method === 'bank' && !formValues.payout_bank_name?.trim()) {
        newErrors.payout_bank_name = 'Bank name is required for bank transfers'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Save settings
  const handleSave = async () => {
    if (!selectedBranchId) {
      setMessage({ type: 'error', text: 'Please select a branch first' })
      return
    }

    if (!validateForm()) {
      setMessage({ type: 'error', text: 'Please fix validation errors' })
      return
    }

    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const result = await updateSettingsMutation({
        branch_id: selectedBranchId,
        commission_override: formValues.use_commission_override
          ? Number(formValues.commission_override)
          : null,
        settlement_frequency: formValues.settlement_frequency || null,
        payout_method: formValues.payout_method || null,
        payout_account_number: formValues.payout_account_number || null,
        payout_account_name: formValues.payout_account_name || null,
        payout_bank_name: formValues.payout_bank_name || null,
      })

      setMessage({
        type: 'success',
        text: result.is_update ? 'Settings updated successfully!' : 'Settings created successfully!'
      })
    } catch (error) {
      console.error('Save error:', error)
      setMessage({
        type: 'error',
        text: error.message || 'Failed to save settings'
      })
    } finally {
      setLoading(false)
    }
  }

  // Loading skeleton
  if (branchList === undefined) {
    return (
      <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#2A2A2A] rounded-lg animate-pulse"></div>
          <div className="h-6 w-48 bg-[#2A2A2A] rounded animate-pulse"></div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-12 bg-[#2A2A2A] rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  const selectedBranch = branchList?.find(b => b.branch_id === selectedBranchId)
  const globalCommission = globalConfig?.commission_percent ?? 5

  return (
    <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#2A2A2A]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
          <Building className="w-5 h-5 text-[#FF8C42]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Branch Wallet Settings</h2>
          <p className="text-sm text-gray-400">Configure payout details per branch</p>
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

      {/* Branch Selector */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Select Branch</label>
        <div className="relative">
          <select
            value={selectedBranchId || ''}
            onChange={(e) => setSelectedBranchId(e.target.value || null)}
            className="w-full px-4 py-3 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white focus:border-[#FF8C42] focus:outline-none appearance-none"
          >
            <option value="">-- Select a branch --</option>
            {branchList?.map(branch => (
              <option key={branch.branch_id} value={branch.branch_id}>
                {branch.branch_name} {branch.has_settings ? '(Configured)' : '(Not Configured)'}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Settings Form - only show when branch selected */}
      {selectedBranchId && (
        <div className="space-y-6">
          {/* Commission Override Card */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                  <Percent className="w-5 h-5 text-[#FF8C42]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">Commission Override</p>
                    {formValues.use_commission_override && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[#FF8C42]/20 text-[#FF8C42] rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {formValues.use_commission_override
                      ? `Custom rate: ${formValues.commission_override}%`
                      : `Using global rate: ${globalCommission}%`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCommissionInfo(!showCommissionInfo)}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Commission Info */}
            {showCommissionInfo && (
              <div className="mb-4 p-3 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A] text-sm text-gray-300">
                <p className="mb-2">
                  <strong className="text-white">Commission Override:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>Override applies only to this branch</li>
                  <li>Global rate: {globalCommission}%</li>
                  <li>Leave disabled to use global rate</li>
                </ul>
              </div>
            )}

            {/* Toggle and Input */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={handleToggleCommissionOverride}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formValues.use_commission_override ? 'bg-[#FF8C42]' : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formValues.use_commission_override ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>

              {formValues.use_commission_override && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formValues.commission_override}
                    onChange={(e) => handleValueChange('commission_override', e.target.value)}
                    className={`w-20 px-3 py-2 bg-[#1A1A1A] border rounded-lg text-white focus:outline-none ${
                      errors.commission_override
                        ? 'border-red-500'
                        : 'border-[#2A2A2A] focus:border-[#FF8C42]'
                    }`}
                  />
                  <span className="text-[#FF8C42] font-bold">%</span>
                  <button
                    type="button"
                    onClick={() => handleValueChange('commission_override', globalCommission.toString())}
                    className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-colors"
                    title="Reset to global rate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {errors.commission_override && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.commission_override}
              </p>
            )}
          </div>

          {/* Settlement Frequency Override Card - Story 21.5 */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-[#FF8C42]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">Settlement Frequency</p>
                    {formValues.use_settlement_override && (
                      <span className="px-2 py-0.5 text-xs font-medium bg-[#FF8C42]/20 text-[#FF8C42] rounded">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {formValues.use_settlement_override
                      ? `Custom: ${formValues.settlement_frequency}`
                      : `Using global: ${settlementParams?.default_frequency || 'weekly'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Toggle and Frequency Selector */}
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => {
                  const newValue = !formValues.use_settlement_override
                  handleValueChange('use_settlement_override', newValue)
                  if (newValue) {
                    handleValueChange('settlement_frequency', settlementParams?.default_frequency || 'weekly')
                  } else {
                    handleValueChange('settlement_frequency', '')
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formValues.use_settlement_override ? 'bg-[#FF8C42]' : 'bg-[#2A2A2A]'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formValues.use_settlement_override ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
              <span className="text-sm text-gray-400">
                {formValues.use_settlement_override ? 'Override enabled' : 'Using global default'}
              </span>
            </div>

            {/* Frequency Buttons - only show when override enabled */}
            {formValues.use_settlement_override && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'biweekly', label: 'Bi-weekly' },
                ].map(freq => (
                  <button
                    key={freq.value}
                    type="button"
                    onClick={() => handleValueChange('settlement_frequency', freq.value)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                      formValues.settlement_frequency === freq.value
                        ? 'bg-[#FF8C42]/10 border-[#FF8C42] text-[#FF8C42]'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">{freq.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Payout Details Card */}
          <div className="p-4 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#FF8C42]/10 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-[#FF8C42]" />
              </div>
              <div>
                <p className="text-white font-medium">Payout Details</p>
                <p className="text-sm text-gray-400">How this branch receives settlements</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Payout Method */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Payout Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'gcash', label: 'GCash', icon: Wallet },
                    { value: 'maya', label: 'Maya', icon: Wallet },
                    { value: 'bank', label: 'Bank', icon: Building2 },
                  ].map(method => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => handleValueChange('payout_method', method.value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-colors ${
                        formValues.payout_method === method.value
                          ? 'bg-[#FF8C42]/10 border-[#FF8C42] text-[#FF8C42]'
                          : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <method.icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Details - only show if method selected */}
              {formValues.payout_method && (
                <>
                  {/* Account Number */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <Hash className="w-4 h-4" />
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={formValues.payout_account_number}
                      onChange={(e) => handleValueChange('payout_account_number', e.target.value)}
                      placeholder={formValues.payout_method === 'gcash' ? '09XX XXX XXXX' : formValues.payout_method === 'maya' ? '09XX XXX XXXX' : 'Account number'}
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                        errors.payout_account_number
                          ? 'border-red-500'
                          : 'border-[#2A2A2A] focus:border-[#FF8C42]'
                      }`}
                    />
                    {errors.payout_account_number && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.payout_account_number}
                      </p>
                    )}
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={formValues.payout_account_name}
                      onChange={(e) => handleValueChange('payout_account_name', e.target.value)}
                      placeholder="Full name as registered"
                      className={`w-full px-4 py-3 bg-[#1A1A1A] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                        errors.payout_account_name
                          ? 'border-red-500'
                          : 'border-[#2A2A2A] focus:border-[#FF8C42]'
                      }`}
                    />
                    {errors.payout_account_name && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.payout_account_name}
                      </p>
                    )}
                  </div>

                  {/* Bank Name - only for bank transfers */}
                  {formValues.payout_method === 'bank' && (
                    <div>
                      <label className="block text-sm text-gray-400 mb-2 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={formValues.payout_bank_name}
                        onChange={(e) => handleValueChange('payout_bank_name', e.target.value)}
                        placeholder="e.g., BDO, BPI, Metrobank"
                        className={`w-full px-4 py-3 bg-[#1A1A1A] border rounded-lg text-white placeholder-gray-500 focus:outline-none ${
                          errors.payout_bank_name
                            ? 'border-red-500'
                            : 'border-[#2A2A2A] focus:border-[#FF8C42]'
                        }`}
                      />
                      {errors.payout_bank_name && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.payout_bank_name}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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
                <span>Save Branch Settings</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!selectedBranchId && (
        <div className="text-center py-8 text-gray-400">
          <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select a branch to configure wallet settings</p>
        </div>
      )}
    </div>
  )
}

export default BranchWalletSettingsPanel
