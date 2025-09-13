import React, { useState, useEffect, useMemo } from 'react'
import { 
  DollarSign, 
  Users, 
  Calendar, 
  Settings, 
  Calculator, 
  CreditCard, 
  TrendingUp, 
  Download,
  RefreshCw,
  Filter,
  Plus,
  Edit,
  Check,
  X,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Percent
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { createPortal } from 'react-dom'

const PayrollManagement = ({ onRefresh, user }) => {
  const [activeView, setActiveView] = useState('overview')
  const [selectedPeriod, setSelectedPeriod] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expandedRecords, setExpandedRecords] = useState(new Set())
  const [showPeriodModal, setShowPeriodModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [paymentForm, setPaymentForm] = useState({
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: ''
  })
  const [submittingPayment, setSubmittingPayment] = useState(false)
  const [periodDates, setPeriodDates] = useState({
    startDate: '',
    endDate: ''
  })

  // Check if user is available
  if (!user) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading user data...</p>
          <p className="text-xs text-gray-500 mt-2">Please ensure you are logged in</p>
        </div>
      </div>
    )
  }

  // Check if user has branch_id (required for payroll)
  if (!user.branch_id) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-red-500/20 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Branch Required</h3>
          <p className="text-gray-300 mb-4">
            Payroll management requires a branch assignment. Your user account is not assigned to a branch.
          </p>
          <p className="text-sm text-gray-400">
            Please contact an administrator to assign your account to a branch.
          </p>
        </div>
      </div>
    )
  }

  // Payroll settings state
  const [payrollSettings, setPayrollSettings] = useState({
    default_commission_rate: 10,
    payout_frequency: 'weekly',
    payout_day: 5, // Friday for weekly
    tax_rate: 0
  })

  // Convex queries - branch-scoped for staff
  // Always call hooks, but pass null/undefined args when conditions aren't met
  const payrollSettingsData = useQuery(
    api.services.payroll.getPayrollSettingsByBranch, 
    user && user.branch_id ? { branch_id: user.branch_id } : "skip"
  )

  const payrollPeriods = useQuery(
    api.services.payroll.getPayrollPeriodsByBranch, 
    user && user.branch_id ? { branch_id: user.branch_id } : "skip"
  )

  const payrollSummary = useQuery(
    api.services.payroll.getPayrollSummaryByBranch, 
    user && user.branch_id ? { branch_id: user.branch_id, limit: 10 } : "skip"
  )

  const barbers = useQuery(
    api.services.barbers.getBarbersByBranch,
    user && user.branch_id ? { branch_id: user.branch_id } : "skip"
  )

  // Current period records
  const currentPeriodRecords = useQuery(
    api.services.payroll.getPayrollRecordsByPeriod,
    selectedPeriod && selectedPeriod._id ? { payroll_period_id: selectedPeriod._id } : "skip"
  )


  // Mutations
  const createOrUpdateSettings = useMutation(api.services.payroll.createOrUpdatePayrollSettings)
  const createPayrollPeriod = useMutation(api.services.payroll.createPayrollPeriod)
  const calculatePayroll = useMutation(api.services.payroll.calculatePayrollForPeriod)
  const markAsPaid = useMutation(api.services.payroll.markPayrollRecordAsPaid)
  const setBarberCommissionRate = useMutation(api.services.payroll.setBarberCommissionRate)

  // Initialize settings from data
  useEffect(() => {
    if (payrollSettingsData) {
      setPayrollSettings({
        default_commission_rate: payrollSettingsData.default_commission_rate,
        payout_frequency: payrollSettingsData.payout_frequency,
        payout_day: payrollSettingsData.payout_day,
        tax_rate: payrollSettingsData.tax_rate || 0
      })
    }
  }, [payrollSettingsData])

  // Set default selected period to most recent
  useEffect(() => {
    const periodsArray = Array.isArray(payrollPeriods) ? payrollPeriods : []
    if (periodsArray.length > 0 && !selectedPeriod) {
      setSelectedPeriod(periodsArray[0])
    }
  }, [payrollPeriods, selectedPeriod])

  // Calculate overview statistics
  const overviewStats = useMemo(() => {
    // Handle cases where data might be undefined or "skip" result
    const summaryArray = Array.isArray(payrollSummary) ? payrollSummary : []
    const barbersArray = Array.isArray(barbers) ? barbers : []
    
    // Don't require data to have length - create stats even with empty arrays
    const totalBarbers = barbersArray.filter(b => b?.is_active).length
    const lastPeriod = summaryArray[0]
    const previousPeriod = summaryArray[1]

    const currentPayout = lastPeriod?.total_commissions || 0
    const previousPayout = previousPeriod?.total_commissions || 0
    const payoutChange = previousPayout > 0 ? ((currentPayout - previousPayout) / previousPayout) * 100 : 0

    const pendingPayments = summaryArray.reduce((sum, period) => sum + (period.pending_records || 0), 0)
    const totalPaid = summaryArray.reduce((sum, period) => sum + (period.paid_records || 0), 0)

    return {
      totalBarbers,
      currentPayout,
      payoutChange: Math.abs(payoutChange),
      payoutTrend: payoutChange >= 0 ? 'up' : 'down',
      pendingPayments,
      totalPaid,
      averageCommission: totalBarbers > 0 ? currentPayout / totalBarbers : 0
    }
  }, [payrollSummary, barbers])

  // Helper function to calculate default period dates
  const calculateDefaultPeriodDates = () => {
    const frequency = payrollSettingsData?.payout_frequency || 'weekly'
    const today = new Date()
    
    let startDate, endDate
    
    if (frequency === 'weekly') {
      // Find last Monday or today if it's Monday
      const dayOfWeek = today.getDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 0, Monday = 1
      startDate = new Date(today)
      startDate.setDate(today.getDate() - daysToMonday)
      
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6) // 7 days period
    } else if (frequency === 'bi_weekly') {
      // 14 days period
      startDate = new Date(today)
      startDate.setDate(today.getDate() - 13)
      endDate = new Date(today)
    } else { // monthly
      // Current month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1)
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  // Handle open period modal
  const handleOpenPeriodModal = () => {
    if (!payrollSettingsData) {
      setError('Please configure payroll settings first before generating periods')
      setShowSettings(true)
      return
    }
    
    const defaultDates = calculateDefaultPeriodDates()
    setPeriodDates(defaultDates)
    setShowPeriodModal(true)
  }

  // Handle save settings
  const handleSaveSettings = async () => {
    if (!user?.branch_id) return

    try {
      setLoading(true)
      setError(null)
      await createOrUpdateSettings({
        branch_id: user.branch_id,
        default_commission_rate: payrollSettings.default_commission_rate,
        payout_frequency: payrollSettings.payout_frequency,
        payout_day: payrollSettings.payout_day,
        tax_rate: payrollSettings.tax_rate,
        created_by: user._id
      })
      setShowSettings(false)
      // Settings will auto-refresh via Convex real-time updates
    } catch (error) {
      setError('Failed to save payroll settings')
      console.error('Payroll settings error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle create period with custom dates
  const handleCreatePeriod = async () => {
    if (!user?.branch_id || !periodDates.startDate || !periodDates.endDate) return

    try {
      setLoading(true)
      setError(null)
      
      const startTimestamp = new Date(periodDates.startDate + 'T00:00:00').getTime()
      const endTimestamp = new Date(periodDates.endDate + 'T23:59:59').getTime()
      
      // Validate date range
      if (startTimestamp >= endTimestamp) {
        setError('End date must be after start date')
        return
      }
      
      await createPayrollPeriod({
        branch_id: user.branch_id,
        period_start: startTimestamp,
        period_end: endTimestamp,
        period_type: payrollSettingsData?.payout_frequency || 'weekly',
        created_by: user._id
      })
      
      setShowPeriodModal(false)
      setPeriodDates({ startDate: '', endDate: '' })
    } catch (error) {
      setError('Failed to create payroll period')
      console.error('Create period error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle calculate payroll
  const handleCalculatePayroll = async (periodId) => {
    try {
      setLoading(true)
      await calculatePayroll({
        payroll_period_id: periodId,
        calculated_by: user._id
      })
      // Data will auto-refresh via Convex real-time updates
    } catch (error) {
      setError('Failed to calculate payroll')
      console.error('Calculate payroll error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle mark as paid
  const handleMarkAsPaid = async (recordId, paymentMethod, reference, notes) => {
    try {
      setLoading(true)
      await markAsPaid({
        payroll_record_id: recordId,
        payment_method: paymentMethod,
        payment_reference: reference,
        notes: notes,
        paid_by: user._id
      })
      // Data will auto-refresh via Convex real-time updates
    } catch (error) {
      setError('Failed to mark payment as complete')
      console.error('Mark paid error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle refresh
  const handleRefresh = () => {
    setLoading(true)
    setError(null)
    onRefresh?.()
    setTimeout(() => setLoading(false), 1000)
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Format date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Format period type
  const formatPeriodType = (type) => {
    switch(type) {
      case 'weekly': return 'Weekly'
      case 'bi_weekly': return 'Bi-Weekly'
      case 'monthly': return 'Monthly'
      default: return type
    }
  }

  // Toggle record expansion
  const toggleRecordExpansion = (recordId) => {
    const newExpanded = new Set(expandedRecords)
    if (newExpanded.has(recordId)) {
      newExpanded.delete(recordId)
    } else {
      newExpanded.add(recordId)
    }
    setExpandedRecords(newExpanded)
  }

  // Render period creation modal
  const renderPeriodModal = () => {
    if (!showPeriodModal) return null

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowPeriodModal(false)}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#444444]/50">
              <h2 className="text-xl font-bold text-white">Create Payroll Period</h2>
              <button
                onClick={() => setShowPeriodModal(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    value={periodDates.startDate}
                    onChange={(e) => setPeriodDates(prev => ({
                      ...prev,
                      startDate: e.target.value
                    }))}
                    className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Period End Date
                  </label>
                  <input
                    type="date"
                    value={periodDates.endDate}
                    onChange={(e) => setPeriodDates(prev => ({
                      ...prev,
                      endDate: e.target.value
                    }))}
                    className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  />
                </div>

                <div className="bg-[#1A1A1A] rounded-lg border border-[#444444]/50 p-3">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Period Summary</h4>
                  <div className="space-y-1 text-xs text-gray-400">
                    <p>Frequency: {payrollSettingsData?.payout_frequency || 'weekly'}</p>
                    <p>Duration: {periodDates.startDate && periodDates.endDate ? 
                      Math.ceil((new Date(periodDates.endDate) - new Date(periodDates.startDate)) / (1000 * 60 * 60 * 24)) + 1 
                      : 0} days</p>
                    <p>Commission Rate: {payrollSettingsData?.default_commission_rate || 10}%</p>
                  </div>
                </div>
          </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPeriodModal(false)}
                  className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#555555]/70 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePeriod}
                  disabled={loading || !periodDates.startDate || !periodDates.endDate}
                  className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating...' : 'Create Period'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Render payroll settings modal
  const renderSettingsModal = () => {
    if (!showSettings) return null

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowSettings(false)}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#444444]/50">
              <h2 className="text-xl font-bold text-white">Payroll Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Default Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={payrollSettings.default_commission_rate}
                onChange={(e) => setPayrollSettings(prev => ({
                  ...prev,
                  default_commission_rate: parseFloat(e.target.value) || 0
                }))}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payout Frequency
              </label>
              <select
                value={payrollSettings.payout_frequency}
                onChange={(e) => setPayrollSettings(prev => ({
                  ...prev,
                  payout_frequency: e.target.value
                }))}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
              >
                <option value="weekly">Weekly</option>
                <option value="bi_weekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {payrollSettings.payout_frequency === 'weekly' ? 'Payout Day (0=Sunday, 6=Saturday)' : 'Payout Day of Month'}
              </label>
              <input
                type="number"
                min={payrollSettings.payout_frequency === 'weekly' ? "0" : "1"}
                max={payrollSettings.payout_frequency === 'weekly' ? "6" : "31"}
                value={payrollSettings.payout_day}
                onChange={(e) => setPayrollSettings(prev => ({
                  ...prev,
                  payout_day: parseInt(e.target.value) || 0
                }))}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={payrollSettings.tax_rate}
                onChange={(e) => setPayrollSettings(prev => ({
                  ...prev,
                  tax_rate: parseFloat(e.target.value) || 0
                }))}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setShowSettings(false)}
              className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Render payment modal
  const renderPaymentModal = () => {
    if (!showPaymentModal || !selectedRecord) return null

    const handleSubmitPayment = async (e) => {
      e.preventDefault()
      try {
        setSubmittingPayment(true)
        await handleMarkAsPaid(
          selectedRecord._id, 
          paymentForm.payment_method, 
          paymentForm.payment_reference,
          paymentForm.notes
        )
        setShowPaymentModal(false)
        setSelectedRecord(null)
        setPaymentForm({ payment_method: 'bank_transfer', payment_reference: '', notes: '' })
      } catch (error) {
        console.error('Payment submission error:', error)
      } finally {
        setSubmittingPayment(false)
      }
    }

    return createPortal(
      <div className="fixed inset-0 z-[9999] overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setShowPaymentModal(false)
              setSelectedRecord(null)
            }}
          />
          <div className="relative w-full max-w-md transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all z-[10000]">
            <div className="flex items-center justify-between p-6 border-b border-[#444444]/50">
              <h2 className="text-xl font-bold text-white">Mark as Paid</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedRecord(null)
                }}
                className="w-8 h-8 rounded-lg bg-[#444444]/50 hover:bg-[#FF8C42]/20 flex items-center justify-center transition-colors duration-200"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-[#FF8C42]" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-[#1A1A1A] rounded-lg border border-[#444444]/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Barber:</span>
                <span className="text-sm font-medium text-white">{selectedRecord?.barber_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Net Pay:</span>
                <span className="text-lg font-bold text-[#FF8C42]">₱{selectedRecord?.net_pay?.toLocaleString() || '0'}</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Method
              </label>
              <select
                value={paymentForm.payment_method}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_method: e.target.value }))}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                required
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="digital_wallet">Digital Wallet</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Payment Reference
              </label>
              <input
                type="text"
                value={paymentForm.payment_reference}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_reference: e.target.value }))}
                placeholder="Transaction ID, check number, etc."
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about the payment..."
                rows={3}
                className="w-full bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowPaymentModal(false)
                  setSelectedRecord(null)
                }}
                className="flex-1 px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200"
                disabled={submittingPayment}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingPayment}
                className="flex-1 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingPayment ? 'Processing...' : 'Mark as Paid'}
              </button>
            </div>
              </form>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Render overview
  const renderOverview = () => {

    // Show setup prompt if no payroll settings configured
    if (payrollSettingsData === undefined) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading payroll settings...</p>
        </div>
      )
    }

    if (payrollSettingsData === null || !payrollSettingsData) {
      return (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-[#FF8C42]/20 rounded-full">
                <Settings className="h-8 w-8 text-[#FF8C42]" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Payroll Setup Required</h3>
            <p className="text-gray-300 mb-6 max-w-md mx-auto">
              Configure your payroll settings to start managing barber commissions and processing payments.
            </p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-6 py-3 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 font-medium"
            >
              Configure Payroll Settings
            </button>
          </div>

          {/* Quick Setup Guide */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <h4 className="text-lg font-semibold text-white mb-4">Setup Guide</h4>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <span className="text-gray-300">Set default commission rate (recommended: 10%)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-gray-300">Choose payout frequency (weekly, bi-weekly, or monthly)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-[#FF8C42] text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <span className="text-gray-300">Configure tax rate if applicable</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-gray-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                <span className="text-gray-400">Generate your first payroll period</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // Only show loading if queries are actually undefined (still loading)
    if (payrollSummary === undefined || barbers === undefined || payrollSettingsData === undefined) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading payroll data...</p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-[#FF8C42]/20 rounded-lg">
                <Users className="h-6 w-6 text-[#FF8C42]" />
              </div>
              <TrendingUp className="h-4 w-4 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">Active Barbers</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{overviewStats.totalBarbers}</p>
              <p className="text-xs text-green-400">Ready for payroll</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <TrendingUp className={`h-4 w-4 ${overviewStats.payoutTrend === 'up' ? 'text-green-400' : 'text-red-400'}`} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">Current Period Payout</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{formatCurrency(overviewStats.currentPayout)}</p>
              <p className={`text-xs ${overviewStats.payoutTrend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {overviewStats.payoutTrend === 'up' ? '+' : '-'}{overviewStats.payoutChange.toFixed(1)}% from last period
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <AlertCircle className="h-4 w-4 text-yellow-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">Pending Payments</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{overviewStats.pendingPayments}</p>
              <p className="text-xs text-yellow-400">Require processing</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calculator className="h-6 w-6 text-blue-400" />
              </div>
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-300">Average Commission</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{formatCurrency(overviewStats.averageCommission)}</p>
              <p className="text-xs text-gray-400">Per barber</p>
            </div>
          </div>
        </div>

        {/* Recent Payroll Periods */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Recent Payroll Periods</h3>
              <p className="text-sm text-gray-300">Latest payroll periods and their status</p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleOpenPeriodModal}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Period</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#444444]/50">
                  <th className="text-left py-4 px-4 font-medium text-gray-300">Period</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-300">Type</th>
                  <th className="text-left py-4 px-4 font-medium text-gray-300">Status</th>
                  <th className="text-right py-4 px-4 font-medium text-gray-300">Total Payout</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-300">Barbers</th>
                  <th className="text-center py-4 px-4 font-medium text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(payrollSummary) ? payrollSummary : []).map((period) => (
                  <tr key={period._id} className="border-b border-[#444444]/20 hover:bg-[#1A1A1A]/30 transition-colors">
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-white font-medium">
                          {formatDate(period.period_start)} - {formatDate(period.period_end)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Created {formatDate(period.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-300">{formatPeriodType(period.period_type)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        period.status === 'paid' 
                          ? 'bg-green-500/20 text-green-400'
                          : period.status === 'calculated'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}>
                        {period.status === 'paid' ? 'Paid' : period.status === 'calculated' ? 'Calculated' : 'Draft'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="text-[#FF8C42] font-bold">{formatCurrency(period.total_commissions)}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="text-sm">
                        <span className="text-green-400">{period.paid_records || 0}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-yellow-400">{period.pending_records || 0}</span>
                        <span className="text-gray-400"> / </span>
                        <span className="text-white">{period.total_barbers || 0}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => {
                          setSelectedPeriod(period)
                          setActiveView('period')
                        }}
                        className="px-3 py-1 bg-[#FF8C42] text-white rounded text-xs hover:bg-[#FF8C42]/90 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  // Render period details
  const renderPeriodDetails = () => {
    if (!selectedPeriod) return null

    return (
      <div className="space-y-6">
        {/* Period Header */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-white">
                Payroll Period: {formatDate(selectedPeriod.period_start)} - {formatDate(selectedPeriod.period_end)}
              </h3>
              <p className="text-sm text-gray-300">
                {formatPeriodType(selectedPeriod.period_type)} payroll • {selectedPeriod.status === 'paid' ? 'Completed' : selectedPeriod.status === 'calculated' ? 'Ready for Payment' : 'Draft'}
              </p>
            </div>
            <div className="flex space-x-2">
              {selectedPeriod.status === 'draft' && (
                <button
                  onClick={() => handleCalculatePayroll(selectedPeriod._id)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Calculator className="h-4 w-4" />
                  <span>Calculate Payroll</span>
                </button>
              )}
              <button
                onClick={() => setActiveView('overview')}
                className="px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
              >
                Back to Overview
              </button>
            </div>
          </div>

          {/* Period Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-4 w-4 text-[#FF8C42]" />
                <span className="text-sm text-gray-300">Total Earnings</span>
              </div>
              <p className="text-lg font-bold text-white">{formatCurrency(selectedPeriod.total_earnings)}</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Percent className="h-4 w-4 text-green-400" />
                <span className="text-sm text-gray-300">Commissions</span>
              </div>
              <p className="text-lg font-bold text-white">{formatCurrency(selectedPeriod.total_commissions)}</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Calculator className="h-4 w-4 text-red-400" />
                <span className="text-sm text-gray-300">Deductions</span>
              </div>
              <p className="text-lg font-bold text-white">{formatCurrency(selectedPeriod.total_deductions)}</p>
            </div>
            <div className="bg-[#1A1A1A] rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-gray-300">Barbers</span>
              </div>
              <p className="text-lg font-bold text-white">{(Array.isArray(currentPeriodRecords) ? currentPeriodRecords : []).length}</p>
            </div>
          </div>
        </div>

        {/* Payroll Records */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Barber Payroll Records</h3>
              <p className="text-sm text-gray-300">Individual commission calculations and payment status</p>
            </div>
          </div>

          <div className="space-y-4">
            {(Array.isArray(currentPeriodRecords) ? currentPeriodRecords : []).map((record) => (
              <div key={record._id} className="bg-[#1A1A1A] rounded-lg border border-[#333333] overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h4 className="text-white font-medium">{record.barber_name}</h4>
                        <p className="text-sm text-gray-400">
                          {record.total_services} services • {record.total_transactions} POS transactions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#FF8C42]">{formatCurrency(record.net_pay)}</p>
                        <p className="text-sm text-gray-400">Net Pay</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          record.status === 'paid' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {record.status === 'paid' ? 'Paid' : 'Pending'}
                        </span>
                        <button
                          onClick={() => toggleRecordExpansion(record._id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {expandedRecords.has(record._id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {record.status === 'calculated' && (
                          <button
                            onClick={() => {
                              setSelectedRecord(record)
                              setPaymentForm({ payment_method: 'bank_transfer', payment_reference: '', notes: '' })
                              setShowPaymentModal(true)
                            }}
                            className="px-3 py-1 bg-[#FF8C42] text-white rounded text-xs hover:bg-[#FF8C42]/90 transition-colors"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedRecords.has(record._id) && (
                    <div className="mt-4 pt-4 border-t border-[#333333]">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Service Earnings</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Services:</span>
                              <span className="text-white">{record.total_services}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Revenue:</span>
                              <span className="text-white">{formatCurrency(record.total_service_revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Commission ({record.commission_rate}%):</span>
                              <span className="text-[#FF8C42]">{formatCurrency(record.gross_commission - record.transaction_commission)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Transaction Earnings</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Transactions:</span>
                              <span className="text-white">{record.total_transactions}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Revenue:</span>
                              <span className="text-white">{formatCurrency(record.total_transaction_revenue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Commission:</span>
                              <span className="text-[#FF8C42]">{formatCurrency(record.transaction_commission)}</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium text-gray-300 mb-2">Summary</h5>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Gross Commission:</span>
                              <span className="text-white">{formatCurrency(record.gross_commission)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Tax Deduction:</span>
                              <span className="text-red-400">-{formatCurrency(record.tax_deduction)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Other Deductions:</span>
                              <span className="text-red-400">-{formatCurrency(record.other_deductions)}</span>
                            </div>
                            <div className="flex justify-between font-medium pt-1 border-t border-[#333333]">
                              <span className="text-white">Net Pay:</span>
                              <span className="text-[#FF8C42]">{formatCurrency(record.net_pay)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {record.status === 'paid' && record.paid_at && (
                        <div className="mt-4 pt-3 border-t border-[#333333] text-sm">
                          <div className="flex items-center space-x-4 text-gray-400">
                            <span>Paid on {formatDate(record.paid_at)}</span>
                            {record.payment_method && <span>via {record.payment_method}</span>}
                            {record.payment_reference && <span>Ref: {record.payment_reference}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-white">Payroll Management</h2>
          <p className="text-gray-300 mt-1">Manage barber commissions and payroll processing</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-[#444444]/50 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#2A2A2A] transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#FF8C42]/90 transition-all duration-200 text-sm">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>


      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* View Navigation */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveView('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeView === 'overview'
                ? 'bg-[#FF8C42] text-white'
                : 'text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
            }`}
          >
            Overview
          </button>
          {selectedPeriod && (
            <button
              onClick={() => setActiveView('period')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeView === 'period'
                  ? 'bg-[#FF8C42] text-white'
                  : 'text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              Period Details
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {activeView === 'overview' ? renderOverview() : renderPeriodDetails()}

      {/* Modals */}
      {renderPeriodModal()}
      {renderSettingsModal()}
      {renderPaymentModal()}
    </div>
  )
}

export default PayrollManagement