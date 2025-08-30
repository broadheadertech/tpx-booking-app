import React, { useState } from 'react'
import Card from '../common/Card'
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
  
  console.log('QuickActions render - currentModal:', currentModal)
  
  // Add useEffect to debug state changes
  React.useEffect(() => {
    console.log('currentModal changed to:', currentModal)
  }, [currentModal])
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Primary Action - Scan Voucher */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF8C42] via-[#FF7A2B] to-[#FF8C42] rounded-[28px] opacity-20 group-hover:opacity-40 blur-sm transition-all duration-500"></div>
        <Card className="relative text-center p-8 bg-gradient-to-br from-[#FF8C42] via-[#FF7A2B] to-[#E67E37] text-white border-0 hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-10 -translate-x-10"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-white/20 backdrop-blur-xl rounded-[20px] flex items-center justify-center shadow-2xl ring-1 ring-white/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold mb-4 text-lg tracking-tight">QR Scanner</h3>
            <button 
              onClick={() => {
                console.log('Scanner button clicked')
                setCurrentModal('scannerSelection')
              }}
              className="w-full py-3 px-6 bg-white/15 backdrop-blur-xl text-white font-semibold rounded-[16px] border border-white/20 hover:bg-white/25 transition-all duration-300 text-sm shadow-lg"
            >
              Open Scanner
            </button>
          </div>
        </Card>
      </div>
      
      {/* Secondary Actions */}
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#333333] to-[#444444] rounded-[28px] opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500"></div>
        <div className="relative text-center p-8 bg-gradient-to-br from-[#2A2A2A] to-[#333333] backdrop-blur-xl border-2 border-[#CC5A14] hover:border-[#FF8C42] hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF8C42]/10 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-white mb-4 text-lg tracking-tight">Add Customer</h3>
            <button 
              onClick={() => setCurrentModal('customer')}
              className="w-full py-3 px-6 border-2 border-[#FF8C42]/30 text-[#FF8C42] font-semibold rounded-[16px] hover:bg-[#FF8C42] hover:text-white hover:border-[#FF8C42] transition-all duration-300 text-sm"
            >
              New Customer
            </button>
          </div>
        </div>
      </div>
      
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#333333] to-[#444444] rounded-[28px] opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500"></div>
        <div className="relative text-center p-8 bg-gradient-to-br from-[#2A2A2A] to-[#333333] backdrop-blur-xl border-2 border-[#CC5A14] hover:border-[#FF8C42] hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#6B6B6B]/10 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#6B6B6B] to-[#4A4A4A] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-white mb-4 text-lg tracking-tight">New Booking</h3>
            <button 
              onClick={() => setCurrentModal('booking')}
              className="w-full py-3 px-6 border-2 border-[#6B6B6B]/30 text-[#6B6B6B] font-semibold rounded-[16px] hover:bg-[#6B6B6B] hover:text-white hover:border-[#6B6B6B] transition-all duration-300 text-sm"
            >
              Book Appointment
            </button>
          </div>
        </div>
      </div>
      
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-[28px] opacity-0 group-hover:opacity-30 blur-sm transition-all duration-500"></div>
        <div className="relative text-center p-8 bg-gradient-to-br from-[#2A2A2A] to-[#333333] backdrop-blur-xl border-2 border-[#CC5A14] hover:border-[#FF8C42] hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF8C42]/10 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-white mb-4 text-lg tracking-tight">Create Voucher</h3>
            <button 
              onClick={() => setCurrentModal('voucher')}
              className="w-full py-3 px-6 border-2 border-[#FF8C42]/30 text-[#FF8C42] font-semibold rounded-[16px] hover:bg-[#FF8C42] hover:text-white hover:border-[#FF8C42] transition-all duration-300 text-sm"
            >
              New Voucher
            </button>
          </div>
        </div>
      </div>

      {/* Debug currentModal state */}
      {currentModal && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded z-[10001]">
          Active Modal: {currentModal}
        </div>
      )}

      {/* Modals */}
      {/* Scanner Selection Modal */}
       {currentModal === 'scannerSelection' && (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-200">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B]">
                <QrCode className="w-8 h-8 text-white" />
              </div>
              
              <div>
                <h3 className="text-2xl font-bold mb-2 text-[#1A1A1A]">Choose Scanner Type</h3>
                <p className="text-[#6B6B6B]">Select what type of QR code you want to scan</p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={() => setCurrentModal('bookingScanner')}
                  className="w-full p-4 border-2 border-[#FF8C42]/20 rounded-xl hover:border-[#FF8C42] hover:bg-[#FF8C42]/5 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-[#1A1A1A] text-lg">Booking QR</h4>
                      <p className="text-[#6B6B6B] text-sm">Scan customer booking QR codes</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setCurrentModal('voucherScanner')}
                  className="w-full p-4 border-2 border-[#FF8C42]/20 rounded-xl hover:border-[#FF8C42] hover:bg-[#FF8C42]/5 transition-all duration-300 group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-[#1A1A1A] text-lg">Voucher QR</h4>
                      <p className="text-[#6B6B6B] text-sm">Scan and redeem voucher QR codes</p>
                    </div>
                  </div>
                </button>
              </div>

              <button
                onClick={() => setCurrentModal(null)}
                className="w-full py-3 px-6 border-2 border-[#6B6B6B]/20 text-[#6B6B6B] font-semibold rounded-xl hover:bg-[#6B6B6B] hover:text-white transition-all duration-300"
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