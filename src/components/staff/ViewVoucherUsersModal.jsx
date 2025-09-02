import React from 'react'
import Modal from '../common/Modal'
import { User, Mail, Calendar, CheckCircle } from 'lucide-react'

const ViewVoucherUsersModal = ({ isOpen, onClose, voucher, assignedUsers = [] }) => {
  if (!voucher) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Users Assigned to Voucher: ${voucher.code}`} size="lg">
      <div className="p-6">
        {/* Voucher Info */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-orange-900">Voucher Details</h3>
              <p className="text-orange-700">Code: {voucher.code}</p>
              <p className="text-orange-700">Value: ₱{parseFloat(voucher.value).toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-600">Assigned Users</p>
              <p className="text-2xl font-bold text-orange-900">{assignedUsers.length}</p>
            </div>
          </div>
        </div>

        {/* Users List */}
        {assignedUsers.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 mb-4">Assigned Users:</h4>
            {assignedUsers.map((user, index) => (
              <div key={user._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.username || 'Unknown User'}</p>
                    <p className="text-sm text-gray-600 flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      {user.email || 'No email'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center ${
                    user.assignment_status === 'redeemed' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium capitalize">
                      {user.assignment_status || 'Assigned'}
                    </span>
                  </div>
                  {user.assigned_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Assigned: {new Date(user.assigned_at).toLocaleDateString()}
                    </p>
                  )}
                  {user.redeemed_at && (
                    <p className="text-xs text-gray-500 mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Redeemed: {new Date(user.redeemed_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Users Assigned</h3>
            <p className="text-gray-600">This voucher hasn't been assigned to any users yet.</p>
          </div>
        )}

        {/* Close Button */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ViewVoucherUsersModal