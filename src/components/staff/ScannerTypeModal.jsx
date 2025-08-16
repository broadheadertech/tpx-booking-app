import React from 'react'
import Modal from '../common/Modal'
import { QrCode, Receipt, Gift } from 'lucide-react'

const ScannerTypeModal = ({ isOpen, onClose, onSelectType }) => {
  console.log('ScannerTypeModal render - isOpen:', isOpen)
  const scannerTypes = [
    {
      id: 'voucher',
      title: 'Scan Voucher',
      description: 'Scan customer voucher QR codes to redeem discounts',
      icon: Gift,
      color: 'from-[#FF8C42] to-[#FF7A2B]',
      borderColor: 'border-[#FF8C42]',
      textColor: 'text-[#FF8C42]'
    },
    {
      id: 'booking',
      title: 'Scan Booking',
      description: 'Scan booking confirmation QR codes to check-in customers',
      icon: Receipt,
      color: 'from-[#1A1A1A] to-[#2A2A2A]',
      borderColor: 'border-[#1A1A1A]',
      textColor: 'text-[#1A1A1A]'
    }
  ]

  const handleSelectType = (type) => {
    console.log('handleSelectType called with:', type)
    onSelectType(type)
    // Don't close immediately, let parent handle the transition
    // onClose()
  }

  if (!isOpen) {
    console.log('ScannerTypeModal not rendering - isOpen is false')
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Choose Scanner Type" size="md">
      <div className="space-y-4">
        <p className="text-[#6B6B6B] text-center mb-6">
          Select what type of QR code you want to scan
        </p>
        
        {scannerTypes.map((type) => {
          const IconComponent = type.icon
          return (
            <button
              key={type.id}
              onClick={() => handleSelectType(type.id)}
              className={`w-full p-6 rounded-2xl border-2 ${type.borderColor} hover:bg-gray-50 transition-all duration-300 group text-left`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${type.textColor} mb-2`}>
                    {type.title}
                  </h3>
                  <p className="text-[#6B6B6B] text-sm leading-relaxed">
                    {type.description}
                  </p>
                </div>
                <div className="flex items-center">
                  <QrCode className={`w-6 h-6 ${type.textColor} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
                </div>
              </div>
            </button>
          )
        })}
        
        <div className="pt-4 border-t border-[#F5F5F5]">
          <button
            onClick={onClose}
            className="w-full py-3 px-6 border-2 border-[#6B6B6B]/20 text-[#6B6B6B] font-semibold rounded-xl hover:bg-[#6B6B6B] hover:text-white transition-all duration-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default ScannerTypeModal
