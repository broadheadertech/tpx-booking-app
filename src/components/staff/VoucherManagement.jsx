import React, { useState, useRef, useEffect } from 'react'
import { Gift, Calendar, User, DollarSign, CheckCircle, XCircle, Clock, Search, Filter, Plus, RotateCcw, QrCode, Download, Printer, Copy, Mail, Trash2, Edit, Users } from 'lucide-react'
import QRCode from 'qrcode'
import SendVoucherModal from './SendVoucherModal'
import ViewVoucherUsersModal from './ViewVoucherUsersModal'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const VoucherManagement = ({ vouchers = [], onRefresh, onCreateVoucher }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [showQRCode, setShowQRCode] = useState(null)
  const [showSendModal, setShowSendModal] = useState(null)
  const [showUsersModal, setShowUsersModal] = useState(null)
  const [loading, setLoading] = useState(false)

  // Convex queries and mutations
  const deleteVoucher = useMutation(api.services.vouchers.deleteVoucher)
  const assignedUsers = useQuery(
    api.services.vouchers.getVoucherAssignedUsers,
    showUsersModal ? { voucherId: showUsersModal._id } : "skip"
  )

  const getStatusConfig = (voucher) => {
    if (voucher.redeemed) {
      return {
        status: 'redeemed',
        label: 'Redeemed',
        icon: CheckCircle,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        iconColor: 'text-green-500'
      }
    }
    const isExpired = voucher.expires_at < Date.now()
    if (isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        icon: XCircle,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
    return {
      status: 'active',
      label: 'Active',
      icon: Clock,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      iconColor: 'text-orange-500'
    }
  }

  const handleDelete = async (voucher) => {
    if (!confirm(`Are you sure you want to delete voucher "${voucher.code}"?`)) return

    setLoading(true)
    try {
      await deleteVoucher({ id: voucher._id })
      onRefresh()
    } catch (err) {
      console.error('Failed to delete voucher:', err)
      alert('Failed to delete voucher. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredVouchers = vouchers
    .filter(voucher => {
      const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || getStatusConfig(voucher).status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'value') return parseFloat(b.value) - parseFloat(a.value)
      if (sortBy === 'expires_at') return new Date(a.expires_at) - new Date(b.expires_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const stats = {
    total: vouchers.length,
    active: vouchers.filter(v => !v.redeemed && !v.isExpired).length,
    redeemed: vouchers.filter(v => v.redeemed).length,
    expired: vouchers.filter(v => v.isExpired && !v.redeemed).length,
    totalValue: vouchers.reduce((sum, v) => sum + parseFloat(v.value), 0)
  }

  // Mini QR Code for card thumbnail
  const MiniQRCode = ({ voucher }) => {
    const qrRef = useRef(null)
    const qrData = JSON.stringify({
      voucherId: voucher.id,
      code: voucher.code,
      type: 'voucher',
      brand: 'TPX Barbershop'
    })

    useEffect(() => {
      if (qrRef.current) {
        QRCode.toCanvas(qrRef.current, qrData, {
          width: 32,
          margin: 0,
          color: { dark: '#36454F', light: '#ffffff' },
          errorCorrectionLevel: 'M'
        }, (err) => { if (err) console.error('Mini QR error:', err) })
      }
    }, [qrData])

    return <canvas ref={qrRef} className="rounded w-8 h-8" style={{ maxWidth: '32px', maxHeight: '32px' }} />
  }

  // QR Code Modal for full-size display
  const QRCodeModal = ({ voucher, onClose }) => {
    const qrCanvasRef = useRef(null)

    const qrPayload = JSON.stringify({
      voucherId: voucher.id,
      code: voucher.code,
      value: voucher.value,
      expires_at: voucher.expires_at,
      user: voucher.user,
      redeemed: !!voucher.redeemed,
      type: 'voucher',
      brand: 'TPX Barbershop'
    })

    useEffect(() => {
      if (qrCanvasRef.current) {
        QRCode.toCanvas(qrCanvasRef.current, qrPayload, {
          width: 220,
          margin: 2,
          color: { dark: '#1F2937', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        }, (err) => { if (err) console.error('QR generation error:', err) })
      }
    }, [qrPayload])

    const handleDownload = async () => {
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          width: 600,
          margin: 2,
          color: { dark: '#111827', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        })
        const link = document.createElement('a')
        link.href = url
        link.download = `voucher-${voucher.code}.png`
        link.click()
      } catch (e) {
        console.error('Failed to download QR:', e)
      }
    }

    const handlePrint = async () => {
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          width: 600,
          margin: 2,
          color: { dark: '#111827', light: '#ffffff' },
          errorCorrectionLevel: 'H'
        })
        const printWindow = window.open('', '_blank')
        if (!printWindow) return
        printWindow.document.write(`
          <html>
            <head>
              <title>Voucher ${voucher.code} - QR</title>
              <style>
                body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; text-align: center; padding: 24px; }
                .code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 700; color: #F68B24; }
              </style>
            </head>
            <body>
              <h2>Voucher <span class="code">${voucher.code}</span></h2>
              <img src="${url}" alt="Voucher QR" style="width: 320px; height: 320px;" />
              <p>Present this QR at the counter to redeem.</p>
              <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
            </body>
          </html>
        `)
        printWindow.document.close()
      } catch (e) {
        console.error('Failed to print QR:', e)
      }
    }

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(voucher.code)
      } catch (e) {
        console.error('Failed to copy code:', e)
      }
    }

    const status = getStatusConfig(voucher)

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto bg-gradient-to-br from-orange-400 to-amber-500 shadow-sm">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Voucher QR Code</h3>
              <p className="text-sm font-mono font-bold text-orange-600">{voucher.code}</p>
              <p className="text-sm text-gray-500">Scan this code to validate or redeem</p>
            </div>

            <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
              <div className="flex justify-center">
                <canvas ref={qrCanvasRef} className="rounded-lg" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-500">Value</div>
                <div className="text-sm font-bold text-gray-900">{voucher.formattedValue || `₱${parseFloat(voucher.value).toFixed(2)}`}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-500">Expires</div>
                <div className={`text-sm font-bold ${voucher.isExpired ? 'text-red-600' : 'text-gray-900'}`}>{new Date(voucher.expires_at).toLocaleDateString()}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50">
                <div className="text-xs text-gray-500">User</div>
                <div className="text-sm font-bold text-gray-900">User {voucher.user}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 flex items-center justify-between">
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.border} border ${status.text}`}>
                    <status.icon className={`h-3 w-3 mr-1 ${status.iconColor}`} />
                    {status.label}
                  </div>
                </div>
                <button onClick={handleCopy} className="ml-2 inline-flex items-center px-2.5 py-1 border border-gray-200 text-xs font-medium rounded bg-white hover:bg-gray-50 text-gray-700">
                  <Copy className="h-3 w-3 mr-1" /> Copy
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-gray-700 border border-gray-200 hover:bg-gray-50">Close</button>
              <div className="flex items-center space-x-2">
                <button onClick={handleDownload} className="inline-flex items-center px-3 py-2 rounded-xl text-white bg-orange-500 hover:bg-orange-600">
                  <Download className="h-4 w-4 mr-1" /> Download
                </button>
                <button onClick={handlePrint} className="inline-flex items-center px-3 py-2 rounded-xl text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200">
                  <Printer className="h-4 w-4 mr-1" /> Print
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Gift className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Redeemed</p>
              <p className="text-2xl font-bold text-green-600">{stats.redeemed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">₱{stats.totalValue.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search voucher code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="created_at">Sort by Date</option>
              <option value="value">Sort by Value</option>
              <option value="expires_at">Sort by Expiry</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button 
              onClick={onCreateVoucher}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVouchers.map((voucher) => {
          const statusConfig = getStatusConfig(voucher)
          const StatusIcon = statusConfig.icon

          return (
            <div
              key={voucher._id}
              className={`bg-white rounded-lg border-2 ${statusConfig.border} shadow-sm hover:shadow-md transition-shadow p-4`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-orange-50 border-2 border-orange-200 flex items-center justify-center w-12 h-12">
                    <MiniQRCode voucher={voucher} />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900">{voucher.code}</p>
                    <p className="text-xs text-gray-500">Points: {voucher.points_required}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                    <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                    <span className={`text-xs font-medium ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(voucher)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete Voucher"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Value</span>
                  <span className="text-lg font-bold text-gray-900">₱{parseFloat(voucher.value).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Points Required</span>
                  <span className="text-sm font-medium text-gray-900">{voucher.points_required}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Assignments</span>
                  <span className="text-sm font-medium text-gray-900">
                    {voucher.assignedCount || 0}/{voucher.max_uses}
                    {voucher.redeemedCount > 0 && (
                      <span className="text-green-600 ml-1">({voucher.redeemedCount} redeemed)</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm text-gray-600">
                    {new Date(voucher.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expires</span>
                  <span className={`text-sm ${voucher.expires_at < Date.now() ? 'text-red-600' : 'text-gray-600'}`}>
                    {new Date(voucher.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-200">
                {/* Always show View Users button */}
                <button
                  onClick={() => setShowUsersModal(voucher)}
                  className="w-full mb-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center justify-center"
                >
                  <Users className="h-4 w-4 mr-2" /> View Assigned Users
                </button>
                
                {/* Show action buttons only for active vouchers */}
                {!voucher.redeemed && voucher.expires_at >= Date.now() && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowQRCode(voucher)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <QrCode className="h-4 w-4 mr-2" /> View QR
                    </button>
                    <button
                      onClick={() => setShowSendModal(voucher)}
                      className="flex-1 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-colors text-sm font-semibold flex items-center justify-center"
                    >
                      <Mail className="h-4 w-4 mr-2" /> Send Email
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredVouchers.length === 0 && (
        <div className="text-center py-12">
          <Gift className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vouchers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new voucher.'
            }
          </p>
        </div>
      )}

      {showQRCode && (
        <QRCodeModal voucher={showQRCode} onClose={() => setShowQRCode(null)} />
      )}

      {showSendModal && (
        <SendVoucherModal 
          voucher={showSendModal} 
          isOpen={!!showSendModal}
          onClose={() => setShowSendModal(null)} 
        />
      )}

      {showUsersModal && (
        <ViewVoucherUsersModal
          voucher={showUsersModal}
          isOpen={!!showUsersModal}
          onClose={() => setShowUsersModal(null)}
          assignedUsers={assignedUsers || []}
        />
      )}
    </div>
  )
}

export default VoucherManagement