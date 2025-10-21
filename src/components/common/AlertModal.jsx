import React from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Info, HelpCircle, X } from 'lucide-react'

/**
 * AlertModal Component - Replaces alert() and confirm() with proper modals
 * 
 * Usage:
 *   <AlertModal
 *     isOpen={isOpen}
 *     type="success" // 'success', 'error', 'warning', 'info', 'confirm'
 *     title="Action Complete"
 *     message="Your action was successful"
 *     onClose={() => setIsOpen(false)}
 *     onConfirm={() => { handleConfirm(); setIsOpen(false); }}
 *   />
 */

const AlertModal = ({ 
  isOpen, 
  onClose, 
  type = 'info',
  title, 
  message,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  showCancel = true,
  accent = 'auto', // 'auto' | 'brand' | 'blue' | 'green' | 'red' | 'yellow'
  icon // optional custom icon ReactNode
}) => {
  if (!isOpen) return null

  const getAccent = () => {
    // Determine accent color classes (text/border/bg) based on prop or type
    if (accent && accent !== 'auto') return accent
    switch (type) {
      case 'success':
        return 'green'
      case 'error':
        return 'red'
      case 'warning':
        return 'yellow'
      case 'confirm':
        return 'brand'
      default:
        return 'blue'
    }
  }

  const accentKey = getAccent()
  const accentText = accentKey === 'brand' ? 'text-[#FF8C42]' : `text-${accentKey}-400`
  const accentBorder = accentKey === 'brand' ? 'border-[#FF8C42]/50' : `border-${accentKey}-500/50`
  const accentBg = accentKey === 'brand' ? 'bg-[#FF8C42]/20 hover:bg-[#FF8C42]/30' : `bg-${accentKey}-500/20 hover:bg-${accentKey}-500/30`

  const getIcon = () => {
    if (icon) return icon
    switch(type) {
      case 'success':
        return <CheckCircle className={`w-12 h-12 ${accentText}`} />
      case 'error':
        return <AlertCircle className={`w-12 h-12 ${accentText}`} />
      case 'warning':
        return <AlertCircle className={`w-12 h-12 ${accentText}`} />
      case 'confirm':
        return <HelpCircle className={`w-12 h-12 ${accentText}`} />
      default:
        return <Info className={`w-12 h-12 ${accentText}`} />
    }
  }

  const getButtonColors = () => `${accentBg} ${accentText} ${accentBorder}`

  const isConfirm = type === 'confirm' || onConfirm

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-2">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border border-[#333333]/60 relative w-full max-w-sm transform rounded-3xl shadow-2xl transition-all z-[10000] p-6 sm:p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#2A2A2A] hover:bg-[#FF8C42]/10 flex items-center justify-center transition-colors duration-200"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300 hover:text-[#FF8C42]" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>

          {/* Title */}
          {title && (
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">
              {title}
            </h2>
          )}

          {/* Message */}
          {message && (
            <p className="text-sm sm:text-base text-gray-300 text-center mb-6">
              {message}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 sm:py-3 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 hover:text-white font-semibold transition-all duration-200 text-sm sm:text-base"
              >
                {cancelText}
              </button>
            )}
            {isConfirm && onConfirm && (
              <button
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`flex-1 px-4 py-2 sm:py-3 rounded-lg border font-semibold transition-all duration-200 text-sm sm:text-base ${getButtonColors()}`}
              >
                {confirmText}
              </button>
            )}
            {!isConfirm && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 sm:py-3 rounded-lg bg-[#FF8C42]/20 hover:bg-[#FF8C42]/30 text-[#FF8C42] border border-[#FF8C42]/50 font-semibold transition-all duration-200 text-sm sm:text-base"
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default AlertModal
