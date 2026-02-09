import Modal from '../common/Modal'
import { Printer, Download, CheckCircle } from 'lucide-react'

const ReceiptModal = ({
  isOpen,
  onClose,
  transactionData,
  branchInfo,
  staffInfo
}) => {
  if (!transactionData) return null

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  const formatCurrency = (value) => {
    const amount = Number(value) || 0
    return `₱${amount.toFixed(2)}`
  }

  // Format payment method for display
  const formatPaymentMethod = (method) => {
    const methodMap = {
      'cash': 'CASH',
      'card': 'CARD',
      'gcash': 'GCASH',
      'maya': 'MAYA',
      'bank_transfer': 'BANK TRANSFER',
      'online_payment': 'PAID ONLINE',
      'partial_online': 'PARTIAL (ONLINE)',
      'pay_at_shop': 'PAY AT SHOP',
      'pending': 'PENDING',
      'wallet': 'WALLET'
    }
    return methodMap[method] || (method || 'CASH').replace(/_/g, ' ').toUpperCase()
  }

  const generateReceiptHTML = () => {
    const receiptNumber = transactionData.receipt_number || transactionData.transaction_id || 'N/A'
    const timestamp = transactionData.timestamp || Date.now()
    const dateStr = formatDate(timestamp)
    const timeStr = formatTime(timestamp)

    const escapeHtml = (value) => {
      if (value === null || value === undefined) return ''
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }

    const servicesHtml = Array.isArray(transactionData.services)
      ? transactionData.services.map((service) => {
        const qty = Number(service?.quantity || 1)
        const price = Number(service?.price || 0)
        const total = qty * price
        const name = escapeHtml(service?.service_name || service?.name || 'Service')
        return `
            <tr>
              <td class="bold" style="font-size: 14px;">${name}</td>
              <td class="right bold" style="font-size: 14px;">${formatCurrency(total)}</td>
            </tr>
            <tr>
              <td style="font-size: 12px; padding-left: 4mm;">${qty}x ${formatCurrency(price)}</td>
              <td></td>
            </tr>
          `
      }).join('')
      : ''

    const productsHtml = Array.isArray(transactionData.products)
      ? transactionData.products.map((product) => {
        const qty = Number(product?.quantity || 1)
        const price = Number(product?.price || 0)
        const total = qty * price
        const name = escapeHtml(product?.product_name || product?.name || 'Product')
        return `
            <tr>
              <td class="bold" style="font-size: 14px;">${name}</td>
              <td class="right bold" style="font-size: 14px;">${formatCurrency(total)}</td>
            </tr>
            <tr>
              <td style="font-size: 12px; padding-left: 4mm;">${qty}x ${formatCurrency(price)}</td>
              <td></td>
            </tr>
          `
      }).join('')
      : ''

    const subtotal = Number(transactionData.subtotal || 0)
    const discount = Number(transactionData.discount_amount || 0)
    const tax = Number(transactionData.tax_amount || 0)
    const bookingFee = Number(transactionData.booking_fee || 0)
    const lateFee = Number(transactionData.late_fee || 0)
    const total = Number(transactionData.total_amount || 0)
    const cashReceived = Number(transactionData.cash_received || 0)
    const change = Number(transactionData.change_amount || 0)
    const amountPaid = Number(transactionData.amount_paid || 0)
    const amountDue = Number(transactionData.amount_due || 0)
    const paymentMethod = escapeHtml(formatPaymentMethod(transactionData.payment_method))
    const paymentStatus = transactionData.payment_status || ''
    const bookingCode = transactionData.booking_code || ''
    const bookingDate = transactionData.booking_date || ''
    const bookingTime = transactionData.booking_time || ''

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    @page {
      size: 58mm auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: 58mm;
      min-width: 58mm;
      max-width: 58mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      line-height: 1.35;
      padding: 2mm 4mm;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      html, body { 
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 2mm 4mm !important;
      }
    }
    .center { text-align: center; width: 100%; display: block; }
    .bold { font-weight: bold; }
    .right { text-align: right; }
    .small { font-size: 12px; }
    .line { border-bottom: 1px dashed #000; margin: 2mm 0; width: 100%; display: block; }
    .line2 { border-bottom: 2px solid #000; margin: 2mm 0; width: 100%; display: block; }
    table { width: 100%; border-collapse: collapse; margin: 1mm 0; }
    td { padding: 2px 0; vertical-align: top; }
    td:first-child { padding-right: 5mm; }
    td:last-child { text-align: right; }
  </style>
</head>
<body>
  ${branchInfo?.name ? `<div class="center" style="font-size: 12px; margin-bottom: 0.5mm;">${escapeHtml(branchInfo.name)}</div>` : ''}
  ${branchInfo?.address ? `<div class="center" style="font-size: 12px; margin-bottom: 0.5mm;">${escapeHtml(branchInfo.address)}</div>` : ''}
  ${branchInfo?.phone ? `<div class="center" style="font-size: 12px; margin-bottom: 1mm;">Tel: ${escapeHtml(branchInfo.phone)}</div>` : ''}
  <div class="line"></div>
  
  <div class="center bold" style="font-size: 15px; margin: 1.5mm 0;">OFFICIAL RECEIPT</div>
  <div class="line"></div>
  
  <table style="font-size: 13px;">
    <tr><td>Receipt No:</td><td class="right">${escapeHtml(receiptNumber)}</td></tr>
    <tr><td>Date:</td><td class="right">${escapeHtml(dateStr)}</td></tr>
    <tr><td>Time:</td><td class="right">${escapeHtml(timeStr)}</td></tr>
    <tr><td>Cashier:</td><td class="right">${escapeHtml(staffInfo?.username || staffInfo?.full_name || 'Staff')}</td></tr>
    ${transactionData.barber_name ? `<tr><td>Barber:</td><td class="right">${escapeHtml(transactionData.barber_name)}</td></tr>` : ''}
    ${transactionData.customer_name ? `<tr><td>Customer:</td><td class="right">${escapeHtml(transactionData.customer_name)}</td></tr>` : ''}
  </table>
  <div class="line2"></div>
  
  <table style="font-size: 14px;">
    ${servicesHtml}
    ${productsHtml}
  </table>
  
  <div class="line"></div>
  <table style="font-size: 14px;">
    <tr><td class="bold">Subtotal:</td><td class="right bold">${formatCurrency(subtotal)}</td></tr>
    ${discount > 0 ? `<tr><td class="bold">Discount:</td><td class="right bold">-${formatCurrency(discount)}</td></tr>` : ''}
    ${bookingFee > 0 ? `<tr><td class="bold">Booking Fee:</td><td class="right bold">+${formatCurrency(bookingFee)}</td></tr>` : ''}
    ${lateFee > 0 ? `<tr><td class="bold">Late Fee:</td><td class="right bold">+${formatCurrency(lateFee)}</td></tr>` : ''}
    ${tax > 0 ? `<tr><td class="bold">Tax:</td><td class="right bold">${formatCurrency(tax)}</td></tr>` : ''}
  </table>
  <div class="line2"></div>
  
  <table style="font-size: 18px; margin: 1.5mm 0;">
    <tr><td class="bold">TOTAL:</td><td class="right bold">${formatCurrency(total)}</td></tr>
  </table>
  <div class="line2"></div>
  
  ${bookingCode ? `
  <table style="font-size: 12px; margin-bottom: 1mm;">
    <tr><td>Booking #:</td><td class="right">${escapeHtml(bookingCode)}</td></tr>
    ${bookingDate ? `<tr><td>Booking Date:</td><td class="right">${escapeHtml(bookingDate)}</td></tr>` : ''}
    ${bookingTime ? `<tr><td>Booking Time:</td><td class="right">${escapeHtml(bookingTime)}</td></tr>` : ''}
  </table>
  <div class="line"></div>
  ` : ''}

  <table style="font-size: 13px;">
    <tr><td class="bold">Payment:</td><td class="right">${paymentMethod}</td></tr>
    ${paymentStatus === 'paid' ? `<tr><td>Status:</td><td class="right" style="color: green;">FULLY PAID</td></tr>` : ''}
    ${paymentStatus === 'partial' ? `<tr><td>Status:</td><td class="right" style="color: orange;">PARTIAL</td></tr>` : ''}
    ${paymentStatus === 'unpaid' ? `<tr><td>Status:</td><td class="right" style="color: blue;">PAY AT SHOP</td></tr>` : ''}
    ${amountPaid > 0 ? `<tr><td>Amount Paid:</td><td class="right">${formatCurrency(amountPaid)}</td></tr>` : ''}
    ${amountDue > 0 ? `<tr><td class="bold">Amount Due:</td><td class="right bold">${formatCurrency(amountDue)}</td></tr>` : ''}
    ${transactionData.payment_method === 'cash' && cashReceived > 0 ? `<tr><td>Cash:</td><td class="right">${formatCurrency(cashReceived)}</td></tr>` : ''}
    ${transactionData.payment_method === 'cash' && change > 0 ? `<tr><td>Change:</td><td class="right">${formatCurrency(change)}</td></tr>` : ''}
  </table>

  <div class="line"></div>
  <div class="center bold" style="margin-top: 2mm; font-size: 15px;">Thank you!</div>
  <div class="center" style="font-size: 13px;">Please come again!</div>
  <div class="center" style="margin-top: 2mm; font-size: 11px;">Receipt #${escapeHtml(receiptNumber)}</div>
</body>
</html>`
  }

  const handlePrint = () => {
    const html = generateReceiptHTML()
    const printWindow = window.open('', '_blank')

    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    } else {
      alert('Please allow popups to print receipts')
    }
  }

  const handleDownload = () => {
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
    const width = 32
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

    const lines = []
    lines.push(center(branchInfo?.name))
    lines.push(center('SYSTEM'))
    if (branchInfo?.name) lines.push(center(branchInfo.name))
    if (branchInfo?.address) lines.push(center(branchInfo.address.substring(0, width)))
    if (branchInfo?.phone) lines.push(center(`Tel: ${branchInfo.phone}`))
    lines.push(separator)
    lines.push(center('OFFICIAL RECEIPT'))
    lines.push('')

    const receiptNumber = transactionData.receipt_number || transactionData.transaction_id || 'N/A'
    const timestamp = transactionData.timestamp || Date.now()
    lines.push(leftRight('Receipt No:', receiptNumber.substring(0, 15)))
    lines.push(leftRight('Date:', formatDate(timestamp).substring(0, 15)))
    lines.push(leftRight('Cashier:', (staffInfo?.username || 'Staff').substring(0, 15)))
    if (transactionData.barber_name) lines.push(leftRight('Barber:', transactionData.barber_name.substring(0, 15)))
    if (transactionData.customer_name) lines.push(leftRight('Customer:', transactionData.customer_name.substring(0, 15)))
    lines.push(separator)
    lines.push(leftRight('Item', 'Amount'))
    lines.push(dashedLine)

    if (transactionData.services?.length) {
      transactionData.services.forEach(service => {
        const name = (service.service_name || service.name || 'Service').substring(0, 20)
        lines.push(name)
        const qty = service.quantity || 1
        const price = service.price || 0
        lines.push(leftRight(`  ${qty}x ${formatCurrency(price)}`, formatCurrency(qty * price)))
      })
    }

    if (transactionData.products?.length) {
      transactionData.products.forEach(product => {
        const name = (product.product_name || product.name || 'Product').substring(0, 20)
        lines.push(name)
        const qty = product.quantity || 1
        const price = product.price || 0
        lines.push(leftRight(`  ${qty}x ${formatCurrency(price)}`, formatCurrency(qty * price)))
      })
    }

    lines.push(dashedLine)
    lines.push(leftRight('Subtotal:', formatCurrency(transactionData.subtotal || 0)))
    if (transactionData.discount_amount > 0) lines.push(leftRight('Discount:', `-${formatCurrency(transactionData.discount_amount)}`))
    if (transactionData.booking_fee > 0) lines.push(leftRight('Booking Fee:', `+${formatCurrency(transactionData.booking_fee)}`))
    if (transactionData.late_fee > 0) lines.push(leftRight('Late Fee:', `+${formatCurrency(transactionData.late_fee)}`))
    if (transactionData.tax_amount > 0) lines.push(leftRight('Tax:', formatCurrency(transactionData.tax_amount)))
    lines.push(separator)
    lines.push(leftRight('TOTAL:', formatCurrency(transactionData.total_amount || 0)))
    lines.push(separator)

    const paymentMethod = formatPaymentMethod(transactionData.payment_method)

    // Add booking info if available
    if (transactionData.booking_code) {
      lines.push('')
      lines.push(leftRight('Booking #:', transactionData.booking_code.substring(0, 15)))
      if (transactionData.booking_date) lines.push(leftRight('Booking Date:', transactionData.booking_date.substring(0, 15)))
      if (transactionData.booking_time) lines.push(leftRight('Booking Time:', transactionData.booking_time.substring(0, 15)))
      lines.push(dashedLine)
    }

    lines.push('')
    lines.push(leftRight('Payment:', paymentMethod))

    // Payment status
    if (transactionData.payment_status === 'paid') {
      lines.push(leftRight('Status:', 'FULLY PAID'))
    } else if (transactionData.payment_status === 'partial') {
      lines.push(leftRight('Status:', 'PARTIAL'))
    } else if (transactionData.payment_status === 'unpaid') {
      lines.push(leftRight('Status:', 'PAY AT SHOP'))
    }

    // Amount paid and due
    if (transactionData.amount_paid > 0) {
      lines.push(leftRight('Amount Paid:', formatCurrency(transactionData.amount_paid)))
    }
    if (transactionData.amount_due > 0) {
      lines.push(leftRight('Amount Due:', formatCurrency(transactionData.amount_due)))
    }

    if (transactionData.payment_method === 'cash') {
      if (transactionData.cash_received) lines.push(leftRight('Cash Received:', formatCurrency(transactionData.cash_received)))
      if (transactionData.change_amount) lines.push(leftRight('Change:', formatCurrency(transactionData.change_amount)))
    }

    lines.push('')
    lines.push(separator)
    lines.push('')
    lines.push(center('Thank you for your'))
    lines.push(center('business!'))
    lines.push(center('Please come again!'))
    lines.push('')

    return lines.join('\n')
  }

  // Determine header content based on payment status
  const getHeaderContent = () => {
    const status = transactionData.payment_status
    if (status === 'paid') {
      return {
        bgColor: 'bg-green-500/10 border-green-500/30',
        iconColor: 'text-green-400',
        title: 'Fully Paid',
        subtitle: 'This booking has been paid online'
      }
    } else if (status === 'partial') {
      return {
        bgColor: 'bg-yellow-500/10 border-yellow-500/30',
        iconColor: 'text-yellow-400',
        title: 'Partial Payment',
        subtitle: `₱${(transactionData.amount_paid || 0).toLocaleString()} paid online • ₱${(transactionData.amount_due || 0).toLocaleString()} due at shop`
      }
    } else if (status === 'unpaid') {
      return {
        bgColor: 'bg-blue-500/10 border-blue-500/30',
        iconColor: 'text-blue-400',
        title: 'Pay at Shop',
        subtitle: `Total due: ₱${(transactionData.total_amount || 0).toLocaleString()}`
      }
    }
    // Default - completed transaction
    return {
      bgColor: 'bg-green-500/10 border-green-500/30',
      iconColor: 'text-green-400',
      title: 'Payment Successful!',
      subtitle: 'Transaction completed successfully'
    }
  }

  const headerContent = getHeaderContent()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Receipt" size="md" variant="dark">
      <div className="space-y-4">
        <div className={`${headerContent.bgColor} border rounded-lg p-4 text-center`}>
          <CheckCircle className={`w-12 h-12 ${headerContent.iconColor} mx-auto mb-2`} />
          <h3 className="text-lg font-bold text-white mb-1">{headerContent.title}</h3>
          <p className="text-sm text-gray-400">{headerContent.subtitle}</p>
        </div>

        <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#444444] max-h-64 overflow-y-auto">
          <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
            {generateReceiptText()}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl hover:from-[var(--color-accent)] hover:to-[var(--color-accent)] transition-all flex items-center justify-center space-x-2"
          >
            <Printer className="w-5 h-5" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={handleDownload}
            className="py-3 border-2 border-[#555555] text-gray-300 font-semibold rounded-xl hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-all flex items-center justify-center space-x-2"
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
  )
}

export default ReceiptModal
