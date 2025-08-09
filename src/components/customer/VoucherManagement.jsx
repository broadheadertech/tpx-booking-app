import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Gift, Clock, CheckCircle, XCircle, QrCode, Ticket } from 'lucide-react'
import QRCode from 'qrcode'

const VoucherManagement = ({ onBack }) => {
  const [vouchers] = useState([
    {
      id: 1,
      code: 'SAVE20',
      value: 1000,
      description: '₱1,000 off any premium service',
      status: 'active',
      expiresAt: '2024-12-31',
      type: 'discount'
    },
    {
      id: 2,
      code: 'FIRST10',
      value: 500,
      description: 'First time customer discount',
      status: 'redeemed',
      expiresAt: '2024-11-15',
      redeemedAt: '2024-01-10',
      type: 'discount'
    },
    {
      id: 3,
      code: 'BIRTHDAY25',
      value: 1250,
      description: 'Birthday special - 25% off',
      status: 'active',
      expiresAt: '2024-06-30',
      type: 'percentage'
    },
    {
      id: 4,
      code: 'LOYALTY100',
      value: 1500,
      description: 'Loyalty reward voucher',
      status: 'active',
      expiresAt: '2024-08-15',
      type: 'cash'
    },
    {
      id: 5,
      code: 'EXPIRED50',
      value: 750,
      description: 'Expired discount voucher',
      status: 'expired',
      expiresAt: '2023-12-31',
      type: 'discount'
    }
  ])

  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [showQRCode, setShowQRCode] = useState(false)

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'redeemed':
        return <Gift className="w-5 h-5 text-blue-500" />
      case 'expired':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'redeemed':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'expired':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'cash':
        return '💰'
      case 'percentage':
        return '🎯'
      case 'discount':
        return '🎫'
      default:
        return '🎁'
    }
  }

  const formatValue = (voucher) => {
    if (voucher.type === 'percentage') {
      return `${(voucher.value / 50)}% OFF` // Assuming value is stored as peso amount, converting to percentage for display
    }
    return `₱${voucher.value.toLocaleString()}`
  }

  const isExpiringSoon = (expiresAt) => {
    const today = new Date()
    const expireDate = new Date(expiresAt)
    const daysUntilExpiry = Math.ceil((expireDate - today) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  const handleVoucherClick = (voucher) => {
    if (voucher.status === 'active') {
      setSelectedVoucher(voucher)
      setShowQRCode(true)
    }
  }

  const activeVouchers = vouchers.filter(v => v.status === 'active')
  const redeemedVouchers = vouchers.filter(v => v.status === 'redeemed')
  const expiredVouchers = vouchers.filter(v => v.status === 'expired')

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40 shadow-lg" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl transition-all duration-200"
              style={{
                ':hover': {
                  color: '#F68B24'
                }
              }}
              onMouseEnter={(e) => e.target.style.color = '#F68B24'}
              onMouseLeave={(e) => e.target.style.color = 'white'}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-right">
              <p className="text-lg font-bold text-white">My Vouchers</p>
              <p className="text-xs" style={{color: '#F68B24'}}>{activeVouchers.length} active</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Title */}
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg" style={{backgroundColor: '#F68B24'}}>
            <Gift className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-black mb-1" style={{color: '#36454F'}}>Your Vouchers</h1>
          <p className="text-sm font-medium" style={{color: '#8B8B8B'}}>Tap active vouchers to redeem</p>
        </div>

        {/* Active Vouchers */}
        {activeVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              Active Vouchers ({activeVouchers.length})
            </h2>
            <div className="space-y-3">
              {activeVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  onClick={() => handleVoucherClick(voucher)}
                  className="bg-white rounded-xl p-4 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer relative" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Expiring Soon Badge */}
                  {isExpiringSoon(voucher.expiresAt) && (
                    <div className="absolute top-3 right-3 text-white text-xs font-bold px-2 py-1 rounded-full" style={{backgroundColor: '#F68B24'}}>
                      Expiring Soon
                    </div>
                  )}
                  
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(voucher.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(voucher.status)}`}>
                        {voucher.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded" style={{backgroundColor: '#F68B24'}}></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold" style={{color: '#F68B24'}}>{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3 h-3" style={{color: '#F68B24'}} />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Expires</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {new Date(voucher.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    className="w-full py-2 text-white font-bold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2"
                    style={{backgroundColor: '#F68B24'}}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#E67E22'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#F68B24'}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Show QR Code</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Redeemed Vouchers */}
        {redeemedVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <Gift className="w-4 h-4 text-blue-500 mr-2" />
              Redeemed Vouchers ({redeemedVouchers.length})
            </h2>
            <div className="space-y-3">
              {redeemedVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-xl p-4 shadow-sm opacity-75" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl opacity-50">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(voucher.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(voucher.status)}`}>
                        REDEEMED
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold text-blue-600">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Redeemed on</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {new Date(voucher.redeemedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expired Vouchers */}
        {expiredVouchers.length > 0 && (
          <div className="space-y-3 mb-4">
            <h2 className="text-lg font-black flex items-center" style={{color: '#36454F'}}>
              <XCircle className="w-4 h-4 text-red-500 mr-2" />
              Expired Vouchers ({expiredVouchers.length})
            </h2>
            <div className="space-y-3">
              {expiredVouchers.map((voucher) => (
                <div
                  key={voucher.id}
                  className="bg-white rounded-xl p-4 shadow-sm opacity-50" style={{border: '1px solid #E0E0E0'}}
                >
                  {/* Voucher Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-xl opacity-50">{getTypeIcon(voucher.type)}</div>
                      <div>
                        <h3 className="text-base font-black" style={{color: '#36454F'}}>{voucher.code}</h3>
                        <p className="text-sm" style={{color: '#8B8B8B'}}>{voucher.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(voucher.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getStatusColor(voucher.status)}`}>
                        EXPIRED
                      </span>
                    </div>
                  </div>

                  {/* Voucher Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Value</p>
                        <p className="text-sm font-bold text-red-600">{formatValue(voucher)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <div>
                        <p className="text-xs" style={{color: '#8B8B8B'}}>Expired on</p>
                        <p className="text-sm font-bold" style={{color: '#36454F'}}>
                          {new Date(voucher.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {activeVouchers.length === 0 && redeemedVouchers.length === 0 && expiredVouchers.length === 0 && (
          <div className="text-center py-12">
            <div className="rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4" style={{backgroundColor: '#F68B24', opacity: 0.1}}>
              <Ticket className="w-8 h-8" style={{color: '#F68B24'}} />
            </div>
            <h3 className="text-lg font-black mb-3" style={{color: '#36454F'}}>
              No Vouchers Yet
            </h3>
            <p className="text-sm max-w-md mx-auto" style={{color: '#8B8B8B'}}>
              Your vouchers will appear here once you earn them through bookings and special promotions.
            </p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQRCode && selectedVoucher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-orange to-primary-orange-light rounded-full flex items-center justify-center mx-auto">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-primary-black mb-2">Redeem Voucher</h3>
        <p className="text-gray-dark font-medium">Show this QR code to staff</p>
              </div>

              {/* QR Code */}
              <div className="bg-gray-light p-6 rounded-2xl">
                <div className="flex justify-center">
                  <QRCodeDisplay voucher={selectedVoucher} />
                </div>
              </div>

              {/* Voucher Details */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4">
                <div className="text-center">
                  <h4 className="text-xl font-black text-primary-black mb-1">{selectedVoucher.code}</h4>
                  <p className="text-2xl font-black text-green-600 mb-1">{formatValue(selectedVoucher)}</p>
                  <p className="text-sm text-gray-dark font-medium">{selectedVoucher.description}</p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setShowQRCode(false)}
                className="w-full py-4 bg-gradient-to-r from-primary-orange to-primary-orange-light text-white font-bold rounded-2xl hover:shadow-xl transition-all duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// QR Code Display Component
const QRCodeDisplay = ({ voucher }) => {
  const qrRef = useRef(null)
  
  // Generate QR code data for voucher
  const qrData = JSON.stringify({
    voucherId: voucher.id,
    code: voucher.code,
    value: voucher.value,
    type: voucher.type,
    expiresAt: voucher.expiresAt,
    barbershop: 'TPX Barbershop'
  })

  useEffect(() => {
    if (qrRef.current) {
      // Generate QR code as canvas
      QRCode.toCanvas(qrRef.current, qrData, {
        width: 192,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      }, (error) => {
        if (error) console.error('QR Code generation error:', error)
      })
    }
  }, [qrData])

  return <canvas ref={qrRef} className="rounded-xl" />
}

export default VoucherManagement