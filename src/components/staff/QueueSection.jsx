import React, { useState } from 'react'
import { Clock, User, Phone, MoreVertical, CheckCircle, Users, X } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'
import WelcomeBackCard from './WelcomeBackCard'
import ServiceHistoryCard from './ServiceHistoryCard'
import POSWalletPayment from './POSWalletPayment'
import WalletPaymentConfirmDialog from './WalletPaymentConfirmDialog'
import ComboPaymentDialog from './ComboPaymentDialog'

const QueueSection = () => {
  const { showAlert } = useAppModal()
  const { user } = useCurrentUser()
  const branchId = user?.branch_id
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  // Story 24-2: Wallet payment confirmation dialog state
  const [showWalletConfirm, setShowWalletConfirm] = useState(false)
  const [walletPaymentData, setWalletPaymentData] = useState(null)
  // Story 24-3: Combo payment dialog state
  const [showComboPayment, setShowComboPayment] = useState(false)
  const [comboPaymentData, setComboPaymentData] = useState(null)

  // Fetch main queue data from backend
  const mainQueueData = useQuery(
    api.services.mainQueue.getMainQueue,
    branchId ? { branch_id: branchId } : 'skip'
  )

  // Story 24-2: Fetch wallet balance for selected customer (for confirmation dialog)
  const selectedCustomerWallet = useQuery(
    api.services.wallet.getCustomerWalletBalance,
    selectedCustomer?.userId ? { user_id: selectedCustomer.userId } : 'skip'
  )

  // Loading state
  const isLoading = mainQueueData === undefined

  // Sample barbers data for fallback (when no data or for development)
  const sampleBarbers = [
    { id: 1, name: 'Marcus Johnson', avatar: 'MJ', color: 'bg-blue-500', status: 'available' },
    { id: 2, name: 'Sarah Williams', avatar: 'SW', color: 'bg-purple-500', status: 'busy' },
    { id: 3, name: 'David Chen', avatar: 'DC', color: 'bg-green-500', status: 'available' },
    { id: 4, name: 'Emma Davis', avatar: 'ED', color: 'bg-pink-500', status: 'busy' },
  ]

  // Use real data if available, otherwise use sample data
  const barbers = mainQueueData?.queueByBarber?.map(bq => ({
    id: bq.barberId,
    name: bq.barberName,
    avatar: bq.barberAvatar,
    color: bq.barberColor,
    status: bq.barberStatus,
  })) || sampleBarbers

  const allCustomers = mainQueueData?.allCustomers || []
  const stats = mainQueueData?.stats || {
    totalCustomers: 0,
    totalSignedIn: 0,
    totalWalkIns: 0,
    active: 0,
    waiting: 0,
    totalBarbers: 0,
    availableBarbers: 0,
  }

  const getCustomersByBarber = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.customers || []
    }
    return []
  }

  const getBarberStats = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.stats || { total: 0, active: 0, waiting: 0, signedIn: 0, walkIns: 0 }
    }
    return { total: 0, active: 0, waiting: 0, signedIn: 0, walkIns: 0 }
  }

  const getBarberConflicts = (barberId) => {
    if (mainQueueData?.queueByBarber) {
      const barberQueue = mainQueueData.queueByBarber.find(bq => bq.barberId === barberId)
      return barberQueue?.conflicts || []
    }
    return []
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
      case 'confirmed':
      case 'booked':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-blue-400 bg-blue-400/20">
          Active
        </span>
      case 'waiting':
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-yellow-400 bg-yellow-400/20">
          Waiting
        </span>
      case 'completed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-green-400 bg-green-400/20">
          Completed
        </span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-400/20">
          {status}
        </span>
    }
  }

  const getQueueNumberColor = (num) => {
    if (num === null || num === undefined) return 'bg-gray-500'
    if (num <= 3) return 'bg-green-500'
    if (num <= 7) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getCustomerTypeLabel = (customer) => {
    if (customer.isWalkIn) {
      return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium text-orange-400 bg-orange-400/20 border border-orange-400/30">
        Walk-in
      </span>
    }
    return null
  }

  /**
   * Get VIP tier badge for customer
   * Shows tier icon and name with appropriate styling
   */
  const getVipBadge = (customer) => {
    // For walk-ins without accounts, show "New" badge
    if (!customer.hasAccount || !customer.tierInfo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-400 bg-gray-400/20">
          New
        </span>
      )
    }

    const { name, icon, color } = customer.tierInfo

    // Special styling for Gold and Platinum
    const isVip = name === 'Gold' || name === 'Platinum'

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isVip ? 'ring-1' : ''
        }`}
        style={{
          color: color,
          backgroundColor: `${color}20`,
          borderColor: isVip ? color : 'transparent',
          boxShadow: isVip ? `0 0 6px ${color}40` : 'none',
        }}
      >
        <span>{icon}</span>
        <span>{name}</span>
      </span>
    )
  }

  /**
   * Check if customer is VIP (Gold or Platinum)
   */
  const isVipCustomer = (customer) => {
    return customer.tierInfo && (customer.tierInfo.name === 'Gold' || customer.tierInfo.name === 'Platinum')
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    try {
      return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
              <User className="h-5 w-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Live Queue</h3>
              <p className="text-sm text-gray-400">Real-time queue management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 bg-blue-400/20 border border-blue-400/30 px-3 py-1.5 rounded-lg">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-blue-400 text-sm font-medium">Live</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Queue</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalCustomers}</p>
            </div>
            <Users className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-blue-400">{stats.active}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-blue-400 opacity-30" />
          </div>
        </div>
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Waiting</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.waiting}</p>
            </div>
            <Clock className="h-6 w-6 text-yellow-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* Kanban Board - Barber Queues */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="bg-[#0A0A0A] px-6 py-3 border-b border-[#444444]/30 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">Barber Queues</h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-400">Signed-in: {stats.totalSignedIn}</span>
            <span className="text-gray-400">Walk-ins: {stats.totalWalkIns}</span>
          </div>
        </div>

        <div className="p-4 overflow-x-auto">
          <div className="flex space-x-4 min-w-max">
            {barbers.map((barber) => {
              const customers = getCustomersByBarber(barber.id)
              const barberStats = getBarberStats(barber.id)
              const conflicts = getBarberConflicts(barber.id)

              return (
                <div key={barber.id} className="flex-shrink-0 w-72">
                  {/* Barber Header */}
                  <div className={`${barber.color} rounded-t-lg px-4 py-3 relative`}>
                    {conflicts.length > 0 && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
                      </div>
                    )}
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold">
                        {barber.avatar}
                      </div>
                      <div>
                        <h4 className="text-white font-medium">{barber.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`h-2 w-2 rounded-full ${barber.status === 'available' ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
                          <span className="text-white/90 text-xs capitalize">{barber.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-white/90 text-xs">
                      <span>{barberStats.total} customers</span>
                      <span>{barberStats.active} active</span>
                    </div>
                    {(barberStats.signedIn > 0 || barberStats.walkIns > 0) && (
                      <div className="mt-2 flex items-center space-x-3 text-xs text-white/80">
                        {barberStats.signedIn > 0 && <span>♦ {barberStats.signedIn} signed-in</span>}
                        {barberStats.walkIns > 0 && <span>• {barberStats.walkIns} walk-ins</span>}
                      </div>
                    )}
                  </div>

                  {/* Customer Cards */}
                  <div className="bg-[#252525] rounded-b-lg p-3 space-y-2 min-h-[180px]">
                    {customers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => customer.hasAccount && setSelectedCustomer(customer)}
                        className={`bg-[#1A1A1A] rounded-lg p-4 border ${
                          customer.hasTimeConflict
                            ? 'border-red-500/50'
                            : isVipCustomer(customer)
                            ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                            : 'border-[#444444]/30'
                        } hover:bg-[#333333]/50 transition-all ${
                          isVipCustomer(customer) ? 'bg-gradient-to-br from-amber-500/5 to-transparent' : ''
                        } ${customer.hasAccount ? 'cursor-pointer' : ''}`}
                      >
                        {customer.hasTimeConflict && (
                          <div className="mb-2 text-xs text-red-400 font-medium">
                            ⚠️ Time conflict: {formatTime(customer.time)}
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            {customer.queueNumber && (
                              <div className={`flex-shrink-0 h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center ${getQueueNumberColor(customer.queueNumber).replace('bg-', 'bg-')}/20`}>
                                <span className="text-white font-bold text-sm">{customer.queueNumber}</span>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="text-sm font-medium text-white truncate">{customer.name}</h5>
                                {getVipBadge(customer)}
                                {getCustomerTypeLabel(customer)}
                              </div>
                              <p className="text-sm text-gray-400 truncate">{customer.service}</p>
                            </div>
                          </div>
                          <button className="text-gray-400 hover:text-white flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{customer.startTime || 'Waiting'}</span>
                          </div>
                          {getStatusBadge(customer.status)}
                        </div>

                        {customer.phone && (
                          <div className="mt-2 pt-2 border-t border-[#444444]/30 flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2 text-gray-400">
                              <Phone className="h-4 w-4" />
                              <span>{customer.phone}</span>
                            </div>
                            {customer.waitTime && <span className="text-yellow-400">{customer.waitTime}</span>}
                          </div>
                        )}

                        {customer.servicePrice > 0 && (
                          <div className="mt-2 text-sm text-gray-400">
                            Price: ₱{customer.servicePrice.toFixed(2)}
                          </div>
                        )}
                      </div>
                    ))}

                    {customers.length === 0 && (
                      <div className="text-center py-10 text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No customers assigned</p>
                      </div>
                    )}

                    {conflicts.length > 0 && (
                      <div className="mt-2 p-2 bg-red-400/10 border border-red-400/30 rounded text-xs text-red-400">
                        <div className="font-medium mb-1">Time Conflicts:</div>
                        {conflicts.map((conflict, idx) => (
                          <div key={idx} className="text-gray-400">
                            {conflict.time}: {conflict.count} customers
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {!branchId && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 text-center">
          <p className="text-yellow-400">No branch assigned. Please assign a branch to view the queue.</p>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
              <h3 className="text-lg font-semibold text-white">Customer Details</h3>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Customer Basic Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] font-bold text-lg">
                  {selectedCustomer.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'C'}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white">{selectedCustomer.name}</h4>
                  <p className="text-sm text-gray-400">{selectedCustomer.service}</p>
                </div>
              </div>

              {/* VIP Badge & Type */}
              <div className="flex items-center gap-2 flex-wrap">
                {getVipBadge(selectedCustomer)}
                {getCustomerTypeLabel(selectedCustomer)}
                {getStatusBadge(selectedCustomer.status)}
              </div>

              {/* Welcome Back Card (for signed-in customers) */}
              {selectedCustomer.hasAccount && selectedCustomer.userId && (
                <WelcomeBackCard
                  userId={selectedCustomer.userId}
                  className="mt-4"
                />
              )}

              {/* Service History (for signed-in customers) */}
              {selectedCustomer.hasAccount && selectedCustomer.userId && (
                <ServiceHistoryCard
                  userId={selectedCustomer.userId}
                  className="mt-4"
                />
              )}

              {/* Contact Info */}
              {selectedCustomer.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                  <Phone className="w-5 h-5 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white">{selectedCustomer.phone}</p>
                  </div>
                </div>
              )}

              {/* Appointment Time */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0A0A0A] border border-[#2A2A2A]">
                <Clock className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-400">Scheduled Time</p>
                  <p className="text-white">{selectedCustomer.startTime || 'Waiting'}</p>
                </div>
              </div>

              {/* Service Price */}
              {selectedCustomer.servicePrice > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
                  <span className="text-gray-300">Service Price</span>
                  <span className="text-[var(--color-primary)] font-bold text-lg">
                    ₱{selectedCustomer.servicePrice.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Story 24.1: Wallet Payment Option at POS */}
              {/* Only show for customers with accounts and when there's a service price */}
              {selectedCustomer.hasAccount && selectedCustomer.servicePrice > 0 && (
                <POSWalletPayment
                  customerId={selectedCustomer.userId || null}
                  totalAmount={selectedCustomer.servicePrice}
                  onPayWithWallet={() => {
                    // Story 24.2: Show wallet payment confirmation dialog
                    console.log('[POS] Pay with wallet clicked:', {
                      customerId: selectedCustomer.userId,
                      amount: selectedCustomer.servicePrice,
                    });
                    setWalletPaymentData({
                      customerId: selectedCustomer.userId,
                      customerName: selectedCustomer.name,
                      amount: selectedCustomer.servicePrice,
                      serviceName: selectedCustomer.service,
                      bookingId: selectedCustomer.bookingId,
                    });
                    setShowWalletConfirm(true);
                  }}
                  onComboPayment={(walletAmount) => {
                    // Story 24.3: Show combo payment dialog
                    console.log('[POS] Combo payment clicked:', {
                      customerId: selectedCustomer.userId,
                      walletAmount,
                      remainder: selectedCustomer.servicePrice - walletAmount,
                    });
                    setComboPaymentData({
                      customerId: selectedCustomer.userId,
                      customerName: selectedCustomer.name,
                      totalAmount: selectedCustomer.servicePrice,
                      walletAmount: walletAmount,
                      serviceName: selectedCustomer.service,
                      bookingId: selectedCustomer.bookingId,
                    });
                    setShowComboPayment(true);
                  }}
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-[#2A2A2A]">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-3 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Story 24-2: Wallet Payment Confirmation Dialog */}
      {walletPaymentData && (
        <WalletPaymentConfirmDialog
          isOpen={showWalletConfirm}
          onClose={() => {
            setShowWalletConfirm(false);
            setWalletPaymentData(null);
          }}
          onSuccess={(result) => {
            console.log('[POS_WALLET_PAYMENT] Payment successful:', result);
            // Close the confirmation dialog
            setShowWalletConfirm(false);
            setWalletPaymentData(null);
            // Close the customer details modal
            setSelectedCustomer(null);
            // Show success toast/alert with new balance
            const newBalance = result?.walletDebit?.remainingBalance || 0;
            const pointsEarned = result?.pointsEarned?.totalPoints || Math.floor(walletPaymentData.amount);
            showAlert({ title: 'Payment Successful', message: `Paid: ₱${walletPaymentData.amount.toLocaleString()}\nPoints earned: +${pointsEarned}\n\nNew wallet balance: ₱${newBalance.toLocaleString()}`, type: 'success' });
          }}
          onInsufficientBalance={() => {
            // Handle insufficient balance - offer combo payment (Story 24.3)
            console.log('[POS_WALLET_PAYMENT] Insufficient balance, opening combo payment');
            setShowWalletConfirm(false);
            // Open combo payment dialog with wallet data
            setComboPaymentData({
              customerId: walletPaymentData.customerId,
              customerName: walletPaymentData.customerName,
              totalAmount: walletPaymentData.amount,
              walletAmount: selectedCustomerWallet?.totalBalance || 0,
              serviceName: walletPaymentData.serviceName,
              bookingId: walletPaymentData.bookingId,
            });
            setShowComboPayment(true);
            setWalletPaymentData(null);
          }}
          customerId={walletPaymentData.customerId}
          customerName={walletPaymentData.customerName}
          amount={walletPaymentData.amount}
          walletBalance={selectedCustomerWallet?.totalBalance || 0}
          serviceName={walletPaymentData.serviceName}
          branchId={branchId}
          bookingId={walletPaymentData.bookingId}
          staffId={user?._id}
        />
      )}

      {/* Story 24-3: Combo Payment Dialog */}
      {comboPaymentData && (
        <ComboPaymentDialog
          isOpen={showComboPayment}
          onClose={() => {
            setShowComboPayment(false);
            setComboPaymentData(null);
          }}
          onSuccess={(result) => {
            console.log('[POS_COMBO_PAYMENT] Combo payment successful:', result);
            // Close the combo payment dialog
            setShowComboPayment(false);
            setComboPaymentData(null);
            // Close the customer details modal
            setSelectedCustomer(null);
            // Show success toast/alert with payment breakdown
            const walletPart = result?.walletPortion?.amount || 0;
            const remainderPart = result?.remainderPortion?.amount || 0;
            const remainderMethod = result?.remainderPortion?.method?.toUpperCase() || 'CASH';
            const pointsEarned = result?.pointsEarned || Math.floor(walletPart);
            showAlert({ title: 'Combo Payment Successful', message: `Wallet: ₱${walletPart.toLocaleString()}\n${remainderMethod}: ₱${remainderPart.toLocaleString()}\nTotal: ₱${(walletPart + remainderPart).toLocaleString()}\n\nPoints earned: +${pointsEarned}`, type: 'success' });
          }}
          customerId={comboPaymentData.customerId}
          customerName={comboPaymentData.customerName}
          totalAmount={comboPaymentData.totalAmount}
          walletBalance={selectedCustomerWallet?.totalBalance || 0}
          serviceName={comboPaymentData.serviceName}
          branchId={branchId}
          bookingId={comboPaymentData.bookingId}
          staffId={user?._id}
          initialWalletAmount={comboPaymentData.walletAmount}
        />
      )}
    </div>
  )
}

export default QueueSection
