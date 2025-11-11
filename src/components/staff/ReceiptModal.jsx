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
      // Prefer ESC/POS via Android bridge if available
      const androidOk = tryAndroidEscPosPrint()
      if (androidOk) {
        return
      }
      
      // Try PDF-based print first for best 58mm compatibility
      const tryPdfPrint = async () => {
        try {
          const { jsPDF } = await import('jspdf')
          const receiptText = generateReceiptText()
          const sanitized = receiptText.replace(/₱/g, 'PHP ')
          
          // Layout settings for 58mm thermal
          const pageWidthMm = 58
          const leftPaddingMm = 2
          const rightPaddingMm = 2
          const usableWidthMm = pageWidthMm - leftPaddingMm - rightPaddingMm
          const lineHeightMm = 4 // 4mm per line for readability on thermal
          const topPaddingMm = 2
          const bottomPaddingMm = 2
          
          const lines = sanitized.split('\n')
          const contentHeightMm = Math.max(lineHeightMm, lines.length * lineHeightMm)
          const totalHeightMm = topPaddingMm + contentHeightMm + bottomPaddingMm
          
          const doc = new jsPDF({
            unit: 'mm',
            format: [pageWidthMm, totalHeightMm],
            orientation: 'portrait',
          })
          
          if (doc.internal && doc.internal.pageSize && typeof doc.internal.pageSize.setHeight === 'function') {
            doc.internal.pageSize.setHeight(totalHeightMm)
          }
          
          doc.setFont('courier', 'normal')
          doc.setFontSize(8)
          
          let y = topPaddingMm + 3
          const x = leftPaddingMm
          
          for (const line of lines) {
            const maxChars = Math.floor(usableWidthMm * 3.5)
            const chunks = []
            let idx = 0
            const value = line || ''
            while (idx < value.length) {
              chunks.push(value.slice(idx, idx + maxChars))
              idx += maxChars
            }
            if (chunks.length === 0) chunks.push('')
            for (const chunk of chunks) {
              doc.text(chunk, x, y, { baseline: 'top' })
              y += lineHeightMm
            }
          }
          
          // Request viewer to open print dialog automatically
          if (typeof doc.autoPrint === 'function') {
            doc.autoPrint()
          }
          
          const blob = doc.output('blob')
          const url = URL.createObjectURL(blob)
          
          // Use hidden iframe to trigger print automatically
          const iframe = document.createElement('iframe')
          iframe.style.position = 'fixed'
          iframe.style.right = '0'
          iframe.style.bottom = '0'
          iframe.style.width = '0'
          iframe.style.height = '0'
          iframe.style.border = '0'
          iframe.style.opacity = '0'
          iframe.style.pointerEvents = 'none'
          iframe.style.zIndex = '-9999'
          document.body.appendChild(iframe)
          
          return await new Promise((resolve) => {
            const cleanup = () => {
              try {
                document.body.removeChild(iframe)
              } catch (_) {}
              setTimeout(() => URL.revokeObjectURL(url), 1500)
            }
            iframe.onload = () => {
              try {
                const w = iframe.contentWindow
                if (w && typeof w.print === 'function') {
                  // Attach afterprint to cleanup after user finishes
                  try {
                    w.addEventListener('afterprint', () => {
                      cleanup()
                      resolve(true)
                    })
                  } catch (_) {
                    // Some environments may not support afterprint on iframe window
                  }
                  // Delay slightly to ensure render, then trigger print
                  setTimeout(() => {
                    try {
                      w.focus()
                      w.print()
                      // Safety cleanup if afterprint never fires
                      setTimeout(() => {
                        cleanup()
                        resolve(true)
                      }, 60000) // 60s fallback
                    } catch (e) {
                      cleanup()
                      resolve(false)
                    }
                  }, 250)
                } else {
                  cleanup()
                  resolve(false)
                }
              } catch (_) {
                cleanup()
                resolve(false)
              }
            }
            // Fallback if onload doesn't fire
            setTimeout(() => {
              if (!iframe.contentDocument) {
                cleanup()
                resolve(false)
              }
            }, 2000)
            iframe.src = url
          })
        } catch (e) {
          return false
        }
      }
      
      const pdfOk = await tryPdfPrint()
      if (pdfOk) {
        return
      }

      const receiptHTML = generateReceiptHTML()
      // Simplified HTML for thermal printers - no complex CSS
      const fullHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt - ${transactionData.receipt_number || transactionData.transaction_id}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              /* Page size for 58mm thermal printer */
              @page {
                size: 58mm auto;
                margin: 0mm;
                padding: 0mm;
              }
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              html {
                width: 58mm;
                height: auto;
                margin: 0;
                padding: 0;
              }
              
              body {
                width: 58mm !important;
                max-width: 58mm !important;
                min-width: 58mm !important;
                margin: 0 !important;
                padding: 2mm 2mm !important;
                font-family: 'Courier New', Courier, monospace;
                font-size: 10px;
                line-height: 1.15;
                color: #000000 !important;
                background: #FFFFFF !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                display: block !important;
                visibility: visible !important;
                overflow: visible !important;
              }
              
              @media print {
                @page {
                  size: 58mm auto;
                  margin: 0mm;
                  padding: 0mm;
                }
                
                html {
                  width: 58mm !important;
                  margin: 0 !important;
                  padding: 0 !important;
                }
                
                body {
                  width: 58mm !important;
                  max-width: 58mm !important;
                  min-width: 58mm !important;
                  margin: 0 !important;
                  padding: 2mm 2mm !important;
                  color: #000000 !important;
                  background: #FFFFFF !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                  display: block !important;
                  visibility: visible !important;
                }
                
                * {
                  visibility: visible !important;
                  color: #000000 !important;
                  background: transparent !important;
                }
                
                .receipt-container {
                  width: 48mm !important;
                  max-width: 48mm !important;
                  min-width: 48mm !important;
                  margin: 0 auto !important;
                  display: block !important;
                  visibility: visible !important;
                  color: #000000 !important;
                }
                
                table {
                  width: 100% !important;
                  max-width: 48mm !important;
                }
              }
              
              .receipt-container {
                width: 48mm !important;
                max-width: 48mm !important;
                min-width: 48mm !important;
                margin: 0 auto;
                display: block !important;
                visibility: visible !important;
                color: #000000 !important;
              }
              
              /* Table styles for thermal printer compatibility */
              table {
                width: 100%;
                max-width: 48mm;
                border-collapse: collapse;
                margin: 0;
                padding: 0;
                font-size: 9px;
                color: #000000 !important;
              }
              
              td {
                padding: 1px 2px;
                color: #000000 !important;
                font-size: inherit;
              }
              
              .header {
                text-align: center;
                margin-bottom: 4px;
                padding-bottom: 4px;
                border-bottom: 1px dashed #000;
                display: block;
                width: 100%;
              }
              
              .business-name {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 1px;
                text-transform: uppercase;
                display: block;
                line-height: 1.2;
              }
              
              .branch-name {
                font-size: 9px;
                font-weight: bold;
                margin-bottom: 1px;
                display: block;
                line-height: 1.2;
              }
              
              .address, .phone {
                font-size: 7px;
                margin-bottom: 1px;
                display: block;
                line-height: 1.2;
              }
              
              .separator {
                border-top: 1px dashed #000;
                margin: 4px 0;
                display: block;
                height: 0;
                width: 100%;
              }
              
              .separator-thick {
                border-top: 2px solid #000;
                margin: 4px 0;
                display: block;
                height: 0;
                width: 100%;
              }
              
              .receipt-title {
                text-align: center;
                font-size: 10px;
                font-weight: bold;
                margin: 4px 0;
                text-transform: uppercase;
                display: block;
                line-height: 1.2;
              }
              
              .footer {
                text-align: center;
                margin-top: 6px;
                font-size: 7px;
                border-top: 1px dashed #000;
                padding-top: 4px;
                display: block;
                width: 100%;
                line-height: 1.3;
              }
              
              .thank-you {
                font-weight: bold;
                margin-bottom: 2px;
                display: block;
                font-size: 8px;
              }
              
              .footer-note {
                font-size: 6px;
                margin-top: 2px;
                display: block;
                line-height: 1.2;
              }
              
              .receipt-number {
                font-family: 'Courier New', monospace;
                font-size: 7px;
                letter-spacing: 0.5px;
              }
            </style>
          </head>
          <body style="background:#FFFFFF; color:#000000; -webkit-print-color-adjust:exact; print-color-adjust:exact;">
            ${receiptHTML}
            <script>
              (function() {
                function printNow() {
                  try {
                    window.print();
                  } catch (e) {
                    console.error('Print error:', e);
                  }
                }
                
                if (document.readyState === 'complete') {
                  printNow();
                } else {
                  window.addEventListener('load', printNow);
                  setTimeout(printNow, 100);
                }
                
                window.addEventListener('afterprint', function() {
                  setTimeout(function() {
                    try {
                      window.close();
                    } catch (e) {}
                  }, 100);
                });
              })();
            </script>
          </body>
        </html>
      `

      // Try window.open print approach first (reliable across browsers and many Android POS WebViews)
      const printWindow = window.open('', '_blank', 'width=300,height=600')
      if (printWindow) {
        try {
          printWindow.document.write(fullHTML)
          printWindow.document.close()
          // Auto-close after print
          printWindow.addEventListener('afterprint', () => {
            setTimeout(() => {
              try {
                printWindow.close()
              } catch (e) {}
            }, 150)
          })
          // The script in the HTML will handle auto-printing
          return
        } catch (e) {
          try {
            printWindow.close()
          } catch (_) {}
          // Continue to other strategies if this fails
        }
      }

      // For mobile/Android/Capacitor: Try Capacitor plugin first if available
      if (isCapacitor() && window.Capacitor?.Plugins?.Printer) {
        try {
          window.Capacitor.Plugins.Printer.print({
            html: fullHTML,
            name: `Receipt-${transactionData.receipt_number || transactionData.transaction_id}`
          }).catch(() => {
            // Fallback to standard print if plugin fails
            printWithIframe()
          })
          return
        } catch (error) {
          console.error('Capacitor print error:', error)
          // Fallback to standard print
        }
      }

      // Mobile/Android: Use iframe approach
      const printWithIframe = () => {
        // Remove existing iframe if present
        if (printIframeRef.current && printIframeRef.current.parentNode) {
          printIframeRef.current.parentNode.removeChild(printIframeRef.current)
          printIframeRef.current = null
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
          // Fallback to window.open
          openPrintWindow()
          return
        }

        iframeDoc.open()
        iframeDoc.write(fullHTML)
        iframeDoc.close()

        // Print immediately when ready
        const printNow = () => {
          try {
            const iframeWindow = printIframe.contentWindow || printIframe.contentDocument?.defaultView
            if (iframeWindow && typeof iframeWindow.print === 'function') {
              iframeWindow.print()
            } else {
              openPrintWindow()
            }
          } catch (error) {
            console.error('Print error:', error)
            openPrintWindow()
          }
        }

        // Check if already loaded
        if (iframeDoc.readyState === 'complete') {
          printNow()
        } else {
          printIframe.onload = printNow
          setTimeout(() => {
            if (iframeDoc.readyState === 'complete') {
              printNow()
            } else {
              openPrintWindow()
            }
          }, 100)
        }
      }

      // Fallback: open print window (for mobile)
      const openPrintWindow = () => {
        try {
          const printWindow = window.open('', '_blank', 'width=300,height=600')
          if (!printWindow) {
            alert('Please allow popups to print receipts, or use the download option.')
            return
          }

          printWindow.document.write(fullHTML)
          printWindow.document.close()

          // Auto-close after print
          printWindow.addEventListener('afterprint', () => {
            setTimeout(() => {
              try {
                printWindow.close()
              } catch (e) {
                // Window might not be closable
              }
            }, 100)
          })

          // The script in HTML will handle auto-printing
        } catch (error) {
          console.error('Print window error:', error)
          alert('Printing is not available. Please use the download option.')
        }
      }

      // Execute mobile print
      printWithIframe()
    } catch (error) {
      console.error('Print function error:', error)
      alert('An error occurred while printing. Please try the download option instead.')
    }
  }

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf')
      const receiptText = generateReceiptText()
      const sanitized = receiptText.replace(/₱/g, 'PHP ')
      
      const pageWidthMm = 58
      const leftPaddingMm = 2
      const rightPaddingMm = 2
      const usableWidthMm = pageWidthMm - leftPaddingMm - rightPaddingMm
      const lineHeightMm = 4
      const topPaddingMm = 2
      const bottomPaddingMm = 2
      
      const lines = sanitized.split('\n')
      const contentHeightMm = Math.max(lineHeightMm, lines.length * lineHeightMm)
      const totalHeightMm = topPaddingMm + contentHeightMm + bottomPaddingMm
      
      const doc = new jsPDF({
        unit: 'mm',
        format: [pageWidthMm, totalHeightMm],
        orientation: 'portrait',
      })
      
      if (doc.internal && doc.internal.pageSize && typeof doc.internal.pageSize.setHeight === 'function') {
        doc.internal.pageSize.setHeight(totalHeightMm)
      }
      
      doc.setFont('courier', 'normal')
      doc.setFontSize(8)
      
      let y = topPaddingMm + 3
      const x = leftPaddingMm
      
      for (const line of lines) {
        const maxChars = Math.floor(usableWidthMm * 3.5)
        const chunks = []
        let idx = 0
        const value = line || ''
        while (idx < value.length) {
          chunks.push(value.slice(idx, idx + maxChars))
          idx += maxChars
        }
        if (chunks.length === 0) chunks.push('')
        for (const chunk of chunks) {
          doc.text(chunk, x, y, { baseline: 'top' })
          y += lineHeightMm
        }
      }
      
      doc.save(`receipt-${(transactionData.receipt_number || transactionData.transaction_id || 'receipt')}.pdf`)
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('PDF generation is unavailable. Please install "jspdf" or use Download Text.')
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
    
    // Escape HTML to prevent XSS
    const escapeHtml = (text) => {
      if (!text) return ''
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
    
    // Format text for thermal printer (simple table-based layout)
    // Using 48mm width (standard printable width for 58mm paper with 5mm margins on each side)
    let html = `
      <div class="receipt-container" style="width: 48mm !important; max-width: 48mm !important; min-width: 48mm !important; margin: 0 auto; display: block; visibility: visible; color: #000000;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px dashed #000; display: block; width: 100%;">
          <div style="font-size: 12px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; display: block; line-height: 1.2;">TIPUNOX</div>
          <div style="font-size: 10px; font-weight: bold; margin-bottom: 1px; text-transform: uppercase; display: block; line-height: 1.2;">ANGELES BARBERSHOP</div>
          ${branchInfo?.name ? `<div style="font-size: 9px; font-weight: bold; margin-bottom: 1px; display: block; line-height: 1.2;">${escapeHtml(branchInfo.name)}</div>` : ''}
          ${branchInfo?.address ? `<div style="font-size: 7px; margin-bottom: 1px; display: block; line-height: 1.2;">${escapeHtml(branchInfo.address)}</div>` : ''}
          ${branchInfo?.phone ? `<div style="font-size: 7px; margin-bottom: 1px; display: block; line-height: 1.2;">Tel: ${escapeHtml(branchInfo.phone)}</div>` : ''}
        </div>
        
        <div style="border-top: 1px dashed #000; margin: 4px 0; display: block; height: 0; width: 100%;"></div>
        
        <!-- Receipt Title -->
        <div style="text-align: center; font-size: 10px; font-weight: bold; margin: 4px 0; text-transform: uppercase; display: block; line-height: 1.2;">OFFICIAL RECEIPT</div>
        
        <!-- Transaction Info -->
        <table style="width: 100%; margin-bottom: 2px; font-size: 9px; border-collapse: collapse; max-width: 48mm;">
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Receipt No:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(receiptNumber)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Date:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(dateStr)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Time:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(timeStr)}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Cashier:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(staffInfo?.username || staffInfo?.full_name || 'Staff')}</td>
          </tr>
          ${transactionData.barber_name ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Barber:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(transactionData.barber_name)}</td>
          </tr>
          ` : ''}
          ${transactionData.customer_name ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Customer:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml(transactionData.customer_name)}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="border-top: 1px dashed #000; margin: 4px 0; display: block; height: 0; width: 100%;"></div>
        
        <!-- Items Header -->
        <table style="width: 100%; margin: 4px 0 3px 0; font-weight: bold; font-size: 9px; border-bottom: 1px solid #000; border-collapse: collapse; max-width: 48mm;">
          <tr>
            <td style="padding: 1px 2px;">Item</td>
            <td style="text-align: right; padding: 1px 2px;">Amount</td>
          </tr>
        </table>
        
        <!-- Services -->
        ${transactionData.services && transactionData.services.length > 0 ? transactionData.services.map(service => {
          const itemTotal = (service.quantity || 1) * (service.price || 0)
          const serviceName = escapeHtml(service.service_name || service.name || 'Service')
          return `
            <table style="width: 100%; margin-bottom: 3px; font-size: 9px; border-collapse: collapse; max-width: 48mm;">
              <tr>
                <td colspan="2" style="font-weight: bold; font-size: 9px; padding: 1px 2px;">${serviceName}</td>
              </tr>
              <tr>
                <td style="font-size: 8px; padding-left: 5px; padding: 1px 2px;">${service.quantity || 1}x ₱${(service.price || 0).toFixed(2)}</td>
                <td style="text-align: right; font-size: 8px; padding: 1px 2px;">₱${itemTotal.toFixed(2)}</td>
              </tr>
            </table>
          `
        }).join('') : ''}
        
        <!-- Products -->
        ${transactionData.products && transactionData.products.length > 0 ? transactionData.products.map(product => {
          const itemTotal = (product.quantity || 1) * (product.price || 0)
          const productName = escapeHtml(product.product_name || product.name || 'Product')
          return `
            <table style="width: 100%; margin-bottom: 3px; font-size: 9px; border-collapse: collapse; max-width: 48mm;">
              <tr>
                <td colspan="2" style="font-weight: bold; font-size: 9px; padding: 1px 2px;">${productName}</td>
              </tr>
              <tr>
                <td style="font-size: 8px; padding-left: 5px; padding: 1px 2px;">${product.quantity || 1}x ₱${(product.price || 0).toFixed(2)}</td>
                <td style="text-align: right; font-size: 8px; padding: 1px 2px;">₱${itemTotal.toFixed(2)}</td>
              </tr>
            </table>
          `
        }).join('') : ''}
        
        <div style="border-top: 1px dashed #000; margin: 4px 0; display: block; height: 0; width: 100%;"></div>
        
        <!-- Totals -->
        <table style="width: 100%; margin-top: 4px; font-size: 9px; border-collapse: collapse; max-width: 48mm;">
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Subtotal:</td>
            <td style="text-align: right; font-weight: bold; padding: 1px 2px;">₱${(transactionData.subtotal || 0).toFixed(2)}</td>
          </tr>
          ${transactionData.discount_amount > 0 ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Discount:</td>
            <td style="text-align: right; font-weight: bold; padding: 1px 2px;">-₱${transactionData.discount_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${transactionData.voucher_applied ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Voucher:</td>
            <td style="text-align: right; font-weight: bold; padding: 1px 2px;">-₱${transactionData.discount_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${transactionData.tax_amount > 0 ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Tax:</td>
            <td style="text-align: right; font-weight: bold; padding: 1px 2px;">₱${transactionData.tax_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>
        
        <div style="border-top: 2px solid #000; margin: 4px 0; display: block; height: 0; width: 100%;"></div>
        
        <table style="width: 100%; margin-top: 3px; font-size: 10px; border-collapse: collapse; max-width: 48mm;">
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">TOTAL:</td>
            <td style="text-align: right; font-weight: bold; padding: 1px 2px;">₱${(transactionData.total_amount || 0).toFixed(2)}</td>
          </tr>
        </table>
        
        <div style="border-top: 2px solid #000; margin: 4px 0; display: block; height: 0; width: 100%;"></div>
        
        <!-- Payment Info -->
        <table style="width: 100%; margin-top: 4px; font-size: 9px; border-collapse: collapse; max-width: 48mm;">
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Payment:</td>
            <td style="text-align: right; padding: 1px 2px;">${escapeHtml((transactionData.payment_method || 'cash').replace('_', ' ').toUpperCase())}</td>
          </tr>
          ${transactionData.payment_method === 'cash' && transactionData.cash_received ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Cash Received:</td>
            <td style="text-align: right; padding: 1px 2px;">₱${transactionData.cash_received.toFixed(2)}</td>
          </tr>
          ` : ''}
          ${transactionData.payment_method === 'cash' && transactionData.change_amount ? `
          <tr>
            <td style="font-weight: bold; padding: 1px 2px;">Change:</td>
            <td style="text-align: right; padding: 1px 2px;">₱${transactionData.change_amount.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 6px; font-size: 7px; border-top: 1px dashed #000; padding-top: 4px; display: block; width: 100%; line-height: 1.3;">
          <div style="font-weight: bold; margin-bottom: 2px; display: block; font-size: 8px;">Thank you for your business!</div>
          <div style="display: block;">Please come again!</div>
          <div style="font-size: 6px; margin-top: 2px; display: block; line-height: 1.2;">This serves as your official receipt</div>
          <div style="font-size: 6px; margin-top: 4px; display: block; line-height: 1.2;">
            Receipt #: <span style="font-family: 'Courier New', monospace; font-size: 7px; letter-spacing: 0.5px;">${escapeHtml(receiptNumber)}</span>
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
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={handlePrint}
              className="py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white font-bold rounded-xl hover:from-[#FF7A2B] hover:to-[#E67E37] transition-all flex items-center justify-center space-x-2"
            >
              <Printer className="w-5 h-5" />
              <span>Print Receipt</span>
            </button>
            
            <button
              onClick={handleDownloadPDF}
              className="py-3 border-2 border-[#555555] text-gray-300 font-semibold rounded-xl hover:border-[#FF8C42] hover:text-[#FF8C42] hover:bg-[#FF8C42]/10 transition-all flex items-center justify-center space-x-2"
            >
              <Download className="w-5 h-5" />
              <span>PDF</span>
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
