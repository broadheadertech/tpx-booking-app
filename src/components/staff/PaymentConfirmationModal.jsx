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
    <Modal isOpen={isOpen} onClose={onClose} title="Payment Confirmation" size="md">
      <div className="space-y-6">
        {/* Transaction Summary */}
        <div className="bg-gray-50 rounded-xl p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Transaction Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">₱{transactionData.subtotal.toFixed(2)}</span>
            </div>
            {transactionData.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount:</span>
                <span className="font-medium">-₱{transactionData.discount_amount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (10%):</span>
              <span className="font-medium">₱{transactionData.tax_amount.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>Total:</span>
                <span>₱{transactionData.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'cash', label: 'Cash', icon: DollarSign },
              { value: 'card', label: 'Card', icon: CreditCard },
              { value: 'digital_wallet', label: 'Digital Wallet', icon: CreditCard },
              { value: 'bank_transfer', label: 'Bank Transfer', icon: CreditCard }
            ].map((method) => {
              const IconComponent = method.icon
              return (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-2 ${
                    paymentMethod === method.value
                      ? 'border-[#FF8C42] bg-[#FF8C42]/10 text-[#FF8C42]'
                      : 'border-gray-200 hover:border-[#FF8C42]/50 text-gray-700'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-sm font-medium">{method.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Cash Payment Details */}
        {paymentMethod === 'cash' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cash Received</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₱</span>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent text-lg font-medium"
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[100, 200, 500, 1000].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setCashReceived(amount.toString())}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                >
                  ₱{amount}
                </button>
              ))}
            </div>

            {/* Change Calculation */}
            {cashReceived && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calculator className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">Change:</span>
                  </div>
                  <span className="text-xl font-bold text-green-800">₱{change.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Services & Products List */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Items</h3>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {transactionData.services.map((service, index) => (
              <div key={`service-${index}`} className="flex justify-between items-center py-2 px-3 bg-blue-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{service.service_name}</span>
                  <span className="text-sm text-gray-600 ml-2">x{service.quantity}</span>
                </div>
                <span className="font-medium text-gray-900">₱{(service.price * service.quantity).toFixed(2)}</span>
              </div>
            ))}
            {transactionData.products && transactionData.products.map((product, index) => (
              <div key={`product-${index}`} className="flex justify-between items-center py-2 px-3 bg-green-50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900">{product.product_name}</span>
                  <span className="text-sm text-gray-600 ml-2">x{product.quantity}</span>
                </div>
                <span className="font-medium text-gray-900">₱{(product.price * product.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < transactionData.total_amount))}
            className="flex-1 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-bold rounded-xl hover:from-[#FF7A2B] hover:to-[#E67E37] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>Confirm Payment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PaymentConfirmationModal