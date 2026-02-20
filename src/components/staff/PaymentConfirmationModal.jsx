import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { CreditCard, DollarSign, Calculator, Receipt, CheckCircle, Wallet, Banknote, Smartphone } from 'lucide-react'
import { useAppModal } from '../../context/AppModalContext'

const PaymentConfirmationModal = ({ isOpen, onClose, onConfirm, transactionData, paymentMethod, setPaymentMethod, walletBalance, customerId }) => {
  const { showAlert } = useAppModal()
  const [cashReceived, setCashReceived] = useState('')
  const [change, setChange] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const [walletAmount, setWalletAmount] = useState(0)
  const [remainderMethod, setRemainderMethod] = useState('cash')
  const [remainderCashReceived, setRemainderCashReceived] = useState('')
  const [remainderChange, setRemainderChange] = useState(0)

  // Calculate the amount due after online payment
  const onlinePaid = transactionData.online_payment_amount || 0
  const amountDue = Math.max(0, transactionData.total_amount - onlinePaid)

  // Wallet availability
  const hasWallet = walletBalance?.hasWallet && walletBalance?.totalBalance > 0 && customerId
  const walletTotal = walletBalance?.totalBalance || 0
  const canPayFullWithWallet = hasWallet && walletTotal >= amountDue
  const walletCoverAmount = hasWallet ? Math.min(walletTotal, amountDue) : 0
  const walletRemainderAmount = amountDue - walletAmount

  // Reset wallet amount when modal opens or wallet balance changes
  useEffect(() => {
    if (isOpen && hasWallet) {
      setWalletAmount(Math.min(walletTotal, amountDue))
      setRemainderMethod('cash')
      setRemainderCashReceived('')
      setRemainderChange(0)
    }
  }, [isOpen, walletTotal, amountDue, hasWallet])

  // Calculate change when cash received changes (against amount due, not total)
  useEffect(() => {
    if (paymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0
      const changeAmount = Math.max(0, received - amountDue)
      setChange(changeAmount)
    } else {
      setChange(0)
    }
  }, [cashReceived, paymentMethod, amountDue])

  // Calculate remainder change for wallet combo + cash
  useEffect(() => {
    if (paymentMethod === 'wallet' && remainderMethod === 'cash' && remainderCashReceived) {
      const received = parseFloat(remainderCashReceived) || 0
      const remainder = Math.max(0, amountDue - walletAmount)
      setRemainderChange(Math.max(0, received - remainder))
    } else {
      setRemainderChange(0)
    }
  }, [remainderCashReceived, remainderMethod, paymentMethod, walletAmount, amountDue])

  const handleWalletAmountChange = (e) => {
    const value = parseFloat(e.target.value) || 0
    const clamped = Math.min(Math.max(0, value), walletTotal, amountDue)
    setWalletAmount(clamped)
  }

  const handleConfirm = async () => {
    if (paymentMethod === 'wallet') {
      // Wallet payment (full or combo)
      const isFullWallet = walletAmount >= amountDue
      const remainder = Math.max(0, amountDue - walletAmount)

      if (!isFullWallet && remainder > 0 && remainderMethod === 'cash') {
        const received = parseFloat(remainderCashReceived) || 0
        if (received < remainder) {
          showAlert({ title: 'Insufficient Cash', message: `Cash received (₱${received.toFixed(2)}) is less than the remainder (₱${remainder.toFixed(2)})`, type: 'error' })
          return
        }
      }

      setIsProcessing(true)
      try {
        // Use amountDue as total for wallet/combo — prevents debiting the online-paid portion
        const effectiveTotal = amountDue

        if (isFullWallet) {
          // Full wallet payment — debit only the remaining amount
          await onConfirm({
            ...transactionData,
            total_amount: effectiveTotal,
            payment_method: 'wallet',
          })
        } else {
          // Combo: wallet + remainder
          await onConfirm({
            ...transactionData,
            total_amount: effectiveTotal,
            payment_method: 'combo',
            wallet_used: walletAmount,
            cash_collected: remainder,
            cash_received: remainderMethod === 'cash' ? (parseFloat(remainderCashReceived) || remainder) : undefined,
            change_amount: remainderMethod === 'cash' ? remainderChange : undefined,
          })
        }
      } catch (error) {
        console.error('Payment failed:', error)
      } finally {
        setIsProcessing(false)
      }
    } else {
      // Standard payment (cash/card/etc.)
      if (paymentMethod === 'cash') {
        const received = parseFloat(cashReceived) || 0
        if (received < amountDue) {
          showAlert({ title: 'Insufficient Cash', message: `Cash received is less than the amount due (₱${amountDue.toFixed(2)})`, type: 'error' })
          return
        }
      }

      setIsProcessing(true)
      try {
        await onConfirm({
          ...transactionData,
          payment_method: paymentMethod,
          cash_received: paymentMethod === 'cash' ? parseFloat(cashReceived) : undefined,
          change_amount: paymentMethod === 'cash' ? change : undefined
        })
      } catch (error) {
        console.error('Payment failed:', error)
      } finally {
        setIsProcessing(false)
      }
    }
  }

  const resetModal = () => {
    setCashReceived('')
    setChange(0)
    setIsProcessing(false)
    setWalletAmount(0)
    setRemainderMethod('cash')
    setRemainderCashReceived('')
    setRemainderChange(0)
  }

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  // Determine if confirm button should be disabled
  const isConfirmDisabled = () => {
    if (isProcessing) return true
    if (paymentMethod === 'cash') {
      return !cashReceived || parseFloat(cashReceived) < amountDue
    }
    if (paymentMethod === 'wallet') {
      if (walletAmount <= 0) return true
      if (walletAmount > walletTotal) return true
      const remainder = Math.max(0, amountDue - walletAmount)
      if (remainder > 0 && remainderMethod === 'cash') {
        return !remainderCashReceived || (parseFloat(remainderCashReceived) || 0) < remainder
      }
    }
    return false
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Payment" variant="dark" size="md" compact={true}>
      <div className="space-y-2.5 lg:space-y-3">
        {/* Transaction Summary - Primary Focus */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-lg lg:rounded-xl p-3 lg:p-4 border border-[#2A2A2A]">
          <div className="space-y-2 lg:space-y-3">
            {/* Amount Due - Most Prominent */}
            <div className={`rounded-lg p-2.5 lg:p-3 text-center ${onlinePaid > 0 ? 'bg-gradient-to-r from-yellow-600 to-orange-500' : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'}`}>
              <p className="text-[10px] lg:text-xs font-semibold text-white/80 mb-1">
                {onlinePaid > 0 ? 'Amount Due (Remaining)' : 'Total Amount'}
              </p>
              <p className="text-2xl lg:text-3xl font-black text-white">
                ₱{amountDue.toFixed(2)}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5 lg:space-y-2 text-[10px] lg:text-xs">
              <div className="flex justify-between items-center px-2 py-1.5 bg-[#2A2A2A] rounded">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-gray-200 font-semibold">₱{transactionData.subtotal.toFixed(2)}</span>
              </div>
              {transactionData.discount_amount > 0 && (
                <div className="flex justify-between items-center px-2 py-1.5 bg-green-500/10 rounded border border-green-500/20">
                  <span className="text-green-400 font-medium">Discount</span>
                  <span className="text-green-300 font-bold">-₱{transactionData.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {transactionData.tax_amount > 0 && (
                <div className="flex justify-between items-center px-2 py-1.5 bg-[#2A2A2A] rounded">
                  <span className="text-gray-400">Tax</span>
                  <span className="text-gray-200 font-semibold">₱{transactionData.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {transactionData.booking_fee > 0 && (
                <div className="flex justify-between items-center px-2 py-1.5 bg-orange-500/10 rounded border border-orange-500/20">
                  <span className="text-orange-400 font-medium">Booking Fee</span>
                  <span className="text-orange-300 font-bold">+₱{transactionData.booking_fee.toFixed(2)}</span>
                </div>
              )}
              {transactionData.late_fee > 0 && (
                <div className="flex justify-between items-center px-2 py-1.5 bg-red-500/10 rounded border border-red-500/20">
                  <span className="text-red-400 font-medium">Late Fee</span>
                  <span className="text-red-300 font-bold">+₱{transactionData.late_fee.toFixed(2)}</span>
                </div>
              )}
              {onlinePaid > 0 && (
                <>
                  <div className="flex justify-between items-center px-2 py-1.5 bg-[#2A2A2A] rounded">
                    <span className="text-gray-400">Total</span>
                    <span className="text-gray-200 font-semibold">₱{transactionData.total_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1.5 bg-green-500/10 rounded border border-green-500/20">
                    <span className="text-green-400 font-medium">Online Payment (Paid)</span>
                    <span className="text-green-300 font-bold">-₱{onlinePaid.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Wallet Balance Banner — only shown when customer has wallet */}
        {hasWallet && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Customer Wallet</span>
              </div>
              <span className="text-sm font-bold text-white">
                ₱{walletTotal.toFixed(2)}
              </span>
            </div>
            {!canPayFullWithWallet && (
              <p className="text-[10px] text-purple-400/70 mt-1">
                Covers ₱{walletCoverAmount.toFixed(2)} — remainder ₱{(amountDue - walletCoverAmount).toFixed(2)} needed
              </p>
            )}
          </div>
        )}

        {/* Payment Method Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Wallet button — only when customer has wallet */}
            {hasWallet && (
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-1 text-xs font-semibold col-span-2 ${paymentMethod === 'wallet'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : 'border-purple-500/30 bg-purple-500/5 text-purple-400/70 hover:border-purple-500/50'
                  }`}
              >
                <Wallet className="w-4 h-4" />
                <span>{canPayFullWithWallet ? 'Pay with Wallet' : 'Wallet + Cash/Card'}</span>
              </button>
            )}
            {[
              { value: 'cash', label: 'Cash', icon: DollarSign },
              { value: 'card', label: 'Card', icon: CreditCard },
              { value: 'digital_wallet', label: 'E-Wallet', icon: Smartphone },
              { value: 'bank_transfer', label: 'Transfer', icon: CreditCard }
            ].map((method) => {
              const IconComponent = method.icon
              return (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-1 text-xs font-semibold ${paymentMethod === method.value
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                      : 'border-[#555555] bg-[#1A1A1A] text-gray-400 hover:border-[var(--color-primary)]/50'
                    }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{method.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Wallet Payment Details */}
        {paymentMethod === 'wallet' && hasWallet && (
          <div className="space-y-2.5">
            {/* Wallet Amount — Editable */}
            <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs font-bold text-purple-300">Wallet Portion</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  Balance: ₱{walletTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-purple-300 font-bold">₱</span>
                <input
                  type="number"
                  value={walletAmount}
                  onChange={handleWalletAmountChange}
                  min="0"
                  max={Math.min(walletTotal, amountDue)}
                  step="1"
                  disabled={isProcessing}
                  className="flex-1 bg-[#0A0A0A] border border-purple-500/50 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-purple-400 disabled:opacity-50"
                />
              </div>
              {walletAmount > walletTotal && (
                <p className="text-[10px] text-red-400 mt-1">Exceeds wallet balance</p>
              )}
            </div>

            {/* Remainder Section — when wallet doesn't cover full amount */}
            {walletAmount < amountDue && walletAmount > 0 && (
              <div className="p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-300">Remainder</span>
                  <span className="text-lg font-bold text-white">₱{Math.max(0, amountDue - walletAmount).toFixed(2)}</span>
                </div>

                {/* Remainder payment method */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'cash', label: 'Cash', icon: Banknote },
                    { id: 'card', label: 'Card', icon: CreditCard },
                    { id: 'gcash', label: 'GCash', icon: Smartphone },
                    { id: 'maya', label: 'Maya', icon: Smartphone },
                  ].map((method) => {
                    const Icon = method.icon
                    const isSelected = remainderMethod === method.id
                    return (
                      <button
                        key={method.id}
                        onClick={() => setRemainderMethod(method.id)}
                        disabled={isProcessing}
                        className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border transition-all text-[10px] font-medium ${
                          isSelected
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                            : 'border-[#333333] bg-[#0A0A0A] text-gray-500 hover:border-gray-500'
                        } disabled:opacity-50`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[var(--color-primary)]' : ''}`} />
                        <span>{method.label}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Cash input for remainder */}
                {remainderMethod === 'cash' && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-gray-400">Cash Received</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-400 font-bold text-sm">₱</span>
                      <input
                        type="number"
                        value={remainderCashReceived}
                        onChange={(e) => setRemainderCashReceived(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 bg-[#0A0A0A] border border-[#555555] rounded-lg text-white font-bold text-base focus:ring-2 focus:ring-green-500 focus:border-transparent placeholder-gray-500"
                        step="0.01"
                        min="0"
                        disabled={isProcessing}
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[50, 100, 200, 500].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => setRemainderCashReceived(amt.toString())}
                          className="py-1 bg-[#2A2A2A] hover:bg-green-500/30 text-gray-400 hover:text-white rounded text-[10px] font-semibold transition-all"
                        >
                          {amt}
                        </button>
                      ))}
                    </div>
                    {remainderCashReceived && (
                      <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Calculator className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] font-bold text-green-300">Change</span>
                          </div>
                          <span className="text-sm font-black text-green-300">₱{remainderChange.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="p-2.5 bg-[#0A0A0A] rounded-lg border border-[#2A2A2A] space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-purple-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 inline-block"></span>
                  Wallet
                </span>
                <span className="text-purple-300 font-bold">₱{walletAmount.toFixed(2)}</span>
              </div>
              {walletAmount < amountDue && (
                <div className="flex justify-between text-xs">
                  <span className="text-green-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"></span>
                    {remainderMethod === 'cash' ? 'Cash' : remainderMethod === 'card' ? 'Card' : remainderMethod === 'gcash' ? 'GCash' : 'Maya'}
                  </span>
                  <span className="text-white font-bold">₱{Math.max(0, amountDue - walletAmount).toFixed(2)}</span>
                </div>
              )}
              <div className="h-px bg-[#2A2A2A]" />
              <div className="flex justify-between">
                <span className="text-gray-300 font-medium text-xs">Total</span>
                <span className="text-[var(--color-primary)] font-bold">₱{amountDue.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Cash Payment Details - Standard flow */}
        {paymentMethod === 'cash' && (
          <div className="space-y-2 bg-[#1A1A1A] rounded-lg p-3 border border-[#2A2A2A]">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">Cash Received</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--color-primary)] font-bold">₱</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2.5 bg-[#2A2A2A] border border-[#555555] rounded-lg text-white font-bold text-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent placeholder-gray-500"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-1.5">
              {[100, 200, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCashReceived(amount.toString())}
                  className="py-1.5 px-2 bg-[#2A2A2A] hover:bg-[var(--color-primary)] text-gray-300 hover:text-white rounded text-xs font-semibold transition-all duration-200"
                >
                  {amount}
                </button>
              ))}
            </div>

            {/* Change Calculation */}
            {cashReceived && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-2.5 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <Calculator className="w-4 h-4 text-green-400" />
                    <span className="text-xs font-bold text-green-300">Change</span>
                  </div>
                  <span className="text-lg font-black text-green-300">₱{change.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Summary - Compact */}
        {(transactionData.services.length > 0 || (transactionData.products && transactionData.products.length > 0)) && (
          <div className="space-y-1.5">
            <p className="text-[10px] lg:text-xs font-bold text-gray-300 px-1">Items</p>
            <div className="max-h-20 lg:max-h-24 overflow-y-auto space-y-1 pr-1">
              {transactionData.services.map((service, index) => (
                <div key={`service-${index}`} className="flex justify-between items-center py-1.5 px-2 bg-[#2A2A2A] rounded text-[10px] lg:text-xs">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-gray-200 font-semibold truncate">{service.service_name}</span>
                    <span className="text-gray-500 ml-1.5">×{service.quantity}</span>
                  </div>
                  <span className="text-[var(--color-primary)] font-bold flex-shrink-0">₱{(service.price * service.quantity).toFixed(2)}</span>
                </div>
              ))}
              {transactionData.products && transactionData.products.map((product, index) => (
                <div key={`product-${index}`} className="flex justify-between items-center py-1.5 px-2 bg-[#2A2A2A] rounded text-[10px] lg:text-xs">
                  <div className="min-w-0 flex-1 mr-2">
                    <span className="text-gray-200 font-semibold truncate">{product.product_name}</span>
                    <span className="text-gray-500 ml-1.5">×{product.quantity}</span>
                  </div>
                  <span className="text-[var(--color-primary)] font-bold flex-shrink-0">₱{(product.price * product.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 lg:space-x-2.5 pt-1.5 lg:pt-2">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-2 lg:py-2.5 border border-[#555555] text-gray-300 font-semibold rounded-lg text-xs lg:text-sm hover:bg-[#1A1A1A] hover:border-gray-400 transition-all duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className={`flex-1 py-2 lg:py-2.5 text-white font-bold rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 text-xs lg:text-sm ${
              paymentMethod === 'wallet'
                ? 'bg-gradient-to-r from-purple-500 to-[var(--color-primary)] hover:opacity-90'
                : 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:from-[var(--color-accent)] hover:to-[var(--color-accent)]'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 lg:h-3.5 lg:w-3.5 border-2 border-white border-t-transparent"></div>
                <span className="hidden lg:inline">Processing...</span>
                <span className="lg:hidden">Processing</span>
              </>
            ) : (
              <>
                {paymentMethod === 'wallet' ? <Wallet className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                <span>{paymentMethod === 'wallet' ? 'Pay with Wallet' : 'Confirm'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PaymentConfirmationModal
