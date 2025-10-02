import React, { useState } from 'react'
import { QrCode, UserPlus, Calendar, Gift } from 'lucide-react'
import QRScannerModal from './QRScannerModal'

import AddCustomerModal from './AddCustomerModal'
import CreateBookingModal from './CreateBookingModal'
import CreateVoucherModal from './CreateVoucherModal'

const QuickActions = ({ onAddCustomer, onCreateBooking, onCreateVoucher, onVoucherScanned, onBookingScanned, activeModal, setActiveModal }) => {
  // Use external modal state if provided, otherwise use internal state
  const [internalModal, setInternalModal] = useState(null)
  const currentModal = activeModal !== undefined ? activeModal : internalModal
  const setCurrentModal = setActiveModal || setInternalModal

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Primary Action - QR Scanner */}
      <button
        onClick={() => setCurrentModal('scannerSelection')}
        className="group relative text-center p-4 bg-[#1A1A1A] border border-[#FF8C42]/50 hover:border-[#FF8C42] rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF8C42]/5 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-white mb-2 text-sm">QR Scanner</h3>
          <div className="w-full py-1.5 px-3 border border-[#FF8C42]/30 text-[#FF8C42] font-medium rounded-md hover:bg-[#FF8C42]/10 transition-colors text-xs">
            Open Scanner
          </div>
        </div>
      </button>

      {/* Add Customer */}
      <button
        onClick={() => setCurrentModal('customer')}
        className="group relative text-center p-4 bg-[#1A1A1A] border border-[#2A2A2A]/50 hover:border-[#FF8C42]/30 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF8C42]/5 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-white mb-2 text-sm">Add Customer</h3>
          <div className="w-full py-1.5 px-3 border border-[#FF8C42]/30 text-[#FF8C42] font-medium rounded-md hover:bg-[#FF8C42]/10 transition-colors text-xs">
            New Customer
          </div>
        </div>
      </button>

      {/* New Booking */}
      <button
        onClick={() => setCurrentModal('booking')}
        className="group relative text-center p-4 bg-[#1A1A1A] border border-[#2A2A2A]/50 hover:border-[#2A2A2A] rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-gray-500/5 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-[#2A2A2A] to-[#1A1A1A] rounded-lg flex items-center justify-center border border-[#3A3A3A]">
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <h3 className="font-semibold text-white mb-2 text-sm">New Booking</h3>
          <div className="w-full py-1.5 px-3 border border-[#2A2A2A] text-gray-400 font-medium rounded-md hover:bg-[#1A1A1A] hover:text-white hover:border-[#3A3A3A] transition-colors text-xs">
            Book Appointment
          </div>
        </div>
      </button>

      {/* Create Voucher */}
      <button
        onClick={() => setCurrentModal('voucher')}
        className="group relative text-center p-4 bg-[#1A1A1A] border border-[#2A2A2A]/50 hover:border-[#FF8C42]/30 rounded-lg hover:shadow-lg transition-all duration-200 overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF8C42]/5 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="relative z-10">
          <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <h3 className="font-semibold text-white mb-2 text-sm">Create Voucher</h3>
          <div className="w-full py-1.5 px-3 border border-[#FF8C42]/30 text-[#FF8C42] font-medium rounded-md hover:bg-[#FF8C42]/10 transition-colors text-xs">
            New Voucher
          </div>
        </div>
      </button>

      {/* Modals */}
      {/* Scanner Selection Modal */}
       {currentModal === 'scannerSelection' && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-[#1A1A1A] rounded-xl p-6 max-w-md w-full shadow-2xl border border-[#2A2A2A]/50">
            <div className="text-center space-y-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B]">
                <QrCode className="w-5 h-5 text-white" />
              </div>

              <div>
                <h3 className="text-lg font-bold mb-1 text-white">Choose Scanner</h3>
                <p className="text-gray-400 text-xs">Select the type of QR code</p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setCurrentModal('bookingScanner')}
                  className="w-full p-3 border border-[#2A2A2A] rounded-lg hover:border-[#FF8C42]/50 hover:bg-[#1A1A1A]/50 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-white text-sm">Booking QR</h4>
                      <p className="text-gray-400 text-xs">Scan customer booking QR codes</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentModal('voucherScanner')}
                  className="w-full p-3 border border-[#2A2A2A] rounded-lg hover:border-[#FF8C42]/50 hover:bg-[#1A1A1A]/50 transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center group-hover:scale-105 transition-transform">
                      <Gift className="w-4 h-4 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-semibold text-white text-sm">Voucher QR</h4>
                      <p className="text-gray-400 text-xs">Scan and redeem voucher QR codes</p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setCurrentModal(null)}
                className="w-full py-2 px-4 border border-[#2A2A2A] text-gray-400 font-medium rounded-lg hover:bg-[#1A1A1A] hover:text-white hover:border-[#3A3A3A] transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {currentModal === 'voucherScanner' && (
        <QRScannerModal 
          isOpen={true}
          onClose={() => setCurrentModal(null)}
          onVoucherScanned={(voucher) => {
            onVoucherScanned?.(voucher)
            setCurrentModal(null)
          }}
        />
      )}
      
      {currentModal === 'bookingScanner' && (
        <QRScannerModal 
          isOpen={true}
          onClose={() => setCurrentModal(null)}
        />
      )}
      
      <AddCustomerModal 
        isOpen={currentModal === 'customer'} 
        onClose={() => setCurrentModal(null)}
        onSubmit={(customer) => {
          onAddCustomer?.(customer)
          setCurrentModal(null)
        }}
      />
      
      <CreateBookingModal 
        isOpen={currentModal === 'booking'} 
        onClose={() => setCurrentModal(null)}
        onSubmit={(booking) => {
          onCreateBooking?.(booking)
          setCurrentModal(null)
        }}
      />
      
      <CreateVoucherModal 
        isOpen={currentModal === 'voucher'} 
        onClose={() => setCurrentModal(null)}
        onSubmit={(voucher) => {
          onCreateVoucher?.(voucher)
          setCurrentModal(null)
        }}
      />
    </div>
  )
}

export default QuickActions
