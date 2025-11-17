import React from 'react'
import Modal from '../common/Modal'
import { LogOut, X } from 'lucide-react'

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const handleLogout = () => {
    onConfirm()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={null} size="xs">
      <div className="text-center p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors duration-200"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
        {/* Icon */}
        <div className="mx-auto w-12 h-12 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full flex items-center justify-center mb-4">
          <LogOut className="w-6 h-6 text-white" />
        </div>

        {/* Title and Message */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">Sign Out?</h2>
          <p className="text-sm text-[#6B6B6B]">
            You'll need to sign in again to access the dashboard.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            className="flex-1 py-2 px-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white hover:from-[var(--color-accent)] hover:brightness-110 font-medium rounded-lg transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default LogoutConfirmModal