import React from 'react'
import Modal from '../common/Modal'
import { User, Mail, Calendar, CheckCircle } from 'lucide-react'

const ViewVoucherUsersModal = ({ isOpen, onClose, voucher, assignedUsers = [] }) => {
  if (!voucher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Voucher: ${voucher.code}`} size="md" compact variant="dark">
      <div className="space-y-4">
        {/* Voucher Info Card */}
        <div className="bg-gradient-to-r from-[#1A1A1A] to-[#222222] border border-[#FF8C42]/20 rounded-lg p-3.5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-200 text-uppercase tracking-wider mb-2">Voucher Details</h3>
              <div className="space-y-1 text-xs">
                <p className="text-gray-400">Code: <span className="text-[#FF8C42] font-bold">{voucher.code}</span></p>
                <p className="text-gray-400">Value: <span className="text-[#FF8C42] font-bold">₱{parseFloat(voucher.value).toFixed(2)}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Assigned</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{assignedUsers.length}</p>
            </div>
          </div>
        </div>

        {/* Users List */}
        {assignedUsers.length > 0 ? (
          <div className="bg-[#0F0F0F]/50 border border-[#333333]/50 rounded-lg max-h-64 overflow-y-auto divide-y divide-[#333333]/30">
            {assignedUsers.map((user, index) => (
              <div key={user._id || index} className="p-3 hover:bg-[#1A1A1A]/50 transition-colors">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-8 h-8 bg-[#FF8C42]/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#FF8C42]" />
                  </div>
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200">{user.username || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email || 'No email'}</p>
                  </div>
                  {/* Status */}
                  <div className="text-right flex-shrink-0">
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      user.assignment_status === 'redeemed' ? 'text-green-400' : 'text-blue-400'
                    }`}>
                      <CheckCircle className="w-3 h-3" />
                      <span className="capitalize">
                        {user.assignment_status || 'Assigned'}
                      </span>
                    </div>
                    {user.assigned_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(user.assigned_at).toLocaleDateString()}
                      </p>
                    )}
                    {user.redeemed_at && (
                      <p className="text-xs text-green-500 mt-1">
                        Redeemed: {new Date(user.redeemed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-[#0F0F0F]/50 rounded-lg border border-[#333333]/50">
            <User className="mx-auto h-10 w-10 text-gray-500 mb-2" />
            <h3 className="text-sm font-medium text-gray-300 mb-1">No Users Assigned</h3>
            <p className="text-xs text-gray-500">This voucher hasn't been assigned yet</p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full h-9 px-3 bg-[#2A2A2A] text-gray-300 rounded-lg hover:bg-[#333333] transition-colors font-medium text-sm border border-[#333333]"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default ViewVoucherUsersModal