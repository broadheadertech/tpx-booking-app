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
    xl: 'max-w-6xl',
    compact: 'max-w-sm',  // Compact size - narrow modal
    balanced: 'max-w-lg'  // Balanced size - medium width (good for forms/dialogs)
  }

  const isDark = variant === 'dark'
  
  // Mobile-optimized container - full screen on mobile, regular modal on desktop
  const containerClasses = `${isDark ? 'bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border border-[#333333]/60' : 'bg-white'} relative w-full ${sizeClasses[size]} transform lg:rounded-3xl shadow-2xl transition-all z-[10000] lg:max-h-[90vh] max-h-screen overflow-hidden flex flex-col`
  
  const headerClasses = isDark
    ? `flex items-center justify-between ${compact ? 'p-4 lg:p-5' : 'p-4 lg:p-8'} border-b border-[#2F2F2F] flex-shrink-0`
    : `flex items-center justify-between ${compact ? 'p-4 lg:p-5' : 'p-4 lg:p-8'} border-b border-[#F5F5F5] flex-shrink-0`
  
  const titleClasses = isDark ? 'text-lg lg:text-2xl font-black text-white' : 'text-lg lg:text-2xl font-black text-[#1A1A1A]'
  
  const closeBtnClasses = isDark
    ? 'w-9 h-9 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-[#2A2A2A] hover:bg-[var(--color-primary)]/10 flex items-center justify-center transition-colors duration-200 flex-shrink-0'
    : 'w-9 h-9 lg:w-10 lg:h-10 rounded-xl lg:rounded-2xl bg-[#F5F5F5] hover:bg-[var(--color-primary)]/10 flex items-center justify-center transition-colors duration-200 flex-shrink-0'
  
  const closeIconClasses = isDark ? 'w-5 h-5 text-gray-300 hover:text-[var(--color-primary)]' : 'w-5 h-5 text-[#6B6B6B] hover:text-[var(--color-primary)]'
  
  const bodyPadding = compact ? 'p-4 lg:p-5' : 'p-4 lg:p-8'

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      {/* Desktop: centered modal, Mobile: full screen */}
      <div className="flex min-h-full items-end lg:items-center justify-center lg:p-2">
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
          <div className={`${title ? bodyPadding : 'p-0'} overflow-y-auto flex-1`}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal