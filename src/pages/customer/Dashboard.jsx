import React, { useState, useEffect } from 'react'
import { User, Calendar, Gift, Star, Clock, MapPin, Phone, History } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import bannerImage from '../../assets/img/banner.jpg'
import loyaltyService from '../../services/customer/loyaltyService'
import voucherService from '../../services/customer/voucherService'
import { useAuth } from '../../context/AuthContext'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState('home')
  const [customerData, setCustomerData] = useState(null)
  const [loyaltyPoints, setLoyaltyPoints] = useState(0)
  const [activeVouchers, setActiveVouchers] = useState(0)
  const [loading, setLoading] = useState(true)

  const sections = [
    { id: 'home', label: 'Dashboard', icon: User },
    { id: 'booking', label: 'Book', icon: Calendar },
    { id: 'bookings', label: 'My Bookings', icon: History },
    { id: 'vouchers', label: 'Vouchers', icon: Gift }
  ]

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData()
    }
  }, [isAuthenticated, user])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch loyalty points
      const pointsData = await loyaltyService.getUserPoints()
      setLoyaltyPoints(pointsData.total_points || 0)
      
      // Fetch available vouchers count
      const availableVouchers = await voucherService.getAvailableVouchers()
      setActiveVouchers(availableVouchers.length)
      
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickStats = [
    { 
      label: 'Loyalty Points', 
      value: loading ? '...' : loyaltyService.formatPoints(loyaltyPoints), 
      icon: Star 
    },
    { 
      label: 'Active Vouchers', 
      value: loading ? '...' : activeVouchers.toString(), 
      icon: Gift 
    }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'booking':
        return <ServiceBooking onBack={(section) => setActiveSection(section || 'home')} />
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
            {/* Hero Section with Image */}
            <div className="relative overflow-hidden">
              {/* Background Image */}
              <div className="h-56 relative">
                {/* Banner Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${bannerImage})`,
                    filter: 'brightness(0.7) contrast(1.1)'
                  }}
                ></div>
                
                {/* Gradient Overlays for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/40 via-transparent to-black/60"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                
                {/* Animated particles effect */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-orange-300 rounded-full animate-pulse"></div>
                  <div className="absolute top-12 right-8 w-1 h-1 bg-white rounded-full animate-ping"></div>
                  <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-orange-200 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-8 right-4 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                </div>
                
                {/* Bottom wave */}
                <svg className="absolute bottom-0 left-0 right-0" viewBox="0 0 1440 120" fill="none">
                  <path d="M0,64L1440,96L1440,120L0,120Z" fill="#F4F0E6"></path>
                </svg>
              </div>
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">
                {/* Professional Typography */}
                <div className="space-y-3">
                  <h1 className="text-4xl md:text-5xl font-light text-white drop-shadow-2xl tracking-wider">
                    <span className="font-thin">TPX</span>
                    <span className="font-extralight text-orange-200 ml-2">BARBERSHOP</span>
                  </h1>
                  
                  {/* Minimalist divider */}
                  <div className="flex justify-center">
                    <div className="w-16 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent"></div>
                  </div>
                  
                  <p className="text-white/80 font-light text-sm tracking-widest uppercase">
                    Premium Grooming
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats - Simplified */}
            <div className="px-4 -mt-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat) => {
                  const IconComponent = stat.icon
                  return (
                    <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-lg border" style={{borderColor: '#E0E0E0'}}>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2" style={{backgroundColor: '#F68B24'}}>
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold" style={{color: '#36454F'}}>{stat.value}</div>
                        <div className="text-sm font-medium" style={{color: '#8B8B8B'}}>{stat.label}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Main Actions - Streamlined */}
            <div className="px-4 space-y-4">
         
              {/* Primary Action - Book Service */}
              <button
                onClick={() => setActiveSection('booking')}
                className="w-full p-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className="flex items-center justify-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-white">Book Your Service</h3>
                    <p className="text-white/80">Schedule your next appointment</p>
                  </div>
                </div>
              </button>

              {/* Secondary Actions */}
            
            </div>

            {/* Shop Info */}
            <div className="bg-white mx-4 rounded-xl p-4 shadow-sm border" style={{borderColor: '#E0E0E0'}}>
              <h3 className="text-sm font-bold mb-3 text-center" style={{color: '#36454F'}}>Shop Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>123 Main Street, Quezon City</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <Phone className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium" style={{color: '#8B8B8B'}}>9:00 AM - 8:00 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: '#F4F0E6'}}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{backgroundColor: '#36454F'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{backgroundColor: '#F68B24'}}>
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-white">TPX Barbershop</h1>
                <p className="text-xs font-medium" style={{color: '#F68B24'}}>Dashboard</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-white">Welcome</p>
              <p className="text-xs text-gray-300">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t" style={{borderColor: '#E0E0E0'}}>
        <div className="max-w-md mx-auto px-4">
          <div className="grid grid-cols-4 py-2">
            {sections.map((section) => {
              const IconComponent = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="flex flex-col items-center space-y-1 py-2 px-1 rounded-lg transition-all duration-200"
                  style={{
                    backgroundColor: isActive ? '#F68B24' : 'transparent',
                    color: isActive ? 'white' : '#8B8B8B'
                  }}
                >
                  <IconComponent className="w-4 h-4" />
                  <span className="text-xs font-medium">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard