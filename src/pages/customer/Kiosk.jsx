import React, { useState } from 'react'
import { User, Calendar, Gift, Star, Clock, MapPin, Phone, History } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'

const Kiosk = () => {
  const [activeSection, setActiveSection] = useState('home')
  const [customerData, setCustomerData] = useState(null)

  const sections = [
    { id: 'home', label: 'Home', icon: User },
    { id: 'booking', label: 'Book', icon: Calendar },
    { id: 'bookings', label: 'My Bookings', icon: History },
    { id: 'vouchers', label: 'Vouchers', icon: Gift }
  ]

  const quickStats = [
    { label: 'Loyalty Points', value: '1,250', icon: Star },
    { label: 'Active Vouchers', value: '3', icon: Gift },
    { label: 'Total Visits', value: '12', icon: Calendar },
    { label: 'Next Appointment', value: 'Jan 25', icon: Clock }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'booking':
        return <ServiceBooking onBack={() => setActiveSection('home')} />
      case 'bookings':
        return <MyBookings onBack={() => setActiveSection('home')} />
      case 'vouchers':
        return <VoucherManagement onBack={() => setActiveSection('home')} />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => setActiveSection('home')} />
      case 'profile':
        return <CustomerProfile onBack={() => setActiveSection('home')} customerData={customerData} />
      default:
        return (
          <div className="space-y-6">
            {/* Welcome Header */}
            <div className="text-center space-y-4 pt-6 px-4">
              <div className="w-20 h-20 bg-gradient-to-br from-[#FF6644] to-[#FF4422] rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <User className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white mb-2">Welcome to TPX Barbershop</h1>
                <p className="text-sm text-gray-300 font-medium">Your premium grooming experience</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 px-4">
              {quickStats.map((stat) => {
                const IconComponent = stat.icon
                return (
                  <div key={stat.label} className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-2xl p-4 border border-[#FF6644]/30 hover:border-[#FF6644] transition-all duration-200 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-[#FF6644] to-[#FF4422] rounded-xl flex items-center justify-center shadow-lg">
                        <IconComponent className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="text-xl font-black text-white">{stat.value}</div>
                        <div className="text-xs font-medium text-gray-300">{stat.label}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Quick Actions */}
            <div className="px-4 space-y-4">
              <h2 className="text-xl font-black text-white text-center">What would you like to do?</h2>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setActiveSection('booking')}
                  className="p-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-[#FF6644]/30 hover:border-[#FF6644] hover:shadow-2xl rounded-2xl transition-all duration-200 group shadow-lg"
                >
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FF6644] to-[#FF4422] group-hover:from-[#FF5533] group-hover:to-[#FF3311] rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg">
                      <Calendar className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold">Book Service</h3>
                      <p className="text-xs text-gray-300">Schedule appointment</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveSection('vouchers')}
                  className="p-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-[#FF6644]/30 hover:border-[#FF6644] hover:shadow-2xl rounded-2xl transition-all duration-200 group shadow-lg"
                >
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FF6644] to-[#FF4422] group-hover:from-[#FF5533] group-hover:to-[#FF3311] rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg">
                      <Gift className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold">Vouchers</h3>
                      <p className="text-xs text-gray-300">View & redeem</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveSection('bookings')}
                  className="p-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-[#FF6644]/30 hover:border-[#FF6644] hover:shadow-2xl rounded-2xl transition-all duration-200 group shadow-lg"
                >
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FF6644] to-[#FF4422] group-hover:from-[#FF5533] group-hover:to-[#FF3311] rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg">
                      <History className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold">My Bookings</h3>
                      <p className="text-xs text-gray-300">View appointments</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveSection('profile')}
                  className="p-6 bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-[#FF6644]/30 hover:border-[#FF6644] hover:shadow-2xl rounded-2xl transition-all duration-200 group shadow-lg"
                >
                  <div className="flex flex-col items-center space-y-3 text-white">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FF6644] to-[#FF4422] group-hover:from-[#FF5533] group-hover:to-[#FF3311] rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg">
                      <User className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-sm font-bold">Profile</h3>
                      <p className="text-xs text-gray-300">Account settings</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Shop Info */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border border-[#FF6644]/30 mx-4 rounded-2xl p-5 shadow-lg">
              <h3 className="text-base font-black text-white mb-4 text-center">Shop Information</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#FF6644]/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#FF6644]" />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">123 Main Street, Quezon City</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#FF6644]/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-4 h-4 text-[#FF6644]" />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-[#FF6644]/20 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-[#FF6644]" />
                  </div>
                  <span className="text-sm text-gray-300 font-medium">9:00 AM - 8:00 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-[#FF6644]/30 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#FF6644] to-[#FF4422] rounded-xl flex items-center justify-center shadow-lg">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-white">TPX Barbershop</h1>
                <p className="text-xs text-[#FF6644] font-semibold">Client</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-white">Welcome</p>
              <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      {activeSection === 'home' && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-sm border-t border-[#FF6644]/30">
          <div className="max-w-md mx-auto px-4">
            <div className="grid grid-cols-4 py-3">
              {sections.map((section) => {
                const IconComponent = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex flex-col items-center space-y-1 py-2 px-1 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-br from-[#FF6644] to-[#FF4422] text-white shadow-lg'
                        : 'text-gray-400 hover:text-[#FF6644]'
                    }`}
                  >
                    <IconComponent className="w-5 h-5" />
                    <span className="text-xs font-medium">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Kiosk