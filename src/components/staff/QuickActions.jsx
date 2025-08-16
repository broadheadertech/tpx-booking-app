import React, { useState } from 'react'
import Card from '../common/Card'
import { QrCode, UserPlus, Calendar, Gift } from 'lucide-react'
import ScannerTypeModal from './ScannerTypeModal'
import QRScannerModal from './QRScannerModal'
import BookingQRScannerModal from './BookingQRScannerModal'
import AddCustomerModal from './AddCustomerModal'
import CreateBookingModal from './CreateBookingModal'
import CreateVoucherModal from './CreateVoucherModal'

const QuickActions = ({ onAddCustomer, onCreateBooking, onCreateVoucher, onVoucherScanned, onBookingScanned }) => {
  const [activeModal, setActiveModal] = useState(null)
  
  console.log('QuickActions render - activeModal:', activeModal)
  
  // Add useEffect to debug state changes
  React.useEffect(() => {
    console.log('activeModal changed to:', activeModal)
  }, [activeModal])
  
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
                setActiveModal('scannerType')
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
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] rounded-[28px] opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
        <Card className="relative text-center p-8 bg-white/80 backdrop-blur-xl border border-gray-200/50 hover:border-[#FF8C42]/30 hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF8C42]/5 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] mb-4 text-lg tracking-tight">Add Customer</h3>
            <button 
              onClick={() => setActiveModal('customer')}
              className="w-full py-3 px-6 border-2 border-[#1A1A1A]/20 text-[#1A1A1A] font-semibold rounded-[16px] hover:bg-[#1A1A1A] hover:text-white hover:border-[#1A1A1A] transition-all duration-300 text-sm"
            >
              New Customer
            </button>
          </div>
        </Card>
      </div>
      
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#6B6B6B] to-[#4A4A4A] rounded-[28px] opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
        <Card className="relative text-center p-8 bg-white/80 backdrop-blur-xl border border-gray-200/50 hover:border-[#FF8C42]/30 hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF8C42]/5 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#6B6B6B] to-[#4A4A4A] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] mb-4 text-lg tracking-tight">New Booking</h3>
            <button 
              onClick={() => setActiveModal('booking')}
              className="w-full py-3 px-6 border-2 border-[#6B6B6B]/20 text-[#6B6B6B] font-semibold rounded-[16px] hover:bg-[#6B6B6B] hover:text-white hover:border-[#6B6B6B] transition-all duration-300 text-sm"
            >
              Book Appointment
            </button>
          </div>
        </Card>
      </div>
      
      <div className="group relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-[28px] opacity-0 group-hover:opacity-20 blur-sm transition-all duration-500"></div>
        <Card className="relative text-center p-8 bg-white/80 backdrop-blur-xl border border-gray-200/50 hover:border-[#FF8C42]/30 hover:shadow-xl transform hover:-translate-y-2 transition-all duration-500 rounded-[24px] group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF8C42]/5 to-transparent rounded-full -translate-y-12 translate-x-12"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-[20px] flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-bold text-[#1A1A1A] mb-4 text-lg tracking-tight">Create Voucher</h3>
            <button 
              onClick={() => setActiveModal('voucher')}
              className="w-full py-3 px-6 border-2 border-[#FF8C42]/20 text-[#FF8C42] font-semibold rounded-[16px] hover:bg-[#FF8C42] hover:text-white hover:border-[#FF8C42] transition-all duration-300 text-sm"
            >
              New Voucher
            </button>
          </div>
        </Card>
      </div>

      {/* Debug activeModal state */}
      {activeModal && (
        <div className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded z-[10001]">
          Active Modal: {activeModal}
        </div>
      )}

      {/* Modals */}
      {activeModal === 'scannerType' && (
        <ScannerTypeModal 
          isOpen={true}
          onClose={() => {
            console.log('ScannerTypeModal onClose called')
            setActiveModal(null)
          }}
          onSelectType={(type) => {
            console.log('ScannerTypeModal onSelectType called with:', type)
            console.log('About to set activeModal to:', type === 'voucher' ? 'voucherScanner' : 'bookingScanner')
            
            // Use setTimeout to ensure state update happens after current render cycle
            setTimeout(() => {
              if (type === 'voucher') {
                setActiveModal('voucherScanner')
              } else if (type === 'booking') {
                setActiveModal('bookingScanner')
              }
            }, 0)
          }}
        />
      )}
      
      {activeModal === 'voucherScanner' && (
        <QRScannerModal 
          isOpen={true}
          onClose={() => setActiveModal('scannerType')}
          onVoucherScanned={(voucher) => {
            onVoucherScanned?.(voucher)
            setActiveModal(null)
          }}
        />
      )}
      
      {activeModal === 'bookingScanner' && (
        <BookingQRScannerModal 
          isOpen={true}
          onClose={() => {
            console.log('BookingQRScannerModal onClose called')
            setActiveModal('scannerType')
          }}
          onBookingScanned={(booking) => {
            console.log('BookingQRScannerModal onBookingScanned called with:', booking)
            onBookingScanned?.(booking)
            setActiveModal(null)
          }}
        />
      )}
      
      <AddCustomerModal 
        isOpen={activeModal === 'customer'} 
        onClose={() => setActiveModal(null)}
        onSubmit={(customer) => {
          onAddCustomer?.(customer)
          setActiveModal(null)
        }}
      />
      
      <CreateBookingModal 
        isOpen={activeModal === 'booking'} 
        onClose={() => setActiveModal(null)}
        onSubmit={(booking) => {
          onCreateBooking?.(booking)
          setActiveModal(null)
        }}
      />
      
      <CreateVoucherModal 
        isOpen={activeModal === 'voucher'} 
        onClose={() => setActiveModal(null)}
        onSubmit={(voucher) => {
          onCreateVoucher?.(voucher)
          setActiveModal(null)
        }}
      />
    </div>
  )
}

export default QuickActions