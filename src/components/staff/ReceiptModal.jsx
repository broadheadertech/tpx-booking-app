import Modal from '../common/Modal'
import { Printer, Download, CheckCircle } from 'lucide-react'
import { useAppModal } from '../../context/AppModalContext'

const ReceiptModal = ({
  isOpen,
  onClose,
  transactionData,
  branchInfo,
  staffInfo
}) => {
  const { showAlert } = useAppModal()
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

  // Resolve BIR display values from transaction snapshot first, then branch fallback.
  const bir = {
    businessName: transactionData.business_name_snapshot || branchInfo?.business_name || branchInfo?.name || '',
    businessStyle: transactionData.business_style_snapshot || branchInfo?.business_style || '',
    address: transactionData.business_address_snapshot || branchInfo?.registered_address || branchInfo?.address || '',
    tin: transactionData.business_tin_snapshot || branchInfo?.tin || '',
    vatRegistered: typeof transactionData.vat_registered_snapshot === 'boolean'
      ? transactionData.vat_registered_snapshot
      : Boolean(branchInfo?.vat_registered),
    ptuNumber: transactionData.ptu_number_snapshot || branchInfo?.ptu_number || '',
    ptuDate: transactionData.ptu_date_snapshot || branchInfo?.ptu_date_issued || '',
    minNumber: transactionData.min_number_snapshot || branchInfo?.min_number || '',
    posSerial: transactionData.pos_serial_snapshot || branchInfo?.pos_serial_number || '',
    accreditation: transactionData.accreditation_snapshot || branchInfo?.accreditation_number || '',
    softwareProvider: transactionData.software_provider_snapshot || {
      name: branchInfo?.software_provider_name,
      tin: branchInfo?.software_provider_tin,
      accreditation: branchInfo?.software_provider_accreditation,
      date_issued: branchInfo?.software_provider_date_issued,
    },
  }

  const generateReceiptHTML = () => {
    const receiptNumber = transactionData.receipt_number || transactionData.transaction_id || 'N/A'
    const timestamp = transactionData.timestamp || transactionData.createdAt || Date.now()
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

    const discountType = transactionData.discount_type || 'regular'
    const isScPwd = discountType === 'senior' || discountType === 'pwd'
    const scPwdLabel = discountType === 'senior' ? 'SC Discount (20%)' : 'PWD Discount (20%)'
    const vatable = Number(transactionData.vatable_sales || 0)
    const vatExempt = Number(transactionData.vat_exempt_sales || 0)
    const zeroRated = Number(transactionData.zero_rated_sales || 0)
    const vatAmount = Number(transactionData.vat_amount || tax || 0)

    const customerName = transactionData.customer_name || 'Walk-in Customer'
    const customerAddr = transactionData.customer_address || ''
    const customerTin = transactionData.customer_tin || ''
    const customerStyle = transactionData.customer_business_style || ''

    const tinLabel = bir.vatRegistered ? 'VAT REG TIN' : 'NON-VAT REG TIN'

    const headerLines = [
      bir.businessName ? `<div class="center bold" style="font-size: 13px;">${escapeHtml(bir.businessName)}</div>` : '',
      bir.businessStyle ? `<div class="center" style="font-size: 11px;">${escapeHtml(bir.businessStyle)}</div>` : '',
      bir.address ? `<div class="center" style="font-size: 11px;">${escapeHtml(bir.address)}</div>` : '',
      bir.tin ? `<div class="center" style="font-size: 11px;">${tinLabel}: ${escapeHtml(bir.tin)}</div>` : '',
      branchInfo?.phone ? `<div class="center" style="font-size: 11px;">Tel: ${escapeHtml(branchInfo.phone)}</div>` : '',
    ].filter(Boolean).join('')

    const vatHtml = bir.vatRegistered ? `
      <table style="font-size: 12px;">
        <tr><td>VATable Sales:</td><td class="right">${formatCurrency(vatable)}</td></tr>
        <tr><td>VAT-Exempt Sales:</td><td class="right">${formatCurrency(vatExempt)}</td></tr>
        <tr><td>Zero-Rated Sales:</td><td class="right">${formatCurrency(zeroRated)}</td></tr>
        <tr><td>VAT (12%):</td><td class="right">${formatCurrency(vatAmount)}</td></tr>
      </table>
      <div class="line"></div>
    ` : ''

    const scPwdHtml = isScPwd ? `
      <table style="font-size: 12px;">
        <tr><td>${scPwdLabel}:</td><td class="right">-${formatCurrency(discount)}</td></tr>
        ${transactionData.sc_pwd_id_number ? `<tr><td colspan="2" style="font-size: 11px;">SC/PWD ID: ${escapeHtml(transactionData.sc_pwd_id_number)}</td></tr>` : ''}
        ${transactionData.sc_pwd_name ? `<tr><td colspan="2" style="font-size: 11px;">Name: ${escapeHtml(transactionData.sc_pwd_name)}</td></tr>` : ''}
        <tr><td colspan="2" style="font-size: 11px;">Signature: ____________________</td></tr>
      </table>
      <div class="line"></div>
    ` : (discount > 0 ? `
      <table style="font-size: 12px;">
        <tr><td>Discount:</td><td class="right">-${formatCurrency(discount)}</td></tr>
      </table>
      <div class="line"></div>
    ` : '')

    const softwareHtml = bir.softwareProvider?.name ? `
      <div style="font-size: 10px;">Software: ${escapeHtml(bir.softwareProvider.name)}</div>
      ${bir.softwareProvider.tin ? `<div style="font-size: 10px;">&nbsp;TIN: ${escapeHtml(bir.softwareProvider.tin)}</div>` : ''}
      ${bir.softwareProvider.accreditation ? `<div style="font-size: 10px;">&nbsp;Accred: ${escapeHtml(bir.softwareProvider.accreditation)}</div>` : ''}
      ${bir.softwareProvider.date_issued ? `<div style="font-size: 10px;">&nbsp;Date Issued: ${escapeHtml(bir.softwareProvider.date_issued)}</div>` : ''}
    ` : ''

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${escapeHtml(receiptNumber)}</title>
  <style>
    @page { size: 58mm auto; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 58mm; min-width: 58mm; max-width: 58mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px; line-height: 1.35;
      padding: 2mm 4mm;
      color: #000; background: #fff;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    @media print {
      html, body {
        width: 100% !important; max-width: 100% !important;
        margin: 0 !important; padding: 2mm 4mm !important;
      }
    }
    .center { text-align: center; width: 100%; display: block; }
    .bold { font-weight: bold; }
    .right { text-align: right; }
    .line { border-bottom: 1px dashed #000; margin: 2mm 0; width: 100%; display: block; }
    .line2 { border-bottom: 2px solid #000; margin: 2mm 0; width: 100%; display: block; }
    table { width: 100%; border-collapse: collapse; margin: 1mm 0; }
    td { padding: 2px 0; vertical-align: top; }
    td:first-child { padding-right: 5mm; }
    td:last-child { text-align: right; }
  </style>
</head>
<body>
  ${headerLines}
  <div class="line"></div>

  <div class="center bold" style="font-size: 15px; margin: 1mm 0;">OFFICIAL RECEIPT</div>
  <div class="center bold" style="font-size: 13px; margin-bottom: 1.5mm;">${escapeHtml(receiptNumber)}</div>
  <div class="line"></div>

  <table style="font-size: 12px;">
    <tr><td>Date:</td><td class="right">${escapeHtml(dateStr)}</td></tr>
    <tr><td>Time:</td><td class="right">${escapeHtml(timeStr)}</td></tr>
    <tr><td>Cashier:</td><td class="right">${escapeHtml(staffInfo?.username || staffInfo?.full_name || 'Staff')}</td></tr>
    ${transactionData.barber_name ? `<tr><td>Barber:</td><td class="right">${escapeHtml(transactionData.barber_name)}</td></tr>` : ''}
  </table>
  <div class="line"></div>

  <div style="font-size: 11px;"><span class="bold">Sold to:</span> ${escapeHtml(customerName)}</div>
  ${customerAddr ? `<div style="font-size: 11px;">Address: ${escapeHtml(customerAddr)}</div>` : ''}
  ${customerTin ? `<div style="font-size: 11px;">TIN: ${escapeHtml(customerTin)}</div>` : ''}
  ${customerStyle ? `<div style="font-size: 11px;">Business Style: ${escapeHtml(customerStyle)}</div>` : ''}
  <div class="line2"></div>

  <table style="font-size: 14px;">
    ${servicesHtml}
    ${productsHtml}
  </table>
  <div class="line"></div>

  <table style="font-size: 13px;">
    <tr><td class="bold">Subtotal:</td><td class="right bold">${formatCurrency(subtotal)}</td></tr>
    ${bookingFee > 0 ? `<tr><td>Booking Fee:</td><td class="right">+${formatCurrency(bookingFee)}</td></tr>` : ''}
    ${lateFee > 0 ? `<tr><td>Late Fee:</td><td class="right">+${formatCurrency(lateFee)}</td></tr>` : ''}
  </table>
  <div class="line"></div>

  ${vatHtml}
  ${scPwdHtml}

  <table style="font-size: 16px; margin: 1.5mm 0;">
    <tr><td class="bold">TOTAL DUE:</td><td class="right bold">${formatCurrency(total)}</td></tr>
  </table>
  <div class="line2"></div>

  ${bookingCode ? `
  <table style="font-size: 11px; margin-bottom: 1mm;">
    <tr><td>Booking #:</td><td class="right">${escapeHtml(bookingCode)}</td></tr>
    ${bookingDate ? `<tr><td>Booking Date:</td><td class="right">${escapeHtml(bookingDate)}</td></tr>` : ''}
    ${bookingTime ? `<tr><td>Booking Time:</td><td class="right">${escapeHtml(bookingTime)}</td></tr>` : ''}
  </table>
  <div class="line"></div>
  ` : ''}

  <table style="font-size: 12px;">
    <tr><td class="bold">Payment:</td><td class="right">${paymentMethod}</td></tr>
    ${paymentStatus === 'paid' ? `<tr><td>Status:</td><td class="right">FULLY PAID</td></tr>` : ''}
    ${paymentStatus === 'partial' ? `<tr><td>Status:</td><td class="right">PARTIAL</td></tr>` : ''}
    ${paymentStatus === 'unpaid' ? `<tr><td>Status:</td><td class="right">PAY AT SHOP</td></tr>` : ''}
    ${amountPaid > 0 ? `<tr><td>Amount Paid:</td><td class="right">${formatCurrency(amountPaid)}</td></tr>` : ''}
    ${amountDue > 0 ? `<tr><td class="bold">Amount Due:</td><td class="right bold">${formatCurrency(amountDue)}</td></tr>` : ''}
    ${transactionData.payment_method === 'cash' && cashReceived > 0 ? `<tr><td>Cash:</td><td class="right">${formatCurrency(cashReceived)}</td></tr>` : ''}
    ${transactionData.payment_method === 'cash' && change > 0 ? `<tr><td>Change:</td><td class="right">${formatCurrency(change)}</td></tr>` : ''}
  </table>
  <div class="line"></div>

  <div style="font-size: 11px; margin-top: 2mm;">Cashier / Authorized Representative:</div>
  <div style="font-size: 11px;">____________________________</div>
  <div class="line"></div>

  <div style="font-size: 10px;">
    ${bir.posSerial ? `<div>POS S/N: ${escapeHtml(bir.posSerial)}</div>` : ''}
    ${bir.minNumber ? `<div>MIN: ${escapeHtml(bir.minNumber)}</div>` : ''}
    ${bir.ptuNumber ? `<div>PTU No: ${escapeHtml(bir.ptuNumber)}${bir.ptuDate ? ` (${escapeHtml(bir.ptuDate)})` : ''}</div>` : ''}
    ${bir.accreditation ? `<div>Accred No: ${escapeHtml(bir.accreditation)}</div>` : ''}
    ${softwareHtml}
  </div>
  <div class="line"></div>

  <div class="center" style="font-size: 10px; line-height: 1.3;">
    THIS INVOICE/RECEIPT SHALL BE VALID FOR FIVE (5) YEARS FROM THE DATE OF THE PERMIT TO USE.
  </div>
  ${!bir.vatRegistered ? `
  <div class="center bold" style="font-size: 10px; margin-top: 1.5mm; line-height: 1.3;">
    THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX.
  </div>
  ` : ''}

  <div class="center bold" style="margin-top: 2mm; font-size: 13px;">Thank you!</div>
  <div class="center" style="font-size: 11px;">Please come again.</div>
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
      showAlert({ title: 'Popups Blocked', message: 'Please allow popups to print receipts', type: 'warning' })
    }
  }

  const handleDownload = () => {
    const receiptText = generateReceiptText()
    const blob = new Blob([receiptText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `receipt-${transactionData.receipt_number || transactionData.transaction_id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const generateReceiptText = () => {
    const width = 32
    const center = (text) => {
      const t = String(text || '')
      const padding = Math.max(0, Math.floor((width - t.length) / 2))
      return ' '.repeat(padding) + t
    }
    const leftRight = (left, right) => {
      const l = String(left || '')
      const r = String(right || '')
      const spaces = width - l.length - r.length
      return l + ' '.repeat(Math.max(1, spaces)) + r
    }
    const separator = '='.repeat(width)
    const dashedLine = '-'.repeat(width)

    const lines = []
    if (bir.businessName) lines.push(center(bir.businessName))
    if (bir.businessStyle) lines.push(center(bir.businessStyle))
    if (bir.address) lines.push(center(bir.address.substring(0, width)))
    if (bir.tin) lines.push(center(`${bir.vatRegistered ? 'VAT REG TIN' : 'NON-VAT REG TIN'}: ${bir.tin}`))
    if (branchInfo?.phone) lines.push(center(`Tel: ${branchInfo.phone}`))
    lines.push(separator)
    lines.push(center('OFFICIAL RECEIPT'))
    const receiptNumber = transactionData.receipt_number || transactionData.transaction_id || 'N/A'
    lines.push(center(receiptNumber))
    lines.push(separator)

    const timestamp = transactionData.timestamp || transactionData.createdAt || Date.now()
    lines.push(leftRight('Date:', formatDate(timestamp)))
    lines.push(leftRight('Time:', formatTime(timestamp)))
    lines.push(leftRight('Cashier:', (staffInfo?.username || 'Staff').substring(0, 18)))
    if (transactionData.barber_name) lines.push(leftRight('Barber:', transactionData.barber_name.substring(0, 18)))
    lines.push(dashedLine)

    lines.push(`Sold to: ${transactionData.customer_name || 'Walk-in Customer'}`)
    if (transactionData.customer_address) lines.push(`Address: ${transactionData.customer_address}`)
    if (transactionData.customer_tin) lines.push(`TIN: ${transactionData.customer_tin}`)
    if (transactionData.customer_business_style) lines.push(`Style: ${transactionData.customer_business_style}`)
    lines.push(separator)

    lines.push(leftRight('Item', 'Amount'))
    lines.push(dashedLine)
    if (transactionData.services?.length) {
      transactionData.services.forEach(service => {
        const name = (service.service_name || service.name || 'Service').substring(0, 24)
        lines.push(name)
        const qty = service.quantity || 1
        const price = service.price || 0
        lines.push(leftRight(`  ${qty}x ${formatCurrency(price)}`, formatCurrency(qty * price)))
      })
    }
    if (transactionData.products?.length) {
      transactionData.products.forEach(product => {
        const name = (product.product_name || product.name || 'Product').substring(0, 24)
        lines.push(name)
        const qty = product.quantity || 1
        const price = product.price || 0
        lines.push(leftRight(`  ${qty}x ${formatCurrency(price)}`, formatCurrency(qty * price)))
      })
    }
    lines.push(dashedLine)

    lines.push(leftRight('Subtotal:', formatCurrency(transactionData.subtotal || 0)))
    if (transactionData.booking_fee > 0) lines.push(leftRight('Booking Fee:', `+${formatCurrency(transactionData.booking_fee)}`))
    if (transactionData.late_fee > 0) lines.push(leftRight('Late Fee:', `+${formatCurrency(transactionData.late_fee)}`))
    lines.push(dashedLine)

    if (bir.vatRegistered) {
      lines.push(leftRight('VATable Sales:', formatCurrency(transactionData.vatable_sales || 0)))
      lines.push(leftRight('VAT-Exempt:', formatCurrency(transactionData.vat_exempt_sales || 0)))
      lines.push(leftRight('Zero-Rated:', formatCurrency(transactionData.zero_rated_sales || 0)))
      lines.push(leftRight('VAT (12%):', formatCurrency(transactionData.vat_amount || transactionData.tax_amount || 0)))
      lines.push(dashedLine)
    }

    const dType = transactionData.discount_type
    if ((dType === 'senior' || dType === 'pwd') && transactionData.discount_amount > 0) {
      const label = dType === 'senior' ? 'SC Discount (20%):' : 'PWD Discount (20%):'
      lines.push(leftRight(label, `-${formatCurrency(transactionData.discount_amount)}`))
      if (transactionData.sc_pwd_id_number) lines.push(`SC/PWD ID: ${transactionData.sc_pwd_id_number}`)
      if (transactionData.sc_pwd_name) lines.push(`Name: ${transactionData.sc_pwd_name}`)
      lines.push('Signature: __________________')
      lines.push(dashedLine)
    } else if (transactionData.discount_amount > 0) {
      lines.push(leftRight('Discount:', `-${formatCurrency(transactionData.discount_amount)}`))
      lines.push(dashedLine)
    }

    lines.push(leftRight('TOTAL DUE:', formatCurrency(transactionData.total_amount || 0)))
    lines.push(separator)

    if (transactionData.booking_code) {
      lines.push(leftRight('Booking #:', transactionData.booking_code.substring(0, 18)))
      if (transactionData.booking_date) lines.push(leftRight('Booking Date:', transactionData.booking_date.substring(0, 18)))
      if (transactionData.booking_time) lines.push(leftRight('Booking Time:', transactionData.booking_time.substring(0, 18)))
      lines.push(dashedLine)
    }

    lines.push(leftRight('Payment:', formatPaymentMethod(transactionData.payment_method)))
    if (transactionData.payment_status === 'paid') lines.push(leftRight('Status:', 'FULLY PAID'))
    else if (transactionData.payment_status === 'partial') lines.push(leftRight('Status:', 'PARTIAL'))
    else if (transactionData.payment_status === 'unpaid') lines.push(leftRight('Status:', 'PAY AT SHOP'))
    if (transactionData.amount_paid > 0) lines.push(leftRight('Amount Paid:', formatCurrency(transactionData.amount_paid)))
    if (transactionData.amount_due > 0) lines.push(leftRight('Amount Due:', formatCurrency(transactionData.amount_due)))
    if (transactionData.payment_method === 'cash') {
      if (transactionData.cash_received) lines.push(leftRight('Cash:', formatCurrency(transactionData.cash_received)))
      if (transactionData.change_amount) lines.push(leftRight('Change:', formatCurrency(transactionData.change_amount)))
    }
    lines.push(dashedLine)

    lines.push('Cashier / Authorized Rep:')
    lines.push('__________________________')
    lines.push(dashedLine)

    if (bir.posSerial) lines.push(`POS S/N: ${bir.posSerial}`)
    if (bir.minNumber) lines.push(`MIN: ${bir.minNumber}`)
    if (bir.ptuNumber) lines.push(`PTU: ${bir.ptuNumber}${bir.ptuDate ? ` (${bir.ptuDate})` : ''}`)
    if (bir.accreditation) lines.push(`Accred: ${bir.accreditation}`)
    if (bir.softwareProvider?.name) {
      lines.push(`Software: ${bir.softwareProvider.name}`)
      if (bir.softwareProvider.tin) lines.push(`  TIN: ${bir.softwareProvider.tin}`)
      if (bir.softwareProvider.accreditation) lines.push(`  Accred: ${bir.softwareProvider.accreditation}`)
      if (bir.softwareProvider.date_issued) lines.push(`  Date: ${bir.softwareProvider.date_issued}`)
    }
    lines.push(dashedLine)
    lines.push(center('VALID FOR 5 YEARS FROM'))
    lines.push(center('THE DATE OF PERMIT TO USE.'))
    if (!bir.vatRegistered) {
      lines.push('')
      lines.push(center('NOT VALID FOR CLAIM OF'))
      lines.push(center('INPUT TAX.'))
    }
    lines.push('')
    lines.push(center('Thank you!'))
    lines.push(center('Please come again.'))

    return lines.join('\n')
  }

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
