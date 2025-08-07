import React from 'react'
import Modal from '../common/Modal'
import { LogOut, AlertTriangle, Shield } from 'lucide-react'

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const handleLogout = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="text-center space-y-6 p-4">
        {/* Warning Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-red-100">
          <LogOut className="w-10 h-10 text-white" />
        </div>

        {/* Title and Message */}
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-[#1A1A1A]">Confirm Logout</h2>
          <p className="text-[#6B6B6B] font-medium leading-relaxed">
            Are you sure you want to log out of your staff session? You'll need to sign in again to access the dashboard.
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <h4 className="text-sm font-bold text-amber-800 mb-1">Security Notice</h4>
              <p className="text-xs text-amber-700 leading-relaxed">
                Your session data will be cleared and any unsaved changes may be lost. Make sure to complete any ongoing transactions before logging out.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4 pt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-6 border-2 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white font-semibold rounded-xl transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-3 px-6 bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Yes, Logout
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default LogoutConfirmModal