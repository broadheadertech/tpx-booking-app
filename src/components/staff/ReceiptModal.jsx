import React, { useRef } from 'react'
import Modal from '../common/Modal'
import { Printer, Download, X, CheckCircle } from 'lucide-react'

const ReceiptModal = ({ 
  isOpen, 
  onClose, 
  transactionData,
  branchInfo,
  staffInfo 
}) => {
  const receiptRef = useRef(null)

  if (!transactionData) return null

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    // Create a text version of the receipt
    const receiptText = generateReceiptText()
    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${transactionData.transaction_id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateReceiptText = () => {
    const lines = []
    const width = 42 // Characters width for 80mm paper
    
    const center = (text) => {
      const padding = Math.max(0, Math.floor((width - text.length) / 2))
      return ' '.repeat(padding) + text
    }
    
    const leftRight = (left, right) => {
      const spaces = width - left.length - right.length
      return left + ' '.repeat(Math.max(1, spaces)) + right
    }
    
    const separator = '='.repeat(width)
    const dashedLine = '-'.repeat(width)
    
    // Header
    lines.push(center('TPX BARBERSHOP'))
    lines.push(center(branchInfo?.name || 'Main Branch'))
    if (branchInfo?.address) {
      lines.push(center(branchInfo.address))
    }
    if (branchInfo?.phone) {
      lines.push(center(`Tel: ${branchInfo.phone}`))
    }
    lines.push(separator)
    
    // Transaction Info
    lines.push(center('OFFICIAL RECEIPT'))
    lines.push('')
    lines.push(leftRight('Receipt No:', transactionData.receipt_number || transactionData.transaction_id))
    lines.push(leftRight('Date:', formatDate(transactionData.timestamp || Date.now())))
    lines.push(leftRight('Cashier:', staffInfo?.username || 'Staff'))
    if (transactionData.barber_name) {
      lines.push(leftRight('Barber:', transactionData.barber_name))
    }
    if (transactionData.customer_name) {
      lines.push(leftRight('Customer:', transactionData.customer_name))
    }
    lines.push(separator)
    
    // Items Header
    lines.push(leftRight('Item', 'Amount'))
    lines.push(dashedLine)
    
    // Services
    if (transactionData.services && transactionData.services.length > 0) {
      transactionData.services.forEach(service => {
        const itemLine = `${service.service_name}`
        lines.push(itemLine)
        const detailLine = leftRight(
          `  ${service.quantity}x ₱${service.price.toFixed(2)}`,
          `₱${(service.quantity * service.price).toFixed(2)}`
        )
        lines.push(detailLine)
      })
    }
    
    // Products
    if (transactionData.products && transactionData.products.length > 0) {
      transactionData.products.forEach(product => {
        const itemLine = `${product.product_name}`
        lines.push(itemLine)
        const detailLine = leftRight(
          `  ${product.quantity}x ₱${product.price.toFixed(2)}`,
          `₱${(product.quantity * product.price).toFixed(2)}`
        )
        lines.push(detailLine)
      })
    }
    
    lines.push(dashedLine)
    
    // Totals
    lines.push(leftRight('Subtotal:', `₱${transactionData.subtotal.toFixed(2)}`))
    
    if (transactionData.discount_amount > 0) {
      lines.push(leftRight('Discount:', `-₱${transactionData.discount_amount.toFixed(2)}`))
    }
    
    if (transactionData.tax_amount > 0) {
      lines.push(leftRight('Tax:', `₱${transactionData.tax_amount.toFixed(2)}`))
    }
    
    lines.push(separator)
    lines.push(leftRight('TOTAL:', `₱${transactionData.total_amount.toFixed(2)}`))
    lines.push(separator)
    
    // Payment Info
    lines.push('')
    const paymentMethodLabel = transactionData.payment_method.replace('_', ' ').toUpperCase()
    lines.push(leftRight('Payment Method:', paymentMethodLabel))
    
    if (transactionData.payment_method === 'cash') {
      if (transactionData.cash_received) {
        lines.push(leftRight('Cash Received:', `₱${transactionData.cash_received.toFixed(2)}`))
      }
      if (transactionData.change_amount) {
        lines.push(leftRight('Change:', `₱${transactionData.change_amount.toFixed(2)}`))
      }
    }
    
    lines.push('')
    lines.push(separator)
    
    // Footer
    lines.push('')
    lines.push(center('Thank you for your business!'))
    lines.push(center('Please come again!'))
    lines.push('')
    lines.push(center('This serves as your official receipt'))
    lines.push('')
    
    return lines.join('\n')
  }

  return (
    <>
      {/* Screen Modal */}
      <Modal isOpen={isOpen} onClose={onClose} title="Receipt" size="md" variant="dark">
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-white mb-1">Payment Successful!</h3>
            <p className="text-sm text-gray-400">Transaction completed successfully</p>
          </div>

          {/* Receipt Preview */}
          <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#444444] max-h-64 overflow-y-auto">
            <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
              {generateReceiptText()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePrint}
              className="py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-bold rounded-xl hover:from-[#FF7A2B] hover:to-[#E67E37] transition-all flex items-center justify-center space-x-2"
            >
              <Printer className="w-5 h-5" />
              <span>Print Receipt</span>
            </button>
            
            <button
              onClick={handleDownload}
              className="py-3 border-2 border-[#555555] text-gray-300 font-semibold rounded-xl hover:border-[#FF8C42] hover:text-[#FF8C42] hover:bg-[#FF8C42]/10 transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>Download</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 border border-[#555555] text-gray-300 font-semibold rounded-xl hover:bg-[#2A2A2A] hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </Modal>

      {/* Print-only Receipt */}
      <div className="print-receipt hidden">
        <div ref={receiptRef} style={{ fontFamily: 'monospace', width: '80mm', fontSize: '12px', padding: '10mm' }}>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {generateReceiptText()}
          </pre>
        </div>
      </div>
    </>
  )
}

export default ReceiptModal
