import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children, size = 'md', variant = 'light', compact = false }) => {
  if (!isOpen) return null

  const sizeClasses = {
    xs: 'max-w-sm',
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  const isDark = variant === 'dark'
  const containerClasses = `${isDark ? 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border border-[#333333]/60' : 'bg-white'} relative w-full ${sizeClasses[size]} transform rounded-3xl shadow-2xl transition-all z-[10000]`
  const headerClasses = isDark
    ? `flex items-center justify-between ${compact ? 'p-5' : 'p-8'} border-b border-[#2F2F2F]`
    : `flex items-center justify-between ${compact ? 'p-5' : 'p-8'} border-b border-[#F5F5F5]`
  const titleClasses = isDark ? 'text-2xl font-black text-white' : 'text-2xl font-black text-[#1A1A1A]'
  const closeBtnClasses = isDark
    ? 'w-10 h-10 rounded-2xl bg-[#2A2A2A] hover:bg-[#FF8C42]/10 flex items-center justify-center transition-colors duration-200'
    : 'w-10 h-10 rounded-2xl bg-[#F5F5F5] hover:bg-[#FF8C42]/10 flex items-center justify-center transition-colors duration-200'
  const closeIconClasses = isDark ? 'w-5 h-5 text-gray-300 hover:text-[#FF8C42]' : 'w-5 h-5 text-[#6B6B6B] hover:text-[#FF8C42]'
  const bodyPadding = compact ? 'p-5' : 'p-8'

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className={containerClasses}>
          {title && (
            <div className={headerClasses}>
              <h2 className={titleClasses}>{title}</h2>
              <button
                onClick={onClose}
                className={closeBtnClasses}
              >
                <X className={closeIconClasses} />
              </button>
            </div>
          )}
          <div className={title ? bodyPadding : 'p-0'}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal