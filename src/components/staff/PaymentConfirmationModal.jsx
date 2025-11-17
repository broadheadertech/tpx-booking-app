import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { CreditCard, DollarSign, Calculator, Receipt, CheckCircle } from 'lucide-react'

const PaymentConfirmationModal = ({ isOpen, onClose, onConfirm, transactionData, paymentMethod, setPaymentMethod }) => {
  const [cashReceived, setCashReceived] = useState('')
  const [change, setChange] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Calculate change when cash received changes
  useEffect(() => {
    if (paymentMethod === 'cash' && cashReceived) {
      const received = parseFloat(cashReceived) || 0
      const changeAmount = Math.max(0, received - transactionData.total_amount)
      setChange(changeAmount)
    } else {
      setChange(0)
    }
  }, [cashReceived, paymentMethod, transactionData.total_amount])

  const handleConfirm = async () => {
    if (paymentMethod === 'cash') {
      const received = parseFloat(cashReceived) || 0
      if (received < transactionData.total_amount) {
        alert('Cash received is less than the total amount')
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

  const resetModal = () => {
    setCashReceived('')
    setChange(0)
    setIsProcessing(false)
  }

  useEffect(() => {
    if (!isOpen) {
      resetModal()
    }
  }, [isOpen])

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Payment" variant="dark" size="md" compact={true}>
      <div className="space-y-2.5 lg:space-y-3">
        {/* Transaction Summary - Primary Focus */}
        <div className="bg-gradient-to-br from-[#1A1A1A] to-[#0A0A0A] rounded-lg lg:rounded-xl p-3 lg:p-4 border border-[#2A2A2A]">
          <div className="space-y-2 lg:space-y-3">
            {/* Total Amount - Most Prominent */}
            <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-lg p-2.5 lg:p-3 text-center">
              <p className="text-[10px] lg:text-xs font-semibold text-white/80 mb-1">Total Amount</p>
              <p className="text-2xl lg:text-3xl font-black text-white">
                ₱{transactionData.total_amount.toFixed(2)}
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
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'cash', label: 'Cash', icon: DollarSign },
              { value: 'card', label: 'Card', icon: CreditCard },
              { value: 'digital_wallet', label: 'Wallet', icon: CreditCard },
              { value: 'bank_transfer', label: 'Transfer', icon: CreditCard }
            ].map((method) => {
              const IconComponent = method.icon
              return (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-2 rounded-lg border-2 transition-all duration-200 flex flex-col items-center justify-center space-y-1 text-xs font-semibold ${
                    paymentMethod === method.value
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

        {/* Cash Payment Details - Conditional */}
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
            disabled={isProcessing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < transactionData.total_amount))}
            className="flex-1 py-2 lg:py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-lg hover:from-[var(--color-accent)] hover:to-[var(--color-accent)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-1.5 text-xs lg:text-sm"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 lg:h-3.5 lg:w-3.5 border-2 border-white border-t-transparent"></div>
                <span className="hidden lg:inline">Processing...</span>
                <span className="lg:hidden">Processing</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                <span>Confirm</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PaymentConfirmationModal