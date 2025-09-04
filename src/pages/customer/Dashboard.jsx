import React, { useState, useEffect } from 'react'
import { Home, Calendar, Gift, Star, Clock, MapPin, Phone, History, User, ShoppingBag, Bot } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import ProductShop from '../../components/customer/ProductShop'
import PremiumOnboarding from '../../components/customer/PremiumOnboarding'
import AIBarberAssistant from '../../components/customer/AIBarberAssistant'
import Profile from './Profile'
import bannerImage from '../../assets/img/banner.jpg'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState('home')
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Check if onboarding should be shown (once per session)
  useEffect(() => {
    if (isAuthenticated && user) {
      const onboardingCompleted = sessionStorage.getItem('onboarding_completed')
      if (!onboardingCompleted) {
        setShowOnboarding(true)
      }
    }
  }, [isAuthenticated, user])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Convex queries
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const bookings = user?.id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user.id }) : undefined
  const vouchers = user?.id ? useQuery(api.services.vouchers.getVouchersByUser, { userId: user.id }) : undefined

  const sections = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'bookings', label: 'Bookings', icon: History },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
    { id: 'ai-assistant', label: 'TPX AI', icon: Bot }
  ]

  // Calculate dashboard stats from Convex data
  const calculateStats = () => {
    const totalBookings = bookings ? bookings.length : 0
    
    // Count active vouchers (assigned and not expired)
    const activeVouchers = vouchers ? vouchers.filter(v => 
      v.status === 'assigned' && !v.isExpired
    ).length : 0
    
    return {
      totalBookings,
      activeVouchers
    }
  }

  const stats = calculateStats()

  const quickStats = [
    {
      label: 'Total Bookings',
      value: stats.totalBookings.toString(),
      icon: Clock
    },
    {
      label: 'Active Vouchers',
      value: stats.activeVouchers.toString(),
      icon: Gift
    }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'shop':
        return <ProductShop onBack={() => setActiveSection('home')} />
      case 'booking':
        return <ServiceBooking onBack={() => setActiveSection('home')} />
      case 'bookings':
        return <MyBookings onBack={() => setActiveSection('home')} />
      case 'vouchers':
        return <VoucherManagement onBack={() => setActiveSection('home')} />
      case 'ai-assistant':
        return <AIBarberAssistant onNavigateToBooking={(selectedService) => {
          // Navigate to booking with pre-selected service
          setActiveSection('booking')
          // You can store the selected service in state if needed
          if (selectedService) {
            sessionStorage.setItem('preSelectedService', JSON.stringify(selectedService))
          }
        }} />
      case 'profile':
        return <Profile />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => setActiveSection('home')} />
      default:
        return (
          <div className="space-y-6">
            {/* Hero Section with Image */}
            <div className="relative overflow-hidden rounded-2xl mx-4 shadow-2xl">
              {/* Background Image */}
              <div className="h-56 relative">
                {/* Banner Image */}
                <div 
                  className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                  style={{
                    backgroundImage: `url(${bannerImage})`,
                    filter: 'brightness(0.4) contrast(1.2) saturate(1.1)'
                  }}
                ></div>
                
                {/* Dark theme gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF8C42]/30 via-transparent to-[#1A1A1A]/80"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/70 via-transparent to-transparent"></div>
                
                {/* Animated particles effect */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-4 left-4 w-2 h-2 bg-[#FF8C42] rounded-full animate-pulse"></div>
                  <div className="absolute top-12 right-8 w-1 h-1 bg-white rounded-full animate-ping"></div>
                  <div className="absolute bottom-16 left-8 w-1.5 h-1.5 bg-[#FF8C42]/70 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
                  <div className="absolute bottom-8 right-4 w-1 h-1 bg-white rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
                </div>
                
                {/* Bottom wave - removed to fit rounded design */}
              </div>
              
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-6">
                {/* Professional Typography */}
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-light text-white drop-shadow-2xl tracking-wider">
                    <span className="font-thin">TPX</span>
                    <span className="font-extralight text-[#FF8C42] ml-2">BARBERSHOP</span>
                  </h1>
                  
                  {/* Minimalist divider */}
                  <div className="flex justify-center">
                    <div className="w-20 h-px bg-gradient-to-r from-transparent via-[#FF8C42] to-transparent"></div>
                  </div>
                  
                  <p className="text-white/90 font-light text-sm tracking-widest uppercase">
                    Premium Grooming Experience
                  </p>
                  
                  {/* Welcome message */}
                  <p className="text-white/70 font-light text-xs mt-2">
                    Welcome to your personal grooming dashboard
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
                    <div key={stat.label} className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-[#555555]/30">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center mx-auto mb-2 shadow-lg">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-sm font-medium text-gray-400">{stat.label}</div>
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
                className="w-full p-6 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
            <div className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl mx-4 rounded-xl p-4 shadow-sm border border-[#555555]/30">
              <h3 className="text-sm font-bold mb-3 text-center text-white">Shop Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">123 Main Street, Quezon City</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
                    <Phone className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">9:00 AM - 8:00 PM (Mon-Sat)</span>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Premium Onboarding Modal */}
      {showOnboarding && (
        <PremiumOnboarding onComplete={handleOnboardingComplete} />
      )}
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg">
                <img 
                  src="/img/tipuno_x_logo_white.avif" 
                  alt="TPX Barbershop Logo" 
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-sm font-bold text-white">TPX Barbershop</h1>
                  <div className="bg-[#FF8C42]/20 backdrop-blur-sm rounded-full px-1.5 py-0.5 border border-[#FF8C42]/30">
                    <span className="text-xs font-semibold text-[#FF8C42]">v1.0.1</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-[#FF8C42]">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-xs font-medium text-white">Welcome</p>
                <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
              </div>
              <button
                onClick={() => setActiveSection('profile')}
                className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
              >
                <User className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation - Hidden during onboarding */}
      {!showOnboarding && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl shadow-2xl border-t border-[#444444]/30">
        <div className="max-w-md mx-auto px-3">
          <div className="grid grid-cols-5 py-3">
            {sections.map((section) => {
              const IconComponent = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all duration-300 relative ${
                    isActive 
                      ? 'bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg' 
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {/* Active indicator dot */}
                  {isActive && (
                    <div className="absolute -top-1 w-1 h-1 rounded-full bg-white/60" />
                  )}
                  
                  <div className={`p-2 rounded-xl mb-1 transition-all duration-300 ${isActive ? 'bg-white/20 scale-110' : 'bg-transparent'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium tracking-wide">{section.label}</span>
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

export default Dashboard