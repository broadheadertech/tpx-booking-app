import React, { useRef, useEffect } from 'react'
import Modal from '../common/Modal'
import { Printer, Download, X, CheckCircle } from 'lucide-react'

const ReceiptModal = ({ 
  isOpen, 
  onClose, 
  transactionData,
  branchInfo,
  staffInfo 
}) => {
  const printIframeRef = useRef(null)
  const isPrintingRef = useRef(false)

  if (!transactionData) return null

  // Cleanup iframe on unmount
  useEffect(() => {
    return () => {
      if (printIframeRef.current && printIframeRef.current.parentNode) {
        printIframeRef.current.parentNode.removeChild(printIframeRef.current)
        printIframeRef.current = null
      }
    }
  }, [])

  // Detect if running in Capacitor (native app)
  const isCapacitor = () => {
    return typeof window !== 'undefined' && window.Capacitor
  }

  const printHtmlWithIframe = (html) => {
    return new Promise((resolve) => {
      if (typeof document === 'undefined') {
        resolve(false)
        return
      }

      const iframe = document.createElement('iframe')
      printIframeRef.current = iframe

      iframe.style.position = 'fixed'
      iframe.style.right = '0'
      iframe.style.bottom = '0'
      iframe.style.width = '0'
      iframe.style.height = '0'
      iframe.style.border = '0'
      iframe.style.opacity = '0'
      iframe.style.pointerEvents = 'none'
      iframe.style.zIndex = '-1'

      let finished = false

      const cleanup = (success) => {
        if (finished) return
        finished = true

        requestAnimationFrame(() => {
          try {
            iframe.removeEventListener('load', handleLoad)
          } catch (_) {}

          try {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe)
            }
          } catch (_) {}

          if (printIframeRef.current === iframe) {
            printIframeRef.current = null
          }

          resolve(success)
        })
      }

      const handleLoad = () => {
        try {
          const frameWindow = iframe.contentWindow
          if (!frameWindow) throw new Error('Missing iframe window')

          const handleAfterPrint = () => cleanup(true)

          try {
            frameWindow.addEventListener('afterprint', handleAfterPrint)
          } catch (_) {
            frameWindow.onafterprint = handleAfterPrint
          }

          frameWindow.focus()

          setTimeout(() => {
            try {
              frameWindow.print()
              setTimeout(() => cleanup(true), 2000)
            } catch (err) {
              console.error('Iframe print failed:', err)
              cleanup(false)
            }
          }, 100)
        } catch (error) {
          console.error('Iframe print error:', error)
          cleanup(false)
        }
      }

      iframe.addEventListener('load', handleLoad)

      document.body.appendChild(iframe)

      const doc = iframe.contentDocument || iframe.contentWindow?.document
      if (!doc) {
        cleanup(false)
        return
      }

      doc.open()
      doc.write(html)
      doc.close()

      setTimeout(() => cleanup(false), 6000)
    })
  }

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

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  }

  // Build ESC/POS text with basic commands
  const generateEscPosText = () => {
    const ESC = '\x1B'
    const GS = '\x1D'
    const initialize = ESC + '@'
    const alignCenter = ESC + 'a' + '\x01'
    const alignLeft = ESC + 'a' + '\x00'
    const boldOn = ESC + 'E' + '\x01'
    const boldOff = ESC + 'E' + '\x00'
    const cutPartial = GS + 'V' + '\x42' + '\x00'
    const feed1 = '\n'
    const feed2 = '\n\n'
    const width = 32
    const padCenter = (text) => {
      const s = String(text || '')
      const len = Math.min(width, s.length)
      const left = Math.max(0, Math.floor((width - len) / 2))
      return ' '.repeat(left) + s.slice(0, width)
    }
    const leftRight = (left, right) => {
      const l = String(left || '')
      const r = String(right || '')
      const spaces = Math.max(1, width - l.length - r.length)
      return l + ' '.repeat(spaces) + r
    }
    const dash = '-'.repeat(width)
    const eq = '='.repeat(width)
    const lines = []
    lines.push(initialize)
    lines.push(alignCenter + boldOn + padCenter('TIPUNOX') + boldOff + feed1)
    lines.push(alignCenter + boldOn + padCenter('ANGELES BARBERSHOP') + boldOff + feed1)
    if (branchInfo?.name) lines.push(alignCenter + padCenter(branchInfo.name) + feed1)
    if (branchInfo?.address) lines.push(alignCenter + padCenter(branchInfo.address) + feed1)
    if (branchInfo?.phone) lines.push(alignCenter + padCenter(`Tel: ${branchInfo.phone}`) + feed1)
    lines.push(alignLeft + eq + feed1)
    lines.push(alignCenter + boldOn + padCenter('OFFICIAL RECEIPT') + boldOff + feed1)
    lines.push(alignLeft + leftRight('Receipt No:', String(transactionData.receipt_number || transactionData.transaction_id || 'N/A')) + feed1)
    lines.push(alignLeft + leftRight('Date:', formatDate(transactionData.timestamp || Date.now())) + feed1)
    lines.push(alignLeft + leftRight('Cashier:', String(staffInfo?.username || staffInfo?.full_name || 'Staff')) + feed1)
    if (transactionData.barber_name) lines.push(alignLeft + leftRight('Barber:', String(transactionData.barber_name)) + feed1)
    if (transactionData.customer_name) lines.push(alignLeft + leftRight('Customer:', String(transactionData.customer_name)) + feed1)
    lines.push(alignLeft + eq + feed1)
    lines.push(alignLeft + leftRight('Item', 'Amount') + feed1)
    lines.push(alignLeft + dash + feed1)
    if (transactionData.services?.length) {
      transactionData.services.forEach(service => {
        const name = String(service?.service_name || service?.name || 'Service')
        const qty = service?.quantity || 1
        const price = (service?.price || 0).toFixed(2)
        const total = (qty * (service?.price || 0)).toFixed(2)
        lines.push(alignLeft + boldOn + name.slice(0, width) + boldOff + feed1)
        lines.push(alignLeft + leftRight(`  ${qty}x PHP ${price}`, `PHP ${total}`) + feed1)
      })
    }
    if (transactionData.products?.length) {
      transactionData.products.forEach(product => {
        const name = String(product?.product_name || product?.name || 'Product')
        const qty = product?.quantity || 1
        const price = (product?.price || 0).toFixed(2)
        const total = (qty * (product?.price || 0)).toFixed(2)
        lines.push(alignLeft + boldOn + name.slice(0, width) + boldOff + feed1)
        lines.push(alignLeft + leftRight(`  ${qty}x PHP ${price}`, `PHP ${total}`) + feed1)
      })
    }
    lines.push(alignLeft + dash + feed1)
    lines.push(alignLeft + leftRight('Subtotal:', `PHP ${(transactionData.subtotal || 0).toFixed(2)}`) + feed1)
    if (transactionData.discount_amount > 0) lines.push(alignLeft + leftRight('Discount:', `-PHP ${transactionData.discount_amount.toFixed(2)}`) + feed1)
    if (transactionData.tax_amount > 0) lines.push(alignLeft + leftRight('Tax:', `PHP ${transactionData.tax_amount.toFixed(2)}`) + feed1)
    lines.push(alignLeft + eq + feed1)
    lines.push(alignLeft + boldOn + leftRight('TOTAL:', `PHP ${(transactionData.total_amount || 0).toFixed(2)}`) + boldOff + feed1)
    lines.push(alignLeft + eq + feed1)
    lines.push(alignLeft + leftRight('Payment:', String((transactionData.payment_method || 'cash').replace('_', ' ').toUpperCase())) + feed1)
    if (transactionData.payment_method === 'cash') {
      if (transactionData.cash_received) lines.push(alignLeft + leftRight('Cash Received:', `PHP ${transactionData.cash_received.toFixed(2)}`) + feed1)
      if (transactionData.change_amount) lines.push(alignLeft + leftRight('Change:', `PHP ${transactionData.change_amount.toFixed(2)}`) + feed1)
    }
    lines.push(feed1)
    lines.push(alignCenter + boldOn + padCenter('Thank you for your business!') + boldOff + feed1)
    lines.push(alignCenter + padCenter('Please come again!') + feed1)
    lines.push(feed2)
    lines.push(cutPartial)
    return lines.join('')
  }

  const tryAndroidEscPosPrint = () => {
    try {
      if (typeof window !== 'undefined' && window.Android && typeof window.Android.printText === 'function') {
        const payload = generateEscPosText()
        window.Android.printText(payload)
        return true
      }
    } catch (_) {}
    return false
  }

  const handlePrint = async () => {
    try {
      if (isPrintingRef.current) return
      isPrintingRef.current = true

      // 1) ESC/POS via Android bridge (direct thermal printing)
      const androidOk = tryAndroidEscPosPrint()
      if (androidOk) {
        return
      }

      const simpleHTML = generateSimpleThermalHTML()

      // 2) Capacitor native printing (for mobile apps)
      if (isCapacitor() && window.Capacitor?.Plugins?.Printer) {
        try {
          await window.Capacitor.Plugins.Printer.print({
            html: simpleHTML,
            name: `Receipt-${transactionData.receipt_number || transactionData.transaction_id}`,
          })
          return
        } catch (err) {
          console.warn('Capacitor print failed:', err)
        }
      }

      // 3) Hidden iframe printing (best compatibility for browsers & Android WebViews)
      const iframePrinted = await printHtmlWithIframe(simpleHTML)
      if (iframePrinted) {
        return
      }

      // 4) window.open fallback
      const printWindow = window.open('', '_blank', 'width=300,height=600,menubar=no,toolbar=no,location=no')
      
      if (printWindow) {
        try {
          printWindow.document.open()
          printWindow.document.write(simpleHTML)
          printWindow.document.close()
        } catch (err) {
          console.error('Unable to write receipt HTML to new window:', err)
        }
        
        const triggerPrint = () => {
          try {
            printWindow.focus()
            printWindow.print()
          } catch (err) {
            console.error('window.print() fallback failed:', err)
          }
        }

        if ('onload' in printWindow) {
          printWindow.onload = () => setTimeout(triggerPrint, 150)
        } else {
          setTimeout(triggerPrint, 250)
        }
      } else {
        alert('Please allow popups to print receipts')
      }
    } catch (error) {
      console.error('Print error:', error)
      alert('Printing failed. Please try again or contact support.')
    } finally {
      setTimeout(() => {
        isPrintingRef.current = false
      }, 750)
    }
  }

  // Generate simplified HTML optimized for thermal printers (58mm paper)
  const generateSimpleThermalHTML = () => {
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

    const formatCurrencyValue = (value) => {
      const amount = Number.isFinite(Number(value)) ? Number(value) : 0
      return `₱${amount.toFixed(2)}`
    }

    const sanitizePaymentMethod = () => escapeHtml((transactionData.payment_method || 'cash').replace(/_/g, ' ').toUpperCase())

    const servicesHtml = Array.isArray(transactionData.services)
      ? transactionData.services.map((service) => {
          const quantity = Number(service?.quantity || 1)
          const price = Number(service?.price || 0)
          const total = quantity * price
          const name = escapeHtml(service?.service_name || service?.name || 'Service')
          const unitText = escapeHtml(`${quantity}x ${formatCurrencyValue(price)}`)

          return `
    <div class="bold">${name}</div>
    <table class="small">
      <tr>
        <td>${unitText}</td>
        <td class="right">${formatCurrencyValue(total)}</td>
      </tr>
    </table>
    `
        }).join('')
      : ''

    const productsHtml = Array.isArray(transactionData.products)
      ? transactionData.products.map((product) => {
          const quantity = Number(product?.quantity || 1)
          const price = Number(product?.price || 0)
          const total = quantity * price
          const name = escapeHtml(product?.product_name || product?.name || 'Product')
          const unitText = escapeHtml(`${quantity}x ${formatCurrencyValue(price)}`)

          return `
    <div class="bold">${name}</div>
    <table class="small">
      <tr>
        <td>${unitText}</td>
        <td class="right">${formatCurrencyValue(total)}</td>
      </tr>
    </table>
    `
        }).join('')
      : ''

    const discountAmount = Number(transactionData.discount_amount || 0)
    const taxAmount = Number(transactionData.tax_amount || 0)
    const subtotalAmount = Number(transactionData.subtotal || 0)
    const totalAmount = Number(transactionData.total_amount || 0)
    const cashReceived = Number(transactionData.cash_received || 0)
    const changeAmount = Number(transactionData.change_amount || 0)

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=58mm">
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
    body { 
      width: 58mm;
      min-width: 58mm;
      max-width: 58mm;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      line-height: 1.4;
      padding: 2mm;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @media print {
      body { width: 58mm; min-width: 58mm; max-width: 58mm; }
    }
    .center { text-align: center; display: block; }
    .bold { font-weight: bold; }
    .line { border-bottom: 1px dashed #000; margin: 2mm 0; }
    .line2 { border-bottom: 1px solid #000; margin: 2mm 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 1px 0; vertical-align: top; }
    .right { text-align: right; }
    .small { font-size: 8px; }
    .section { margin-bottom: 2mm; display: block; }
  </style>
</head>
<body>
  <span class="center bold" style="font-size: 12px;">${escapeHtml('TIPUNOX')}</span>
  <span class="center bold">${escapeHtml('ANGELES BARBERSHOP')}</span>
  ${branchInfo?.name ? `<span class="center small">${escapeHtml(branchInfo.name)}</span>` : ''}
  ${branchInfo?.address ? `<span class="center small">${escapeHtml(branchInfo.address)}</span>` : ''}
  ${branchInfo?.phone ? `<span class="center small">Tel: ${escapeHtml(branchInfo.phone)}</span>` : ''}
  <div class="line"></div>
  
  <span class="center bold">OFFICIAL RECEIPT</span>
  <div class="line"></div>
  
  <div class="section">
    <table class="small">
      <tr><td>Receipt No:</td><td class="right">${escapeHtml(receiptNumber)}</td></tr>
      <tr><td>Date:</td><td class="right">${escapeHtml(dateStr)}</td></tr>
      <tr><td>Time:</td><td class="right">${escapeHtml(timeStr)}</td></tr>
      <tr><td>Cashier:</td><td class="right">${escapeHtml(staffInfo?.username || staffInfo?.full_name || 'Staff')}</td></tr>
      ${transactionData.barber_name ? `<tr><td>Barber:</td><td class="right">${escapeHtml(transactionData.barber_name)}</td></tr>` : ''}
      ${transactionData.customer_name ? `<tr><td>Customer:</td><td class="right">${escapeHtml(transactionData.customer_name)}</td></tr>` : ''}
    </table>
  </div>
  <div class="line2"></div>
  
  ${servicesHtml}
  ${productsHtml}
  
  <div class="line"></div>
  <table>
    <tr><td class="bold">Subtotal:</td><td class="right bold">${formatCurrencyValue(subtotalAmount)}</td></tr>
    ${discountAmount > 0 ? `<tr><td class="bold">Discount:</td><td class="right bold">-${formatCurrencyValue(discountAmount)}</td></tr>` : ''}
    ${taxAmount > 0 ? `<tr><td class="bold">Tax:</td><td class="right bold">${formatCurrencyValue(taxAmount)}</td></tr>` : ''}
  </table>
  <div class="line2"></div>
  
  <table style="font-size: 11px;">
    <tr><td class="bold">TOTAL:</td><td class="right bold">${formatCurrencyValue(totalAmount)}</td></tr>
  </table>
  <div class="line2"></div>
  
  <table class="small">
    <tr><td class="bold">Payment:</td><td class="right">${sanitizePaymentMethod()}</td></tr>
    ${transactionData.payment_method === 'cash' && cashReceived ? `<tr><td>Cash:</td><td class="right">${formatCurrencyValue(cashReceived)}</td></tr>` : ''}
    ${transactionData.payment_method === 'cash' && changeAmount ? `<tr><td>Change:</td><td class="right">${formatCurrencyValue(changeAmount)}</td></tr>` : ''}
  </table>
  
  <div class="line"></div>
  <span class="center bold" style="margin-top: 3mm;">Thank you!</span>
  <span class="center small">Please come again!</span>
  <span class="center small" style="margin-top: 2mm;">Receipt #${escapeHtml(receiptNumber)}</span>
  <br>
</body>
</html>`
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
    const width = 32 // Characters width for 58mm paper (approximately 32 chars at 11px font)
    
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
    lines.push(center('TIPUNOX'))
    lines.push(center('ANGELES BARBERSHOP'))
    if (branchInfo?.name) {
      lines.push(center(branchInfo.name))
    }
    if (branchInfo?.address) {
      lines.push(center(branchInfo.address.substring(0, width)))
    }
    if (branchInfo?.phone) {
      lines.push(center(`Tel: ${branchInfo.phone}`))
    }
    lines.push(separator)
    
    // Transaction Info
    lines.push(center('OFFICIAL RECEIPT'))
    lines.push('')
    lines.push(leftRight('Receipt No:', (transactionData.receipt_number || transactionData.transaction_id || 'N/A').substring(0, 15)))
    lines.push(leftRight('Date:', formatDate(transactionData.timestamp || Date.now()).substring(0, 15)))
    lines.push(leftRight('Cashier:', (staffInfo?.username || 'Staff').substring(0, 15)))
    if (transactionData.barber_name) {
      lines.push(leftRight('Barber:', transactionData.barber_name.substring(0, 15)))
    }
    if (transactionData.customer_name) {
      lines.push(leftRight('Customer:', transactionData.customer_name.substring(0, 15)))
    }
    lines.push(separator)
    
    // Items Header
    lines.push(leftRight('Item', 'Amount'))
    lines.push(dashedLine)
    
    // Services
    if (transactionData.services && transactionData.services.length > 0) {
      transactionData.services.forEach(service => {
        const name = (service.service_name || service.name || 'Service').substring(0, 20)
        lines.push(name)
        const detailLine = leftRight(
          `  ${service.quantity || 1}x ₱${(service.price || 0).toFixed(2)}`,
          `₱${((service.quantity || 1) * (service.price || 0)).toFixed(2)}`
        )
        lines.push(detailLine)
      })
    }
    
    // Products
    if (transactionData.products && transactionData.products.length > 0) {
      transactionData.products.forEach(product => {
        const name = (product.product_name || product.name || 'Product').substring(0, 20)
        lines.push(name)
        const detailLine = leftRight(
          `  ${product.quantity || 1}x ₱${(product.price || 0).toFixed(2)}`,
          `₱${((product.quantity || 1) * (product.price || 0)).toFixed(2)}`
        )
        lines.push(detailLine)
      })
    }
    
    lines.push(dashedLine)
    
    // Totals
    lines.push(leftRight('Subtotal:', `₱${(transactionData.subtotal || 0).toFixed(2)}`))
    
    if (transactionData.discount_amount > 0) {
      lines.push(leftRight('Discount:', `-₱${transactionData.discount_amount.toFixed(2)}`))
    }
    
    if (transactionData.tax_amount > 0) {
      lines.push(leftRight('Tax:', `₱${transactionData.tax_amount.toFixed(2)}`))
    }
    
    lines.push(separator)
    lines.push(leftRight('TOTAL:', `₱${(transactionData.total_amount || 0).toFixed(2)}`))
    lines.push(separator)
    
    // Payment Info
    lines.push('')
    const paymentMethodLabel = (transactionData.payment_method || 'cash').replace('_', ' ').toUpperCase()
    lines.push(leftRight('Payment:', paymentMethodLabel))
    
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
    lines.push(center('Thank you for your'))
    lines.push(center('business!'))
    lines.push(center('Please come again!'))
    lines.push('')
    lines.push(center('Official receipt'))
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

    </>
  )
}

export default ReceiptModal
