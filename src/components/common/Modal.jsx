import React from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  console.log('Modal render - isOpen:', isOpen, 'title:', title)
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className={`relative w-full ${sizeClasses[size]} transform rounded-3xl bg-white shadow-2xl transition-all z-[10000]`}>
          <div className="flex items-center justify-between p-8 border-b border-[#F5F5F5]">
            <h2 className="text-2xl font-black text-[#1A1A1A]">{title}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-2xl bg-[#F5F5F5] hover:bg-[#FF8C42]/10 flex items-center justify-center transition-colors duration-200"
            >
              <X className="w-5 h-5 text-[#6B6B6B] hover:text-[#FF8C42]" />
            </button>
          </div>
          <div className="p-8">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal