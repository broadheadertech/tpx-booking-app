import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import {
  Building,
  Percent,
  DollarSign,
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Settings,
  Trash2,
  LayoutDashboard,
  Clock,
  AlertTriangle,
  RefreshCw,
  Mail,
  Filter,
  TrendingUp,
  Zap,
  Receipt,
  CreditCard,
  X,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { formatErrorForDisplay } from '../../utils/errorHandler';
import { useAppModal } from '../../context/AppModalContext';
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { royaltySteps } from '../../config/walkthroughSteps'

export default function RoyaltyManagement() {
  const { user } = useCurrentUser();
  const { showConfirm, showPrompt } = useAppModal();
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    royalty_type: 'percentage',
    rate: '',
    billing_cycle: 'monthly',
    billing_day: 1,
    grace_period_days: 7,
    late_fee_rate: 0,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [paymentModal, setPaymentModal] = useState({ open: false, payment: null });
  const [paymentFormData, setPaymentFormData] = useState({
    paid_amount: '',
    payment_method: 'bank_transfer',
    payment_reference: '',
    notes: '',
  });

  // Queries
  const branches = useQuery(api.services.branches.getAllBranches) || [];
  const allRoyaltyConfigs = useQuery(api.services.royalty.getAllRoyaltyConfigs) || [];
  const allRoyaltyPayments = useQuery(api.services.royalty.getAllRoyaltyPayments, {}) || [];
  const pendingPayments = useQuery(api.services.royalty.getPendingRoyaltyPayments, {}) || [];
  const selectedBranchConfig = useQuery(
    api.services.royalty.getRoyaltyConfig,
    selectedBranchId ? { branch_id: selectedBranchId } : 'skip'
  );

  // Mutations & Actions
  const setRoyaltyConfig = useMutation(api.services.royalty.setRoyaltyConfig);
  const deactivateConfig = useMutation(api.services.royalty.deactivateRoyaltyConfig);
  const deleteConfig = useMutation(api.services.royalty.deleteRoyaltyConfig);
  const generateAllPayments = useMutation(api.services.royalty.generateAllRoyaltyPayments);
  const updateOverduePayments = useMutation(api.services.royalty.updateOverduePayments);
  const sendRoyaltyEmail = useAction(api.services.royalty.sendRoyaltyDueEmail);
  const markAsPaid = useMutation(api.services.royalty.markRoyaltyAsPaid);
  const waivePayment = useMutation(api.services.royalty.waiveRoyaltyPayment);
  const sendReceiptEmail = useAction(api.services.royalty.sendReceiptEmail);
  const cleanOrphanedData = useMutation(api.services.royalty.cleanOrphanedRoyaltyData);

  // Filter branches by search
  const filteredBranches = branches.filter(
    (branch) =>
      branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.branch_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter payments by status
  const filteredPayments = statusFilter === 'all'
    ? allRoyaltyPayments
    : allRoyaltyPayments.filter(p => p.status === statusFilter);

  // Load config when branch is selected
  React.useEffect(() => {
    if (selectedBranchConfig) {
      setFormData({
        royalty_type: selectedBranchConfig.royalty_type,
        rate: selectedBranchConfig.rate.toString(),
        billing_cycle: selectedBranchConfig.billing_cycle,
        billing_day: selectedBranchConfig.billing_day || 1,
        grace_period_days: selectedBranchConfig.grace_period_days || 7,
        late_fee_rate: selectedBranchConfig.late_fee_rate || 0,
        notes: selectedBranchConfig.notes || '',
      });
    } else if (selectedBranchId) {
      setFormData({
        royalty_type: 'percentage',
        rate: '',
        billing_cycle: 'monthly',
        billing_day: 1,
        grace_period_days: 7,
        late_fee_rate: 0,
        notes: '',
      });
    }
  }, [selectedBranchConfig, selectedBranchId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setError('Please select a branch');
      return;
    }
    if (!formData.rate || parseFloat(formData.rate) <= 0) {
      setError('Please enter a valid rate');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await setRoyaltyConfig({
        branch_id: selectedBranchId,
        royalty_type: formData.royalty_type,
        rate: parseFloat(formData.rate),
        billing_cycle: formData.billing_cycle,
        billing_day: parseInt(formData.billing_day),
        grace_period_days: parseInt(formData.grace_period_days),
        late_fee_rate: parseFloat(formData.late_fee_rate) || 0,
        notes: formData.notes || undefined,
        created_by: user._id,
      });
      setSuccess('Royalty configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving royalty config:', err);
      const formattedError = formatErrorForDisplay(err);
      setError(formattedError.details || formattedError.message || 'Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (branchId) => {
    const confirmed = await showConfirm({ title: 'Deactivate Config', message: 'Are you sure you want to deactivate this royalty configuration?', type: 'warning' });
    if (!confirmed) return;

    try {
      await deactivateConfig({ branch_id: branchId });
      setSuccess('Configuration deactivated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to deactivate configuration');
    }
  };

  const handleDelete = async (configId) => {
    const confirmed = await showConfirm({ title: 'Delete Config', message: 'Are you sure you want to delete this royalty configuration? This cannot be undone.', type: 'warning' });
    if (!confirmed) return;

    try {
      await deleteConfig({ config_id: configId });
      setSuccess('Configuration deleted');
      setSelectedBranchId('');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete configuration');
    }
  };

  const handleGenerateRoyalties = async () => {
    const confirmed = await showConfirm({ title: 'Generate Payments', message: 'Generate royalty payments for all configured branches for the previous billing period?', type: 'warning' });
    if (!confirmed) return;

    setLoading(true);
    setError('');
    try {
      const result = await generateAllPayments({ created_by: user._id });
      setSuccess(`Generated ${result.created} royalty payments. ${result.skipped} skipped (already exist).`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error generating royalties:', err);
      setError('Failed to generate royalty payments');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOverdue = async () => {
    setLoading(true);
    try {
      const result = await updateOverduePayments({});
      if (result.updatedCount > 0) {
        setSuccess(`Updated ${result.updatedCount} payment(s) to overdue status with late fees.`);
      } else {
        setSuccess('No payments need to be updated.');
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to update overdue payments');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async (paymentId) => {
    setLoading(true);
    try {
      const result = await sendRoyaltyEmail({ payment_id: paymentId });
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error sending notification:', err);
      setError('Failed to send notification');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (payment) => {
    setPaymentFormData({
      paid_amount: payment.total_due.toString(),
      payment_method: 'bank_transfer',
      payment_reference: '',
      notes: '',
    });
    setPaymentModal({ open: true, payment });
  };

  const handleClosePaymentModal = () => {
    setPaymentModal({ open: false, payment: null });
    setPaymentFormData({
      paid_amount: '',
      payment_method: 'bank_transfer',
      payment_reference: '',
      notes: '',
    });
  };

  const handleMarkAsPaid = async () => {
    if (!paymentModal.payment) return;

    const paidAmount = parseFloat(paymentFormData.paid_amount);
    if (isNaN(paidAmount) || paidAmount <= 0) {
      setError('Please enter a valid payment amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await markAsPaid({
        payment_id: paymentModal.payment._id,
        paid_amount: paidAmount,
        payment_method: paymentFormData.payment_method,
        payment_reference: paymentFormData.payment_reference || undefined,
        notes: paymentFormData.notes || undefined,
        issued_by: user._id,
      });

      if (result.success) {
        setSuccess(`${result.message} Sending receipt email...`);
        handleClosePaymentModal();

        // Send receipt email
        try {
          const emailResult = await sendReceiptEmail({ receipt_id: result.receiptId });
          if (emailResult.success) {
            setSuccess(`Payment marked as paid. Receipt ${result.receiptNumber} sent to branch admin.`);
          } else {
            setSuccess(`Payment marked as paid. Receipt ${result.receiptNumber} generated. (Email may have failed)`);
          }
        } catch (emailErr) {
          console.error('Error sending receipt email:', emailErr);
          setSuccess(`Payment marked as paid. Receipt ${result.receiptNumber} generated.`);
        }
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Error marking payment as paid:', err);
      setError('Failed to mark payment as paid');
    } finally {
      setLoading(false);
    }
  };

  const handleWaivePayment = async (paymentId, branchName) => {
    const reason = await showPrompt({ title: 'Waive Payment', message: `Enter reason for waiving royalty payment for ${branchName}:`, placeholder: 'Type reason here...' });
    if (!reason) return;

    setLoading(true);
    try {
      const result = await waivePayment({
        payment_id: paymentId,
        notes: reason,
        waived_by: user._id,
      });

      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.message);
      }
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error waiving payment:', err);
      setError('Failed to waive payment');
    } finally {
      setLoading(false);
    }
  };

  // Dashboard Stats
  const dashboardStats = {
    totalPayments: allRoyaltyPayments.length,
    duePayments: allRoyaltyPayments.filter(p => p.status === 'due').length,
    overduePayments: allRoyaltyPayments.filter(p => p.status === 'overdue').length,
    paidPayments: allRoyaltyPayments.filter(p => p.status === 'paid').length,
    totalDueAmount: allRoyaltyPayments
      .filter(p => p.status === 'due' || p.status === 'overdue')
      .reduce((sum, p) => sum + p.total_due, 0),
    totalCollected: allRoyaltyPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paid_amount || p.amount), 0),
  };

  // Config Stats
  const configStats = {
    totalConfigs: allRoyaltyConfigs.length,
    activeConfigs: allRoyaltyConfigs.filter((c) => c.is_active).length,
    percentageType: allRoyaltyConfigs.filter((c) => c.royalty_type === 'percentage').length,
    fixedType: allRoyaltyConfigs.filter((c) => c.royalty_type === 'fixed').length,
  };

  // Status badge helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
            <CheckCircle className="w-3 h-3" /> Paid
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" /> Due
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3" /> Overdue
          </span>
        );
      case 'waived':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
            <XCircle className="w-3 h-3" /> Waived
          </span>
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="royalty-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Royalty Management</h2>
            <p className="text-gray-400 mt-1">Configure and track royalty payments from franchises</p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div data-tour="royalty-tabs" className="flex gap-2 border-b border-[#333]">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'dashboard'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
            activeTab === 'config'
              ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          Configuration
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {success && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-300">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Dashboard Stats */}
          <div data-tour="royalty-stats" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Total</p>
                  <p className="text-xl font-bold text-white">{dashboardStats.totalPayments}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Due</p>
                  <p className="text-xl font-bold text-yellow-400">{dashboardStats.duePayments}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Overdue</p>
                  <p className="text-xl font-bold text-red-400">{dashboardStats.overduePayments}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Paid</p>
                  <p className="text-xl font-bold text-green-400">{dashboardStats.paidPayments}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Pending</p>
                  <p className="text-lg font-bold text-[var(--color-primary)]">{formatCurrency(dashboardStats.totalDueAmount)}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Collected</p>
                  <p className="text-lg font-bold text-emerald-400">{formatCurrency(dashboardStats.totalCollected)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl border border-[#333]">
            <button
              onClick={handleGenerateRoyalties}
              disabled={loading || allRoyaltyConfigs.filter(c => c.is_active).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4" />
              Generate Royalties
            </button>
            <button
              onClick={handleUpdateOverdue}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-medium rounded-lg transition-colors border border-red-500/30"
            >
              <RefreshCw className="w-4 h-4" />
              Update Overdue
            </button>

            <div className="flex-1" />

            {/* Status Filters */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1">
                {['all', 'due', 'overdue', 'paid', 'waived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors capitalize ${
                      statusFilter === status
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[#333] text-gray-400 hover:text-white'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Payments List */}
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl border border-[#333] overflow-hidden">
            <div className="p-4 border-b border-[#333]">
              <h3 className="text-lg font-semibold text-white">Royalty Payments</h3>
            </div>

            {filteredPayments.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No royalty payments found</p>
                <p className="text-sm mt-1">
                  {statusFilter !== 'all' ? 'Try a different filter or ' : ''}
                  Generate royalties to create payment records
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#333]">
                {filteredPayments.map((payment) => (
                  <div
                    key={payment._id}
                    className={`p-4 hover:bg-[#333]/30 transition-colors ${
                      payment.status === 'overdue' ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <Building className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <span className="font-medium text-white truncate">
                            {payment.branch_name}
                          </span>
                          <span className="text-xs text-gray-500">({payment.branch_code})</span>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{payment.period_label}</span>
                          <span>•</span>
                          <span>Due: {formatDate(payment.due_date)}</span>
                          {payment.late_fee > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-red-400">
                                +{formatCurrency(payment.late_fee)} late fee
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-white">
                          {formatCurrency(payment.total_due)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.royalty_type === 'percentage'
                            ? `${payment.rate}% of ${formatCurrency(payment.gross_revenue)}`
                            : 'Fixed amount'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(payment.status === 'due' || payment.status === 'overdue') && (
                          <>
                            <button
                              onClick={() => handleOpenPaymentModal(payment)}
                              disabled={loading}
                              title="Mark as Paid"
                              className="flex items-center gap-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors border border-green-500/30"
                            >
                              <Receipt className="w-4 h-4" />
                              <span className="hidden sm:inline text-sm">Mark Paid</span>
                            </button>
                            <button
                              onClick={() => handleSendNotification(payment._id)}
                              disabled={loading}
                              title="Send reminder email"
                              className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleWaivePayment(payment._id, payment.branch_name)}
                              disabled={loading}
                              title="Waive payment"
                              className="p-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {payment.status === 'paid' && payment.receipt_id && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs text-green-400">
                            <FileText className="w-3 h-3" />
                            Receipt Issued
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          {/* Config Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Building className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Configs</p>
                  <p className="text-xl font-bold text-white">{configStats.totalConfigs}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Active</p>
                  <p className="text-xl font-bold text-white">{configStats.activeConfigs}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Percent className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Percentage Type</p>
                  <p className="text-xl font-bold text-white">{configStats.percentageType}</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-4 border border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/20 rounded-lg">
                  <DollarSign className="w-5 h-5 text-[var(--color-primary)]" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Fixed Amount Type</p>
                  <p className="text-xl font-bold text-white">{configStats.fixedType}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Branch Selection & Configuration Form */}
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-6 border border-[#333]">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-[var(--color-primary)]" />
                Configure Royalty
              </h3>

              {/* Branch Search & Select */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Branch</label>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search branches..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="">-- Select a branch --</option>
                  {filteredBranches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name} ({branch.branch_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Configuration Form */}
              {selectedBranchId && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Royalty Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Royalty Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="royalty_type"
                          value="percentage"
                          checked={formData.royalty_type === 'percentage'}
                          onChange={(e) => setFormData({ ...formData, royalty_type: e.target.value })}
                          className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <span className="text-white">Percentage of Revenue</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="royalty_type"
                          value="fixed"
                          checked={formData.royalty_type === 'fixed'}
                          onChange={(e) => setFormData({ ...formData, royalty_type: e.target.value })}
                          className="text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <span className="text-white">Fixed Amount</span>
                      </label>
                    </div>
                  </div>

                  {/* Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {formData.royalty_type === 'percentage' ? 'Percentage Rate (%)' : 'Fixed Amount (PHP)'}
                    </label>
                    <div className="relative">
                      {formData.royalty_type === 'percentage' ? (
                        <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                      ) : (
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                      )}
                      <input
                        type="number"
                        step={formData.royalty_type === 'percentage' ? '0.1' : '100'}
                        min="0"
                        value={formData.rate}
                        onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                        placeholder={formData.royalty_type === 'percentage' ? 'e.g., 10' : 'e.g., 20000'}
                        className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* Billing Cycle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Billing Cycle</label>
                    <select
                      value={formData.billing_cycle}
                      onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                    </select>
                  </div>

                  {/* Billing Day & Grace Period */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Billing Day</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={formData.billing_day}
                        onChange={(e) => setFormData({ ...formData, billing_day: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Grace Period (Days)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={formData.grace_period_days}
                        onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                        className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </div>
                  </div>

                  {/* Late Fee Rate */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Late Fee Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="50"
                      value={formData.late_fee_rate}
                      onChange={(e) => setFormData({ ...formData, late_fee_rate: e.target.value })}
                      className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Notes (Optional)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={2}
                      className="w-full px-4 py-2 bg-[#1A1A1A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)] text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Save Configuration
                      </>
                    )}
                  </button>

                  {/* Delete Button */}
                  {selectedBranchConfig && (
                    <button
                      type="button"
                      onClick={() => handleDelete(selectedBranchConfig._id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold rounded-lg transition-colors border border-red-500/50"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete Configuration
                    </button>
                  )}
                </form>
              )}

              {!selectedBranchId && (
                <div className="text-center py-8 text-gray-500">
                  <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Select a branch to configure royalty settings</p>
                </div>
              )}
            </div>

            {/* Existing Configurations List */}
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#1E1E1E] rounded-xl p-6 border border-[#333]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-400" />
                  Configured Branches
                </h3>
                {allRoyaltyConfigs.some(c => c.branch_name === 'Unknown Branch') && (
                  <button
                    onClick={async () => {
                      try {
                        const result = await cleanOrphanedData();
                        setSuccess(`Cleaned ${result.deletedConfigs} orphaned configs and ${result.deletedPayments} orphaned payments`);
                        setTimeout(() => setSuccess(''), 3000);
                      } catch (err) {
                        setError('Failed to clean orphaned data');
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clean Orphaned
                  </button>
                )}
              </div>

              {allRoyaltyConfigs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No royalty configurations yet</p>
                  <p className="text-sm mt-1">Select a branch to set up royalty</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {allRoyaltyConfigs.map((config) => (
                    <div
                      key={config._id}
                      onClick={() => setSelectedBranchId(config.branch_id)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedBranchId === config.branch_id
                          ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]'
                          : 'bg-[#1A1A1A] border-[#444] hover:border-[#555]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-white">{config.branch_name}</span>
                          <span className="text-xs text-gray-500">({config.branch_code})</span>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            config.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {config.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          {config.royalty_type === 'percentage' ? (
                            <>
                              <Percent className="w-4 h-4 text-purple-400" />
                              <span className="text-gray-300">{config.rate}%</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[var(--color-primary)]">₱</span>
                              <span className="text-gray-300">{config.rate.toLocaleString()}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-300 capitalize">{config.billing_cycle}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mark as Paid Modal */}
      {paymentModal.open && paymentModal.payment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333] w-full max-w-md mx-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#333]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <Receipt className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Mark as Paid</h3>
                  <p className="text-sm text-gray-400">{paymentModal.payment.branch_name}</p>
                </div>
              </div>
              <button
                onClick={handleClosePaymentModal}
                className="p-2 hover:bg-[#333] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4">
              {/* Payment Summary */}
              <div className="bg-[#2A2A2A] rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Period</span>
                  <span className="text-white font-medium">{paymentModal.payment.period_label}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-400">Amount Due</span>
                  <span className="text-[var(--color-primary)] font-bold">{formatCurrency(paymentModal.payment.total_due)}</span>
                </div>
                {paymentModal.payment.late_fee > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Includes late fee</span>
                    <span className="text-red-400">+{formatCurrency(paymentModal.payment.late_fee)}</span>
                  </div>
                )}
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount Received (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentFormData.paid_amount}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paid_amount: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter amount received"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="gcash">GCash</option>
                  <option value="maya">Maya</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Payment Reference */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reference Number (Optional)
                </label>
                <input
                  type="text"
                  value={paymentFormData.payment_reference}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_reference: e.target.value })}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Bank ref, check number, etc."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-[#2A2A2A] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Info Box */}
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Receipt className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-green-300">
                    An official receipt will be automatically generated and emailed to the branch admin.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-4 border-t border-[#333]">
              <button
                onClick={handleClosePaymentModal}
                className="flex-1 px-4 py-2 bg-[#333] hover:bg-[#444] text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAsPaid}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <WalkthroughOverlay steps={royaltySteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
      )}
    </div>
  );
}
