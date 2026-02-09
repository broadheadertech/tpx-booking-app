import React, { useState } from 'react'
import { Gift, Calendar, DollarSign, CheckCircle, Clock, QrCode } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import QRCode from 'qrcode'

const CustomerVouchers = () => {
  const { user } = useCurrentUser()
  const [selectedVoucher, setSelectedVoucher] = useState(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [showQRModal, setShowQRModal] = useState(false)

  // Get user's voucher
  const userVouchers = useQuery(
    api.services.vouchers.getVouchersByUser,
    user ? { userId: user.id } : "skip"
  )

  const redeemVoucher = useMutation(api.services.vouchers.redeemVoucher)

  const generateQRCode = async (voucher) => {
    try {
      const qrData = {
        code: voucher.code,
        user_id: user.id,
        value: voucher.value,
      }

      const url = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF',
        },
      })
      setQrCodeUrl(url)
      setSelectedVoucher(voucher)
      setShowQRModal(true)
    } catch (err) {
      console.error('Failed to generate QR code:', err)
    }
  }

  const handleRedeemVoucher = async (voucher) => {
    try {
      await redeemVoucher({
        code: voucher.code,
        user_id: user.id,
      })
      alert('Voucher redeemed successfully!')
    } catch (err) {
      console.error('Failed to redeem voucher:', err)
      alert(err.message || 'Failed to redeem voucher')
    }
  }

  const getStatusConfig = (voucher) => {
    if (voucher.assignment?.status === 'redeemed') {
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
    if (voucher.isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        icon: Clock,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
    return {
      status: 'available',
      label: 'Available',
      icon: Gift,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      iconColor: 'text-orange-500'
    }
  }

  if (!user) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Please log in to view your vouchers.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">My Vouchers</h2>
        <div className="text-sm text-gray-600">
          {userVouchers?.length || 0} voucher{userVouchers?.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Vouchers Grid */}
      {userVouchers && userVouchers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userVouchers.map((voucher) => {
            const statusConfig = getStatusConfig(voucher)
            const StatusIcon = statusConfig.icon

            return (
              <div
                key={voucher._id}
                className={`bg-white rounded-lg border-2 ${statusConfig.border} shadow-sm hover:shadow-md transition-shadow p-6`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-orange-50 rounded-lg">
                      <Gift className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-bold text-gray-900">{voucher.code}</p>
                      <p className="text-xs text-gray-500">Points: {voucher.points_required}</p>
                    </div>
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                    <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                    <span className={`text-xs font-medium ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">{voucher.description}</p>
                  
                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-gray-700">Value</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">₱{parseFloat(voucher.value).toFixed(2)}</span>
                  </div>

                  <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-700">Expires</span>
                    </div>
                    <span className={`text-sm ${voucher.isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                      {new Date(voucher.expires_at).toLocaleDateString()}
                    </span>
                  </div>

                  {voucher.assignment && (
                    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700">Assigned</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {new Date(voucher.assignment.assigned_at).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {voucher.assignment?.status === 'assigned' && !voucher.isExpired && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                    <button
                      onClick={() => generateQRCode(voucher)}
                      className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center justify-center"
                    >
                      <QrCode className="h-4 w-4 mr-2" /> Show QR Code
                    </button>
                    <button
                      onClick={() => handleRedeemVoucher(voucher)}
                      className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      Redeem Voucher
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Gift className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vouchers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have any vouchers assigned to you yet.
          </p>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Voucher QR Code
              </h3>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Code: {selectedVoucher.code}</p>
                <p className="text-sm text-gray-600 mb-4">Value: ₱{parseFloat(selectedVoucher.value).toFixed(2)}</p>
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="Voucher QR Code" className="mx-auto" />
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Show this QR code to staff to redeem your voucher
              </p>
              <button
                onClick={() => {
                  setShowQRModal(false)
                  setSelectedVoucher(null)
                  setQrCodeUrl('')
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

export default CustomerVouchers