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

  // Detect Android device
  const isAndroid = () => {
    if (typeof window === 'undefined') return false
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    return /Android/i.test(userAgent)
  }

  // Detect if running in Capacitor (native app)
  const isCapacitor = () => {
    return typeof window !== 'undefined' && window.Capacitor
  }

  // Detect mobile device
  const isMobile = () => {
    if (typeof window === 'undefined') return false
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
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

  const handlePrint = () => {
    try {
      const receiptHTML = generateReceiptHTML()
      const fullHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${transactionData.receipt_number || transactionData.transaction_id}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              @page {
                size: 58mm auto;
                margin: 0;
              }
              
              body {
                font-family: 'Courier New', Courier, monospace;
                width: 58mm;
                max-width: 58mm;
                padding: 5mm 4mm;
                font-size: 11px;
                line-height: 1.3;
                color: #000;
                background: #fff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              
              @media print {
                body {
                  padding: 5mm 4mm;
                  margin: 0;
                }
                
                .no-print {
                  display: none !important;
                }
              }
              
              .receipt-container {
                width: 100%;
                max-width: 50mm;
                margin: 0 auto;
              }
              
              .header {
                text-align: center;
                margin-bottom: 8px;
                border-bottom: 1px dashed #000;
                padding-bottom: 6px;
              }
              
              .business-name {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 2px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              
              .branch-name {
                font-size: 11px;
                font-weight: bold;
                margin-bottom: 2px;
              }
              
              .address, .phone {
                font-size: 9px;
                margin-bottom: 1px;
              }
              
              .separator {
                border-top: 1px dashed #000;
                margin: 6px 0;
              }
              
              .separator-thick {
                border-top: 2px solid #000;
                margin: 6px 0;
              }
              
              .receipt-title {
                text-align: center;
                font-size: 12px;
                font-weight: bold;
                margin: 6px 0;
                text-transform: uppercase;
              }
              
              .info-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
                font-size: 10px;
              }
              
              .info-label {
                font-weight: bold;
              }
              
              .info-value {
                text-align: right;
              }
              
              .items-header {
                display: flex;
                justify-content: space-between;
                margin: 6px 0 4px 0;
                font-weight: bold;
                font-size: 10px;
                border-bottom: 1px solid #000;
                padding-bottom: 2px;
              }
              
              .item-row {
                margin-bottom: 4px;
                font-size: 10px;
              }
              
              .item-name {
                font-weight: bold;
                margin-bottom: 1px;
              }
              
              .item-details {
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                padding-left: 4px;
              }
              
              .totals {
                margin-top: 6px;
              }
              
              .total-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 2px;
                font-size: 10px;
              }
              
              .total-label {
                font-weight: bold;
              }
              
              .total-amount {
                font-weight: bold;
                text-align: right;
              }
              
              .grand-total {
                font-size: 12px;
                font-weight: bold;
                margin-top: 4px;
              }
              
              .payment-info {
                margin-top: 6px;
                font-size: 10px;
              }
              
              .footer {
                text-align: center;
                margin-top: 10px;
                font-size: 9px;
                border-top: 1px dashed #000;
                padding-top: 6px;
              }
              
              .thank-you {
                font-weight: bold;
                margin-bottom: 4px;
              }
              
              .footer-note {
                font-size: 8px;
                margin-top: 4px;
              }
              
              .barcode-area {
                text-align: center;
                margin: 8px 0;
                padding: 4px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
              }
              
              .receipt-number {
                font-family: 'Courier New', monospace;
                font-size: 10px;
                letter-spacing: 1px;
              }
            </style>
          </head>
          <body>
            ${receiptHTML}
          </body>
        </html>
      `

      // For Android, mobile devices, and Capacitor apps, use iframe approach
      if (isAndroid() || isMobile() || isCapacitor()) {
        // Remove existing iframe if present
        if (printIframeRef.current && printIframeRef.current.parentNode) {
          printIframeRef.current.parentNode.removeChild(printIframeRef.current)
        }

        // Create new hidden iframe
        const printIframe = document.createElement('iframe')
        printIframe.style.position = 'fixed'
        printIframe.style.right = '0'
        printIframe.style.bottom = '0'
        printIframe.style.width = '0'
        printIframe.style.height = '0'
        printIframe.style.border = '0'
        printIframe.style.opacity = '0'
        printIframe.style.pointerEvents = 'none'
        printIframe.style.zIndex = '-9999'
        document.body.appendChild(printIframe)
        printIframeRef.current = printIframe

        // Write content to iframe
        const iframeDoc = printIframe.contentDocument || printIframe.contentWindow?.document
        if (!iframeDoc) {
          throw new Error('Cannot access iframe document')
        }

        iframeDoc.open()
        iframeDoc.write(fullHTML)
        iframeDoc.close()

        // Wait for iframe to load, then print
        const attemptPrint = () => {
          try {
            const iframeWindow = printIframe.contentWindow || printIframe.contentDocument?.defaultView
            if (iframeWindow && typeof iframeWindow.print === 'function') {
              // Small delay to ensure content is rendered
              setTimeout(() => {
                try {
                  iframeWindow.print()
                } catch (printError) {
                  console.error('Print execution error:', printError)
                  // Fallback: open in new window
                  openFallbackWindow()
                }
              }, 300)
            } else {
              openFallbackWindow()
            }
          } catch (error) {
            console.error('Print setup error:', error)
            openFallbackWindow()
          }
        }

        const openFallbackWindow = () => {
          try {
            const fallbackWindow = window.open('', '_blank', 'width=300,height=600')
            if (fallbackWindow) {
              fallbackWindow.document.write(fullHTML)
              fallbackWindow.document.close()
              setTimeout(() => {
                try {
                  fallbackWindow.print()
                } catch (e) {
                  console.error('Fallback print error:', e)
                  alert('Printing may not be available on this device. Please use the download option or share this receipt manually.')
                }
              }, 500)
            } else {
              alert('Please allow popups to print receipts, or use the download option.')
            }
          } catch (e) {
            console.error('Fallback window error:', e)
            alert('Printing is not available. Please use the download option.')
          }
        }

        // Wait for iframe to load
        if (printIframe.contentDocument && printIframe.contentDocument.readyState === 'complete') {
          attemptPrint()
        } else {
          printIframe.onload = attemptPrint
          // Fallback timeout
          setTimeout(() => {
            if (printIframe.contentDocument && printIframe.contentDocument.readyState === 'complete') {
              attemptPrint()
            } else {
              openFallbackWindow()
            }
          }, 1000)
        }
      } else {
        // Desktop: use window.open approach
        const printWindow = window.open('', '_blank', 'width=300,height=600')
        if (!printWindow) {
          alert('Please allow popups to print receipts')
          return
        }

        printWindow.document.write(fullHTML)
        printWindow.document.close()

        // Wait for content to load before printing
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print()
              setTimeout(() => {
                printWindow.close()
              }, 500)
            } catch (error) {
              console.error('Print error:', error)
              alert('Print dialog could not be opened. Please try again.')
            }
          }, 250)
        }

        // If window is already loaded
        if (printWindow.document.readyState === 'complete') {
          setTimeout(() => {
            try {
              printWindow.print()
              setTimeout(() => {
                printWindow.close()
              }, 500)
            } catch (error) {
              console.error('Print error:', error)
            }
          }, 250)
        }
      }
    } catch (error) {
      console.error('Print function error:', error)
      alert('An error occurred while printing. Please try the download option instead.')
    }
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

  const generateReceiptHTML = () => {
    const receiptNumber = transactionData.receipt_number || transactionData.transaction_id || 'N/A'
    const timestamp = transactionData.timestamp || Date.now()
    const dateStr = formatDate(timestamp)
    const timeStr = formatTime(timestamp)
    
    let html = `
      <div class="receipt-container">
        <!-- Header -->
        <div class="header">
          <div class="business-name">TIPUNOX</div>
          <div class="business-name" style="font-size: 12px;">ANGELES BARBERSHOP</div>
          ${branchInfo?.name ? `<div class="branch-name">${branchInfo.name}</div>` : ''}
          ${branchInfo?.address ? `<div class="address">${branchInfo.address}</div>` : ''}
          ${branchInfo?.phone ? `<div class="phone">Tel: ${branchInfo.phone}</div>` : ''}
        </div>
        
        <div class="separator"></div>
        
        <!-- Receipt Title -->
        <div class="receipt-title">OFFICIAL RECEIPT</div>
        
        <!-- Transaction Info -->
        <div class="info-row">
          <span class="info-label">Receipt No:</span>
          <span class="info-value">${receiptNumber}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${dateStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${timeStr}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Cashier:</span>
          <span class="info-value">${staffInfo?.username || staffInfo?.full_name || 'Staff'}</span>
        </div>
        ${transactionData.barber_name ? `
        <div class="info-row">
          <span class="info-label">Barber:</span>
          <span class="info-value">${transactionData.barber_name}</span>
        </div>
        ` : ''}
        ${transactionData.customer_name ? `
        <div class="info-row">
          <span class="info-label">Customer:</span>
          <span class="info-value">${transactionData.customer_name}</span>
        </div>
        ` : ''}
        
        <div class="separator"></div>
        
        <!-- Items Header -->
        <div class="items-header">
          <span>Item</span>
          <span>Amount</span>
        </div>
        
        <!-- Services -->
        ${transactionData.services && transactionData.services.length > 0 ? transactionData.services.map(service => {
          const itemTotal = (service.quantity || 1) * (service.price || 0)
          return `
            <div class="item-row">
              <div class="item-name">${service.service_name || service.name || 'Service'}</div>
              <div class="item-details">
                <span>${service.quantity || 1}x ₱${(service.price || 0).toFixed(2)}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
              </div>
            </div>
          `
        }).join('') : ''}
        
        <!-- Products -->
        ${transactionData.products && transactionData.products.length > 0 ? transactionData.products.map(product => {
          const itemTotal = (product.quantity || 1) * (product.price || 0)
          return `
            <div class="item-row">
              <div class="item-name">${product.product_name || product.name || 'Product'}</div>
              <div class="item-details">
                <span>${product.quantity || 1}x ₱${(product.price || 0).toFixed(2)}</span>
                <span>₱${itemTotal.toFixed(2)}</span>
              </div>
            </div>
          `
        }).join('') : ''}
        
        <div class="separator"></div>
        
        <!-- Totals -->
        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-amount">₱${(transactionData.subtotal || 0).toFixed(2)}</span>
          </div>
          ${transactionData.discount_amount > 0 ? `
          <div class="total-row">
            <span class="total-label">Discount:</span>
            <span class="total-amount">-₱${transactionData.discount_amount.toFixed(2)}</span>
          </div>
          ` : ''}
          ${transactionData.voucher_applied ? `
          <div class="total-row">
            <span class="total-label">Voucher:</span>
            <span class="total-amount">-₱${transactionData.discount_amount.toFixed(2)}</span>
          </div>
          ` : ''}
          ${transactionData.tax_amount > 0 ? `
          <div class="total-row">
            <span class="total-label">Tax:</span>
            <span class="total-amount">₱${transactionData.tax_amount.toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="separator-thick"></div>
        
        <div class="total-row grand-total">
          <span>TOTAL:</span>
          <span>₱${(transactionData.total_amount || 0).toFixed(2)}</span>
        </div>
        
        <div class="separator-thick"></div>
        
        <!-- Payment Info -->
        <div class="payment-info">
          <div class="info-row">
            <span class="info-label">Payment:</span>
            <span class="info-value">${(transactionData.payment_method || 'cash').replace('_', ' ').toUpperCase()}</span>
          </div>
          ${transactionData.payment_method === 'cash' && transactionData.cash_received ? `
          <div class="info-row">
            <span class="info-label">Cash Received:</span>
            <span class="info-value">₱${transactionData.cash_received.toFixed(2)}</span>
          </div>
          ` : ''}
          ${transactionData.payment_method === 'cash' && transactionData.change_amount ? `
          <div class="info-row">
            <span class="info-label">Change:</span>
            <span class="info-value">₱${transactionData.change_amount.toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="footer">
          <div class="thank-you">Thank you for your business!</div>
          <div>Please come again!</div>
          <div class="footer-note">This serves as your official receipt</div>
          <div class="footer-note" style="margin-top: 6px;">
            Receipt #: <span class="receipt-number">${receiptNumber}</span>
          </div>
        </div>
      </div>
    `
    
    return html
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
