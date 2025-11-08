import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Home, Calendar, Gift, Star, Clock, MapPin, Phone, History, User, Bot, Bell } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import PremiumOnboarding from '../../components/customer/PremiumOnboarding'
import AIBarberAssistant from '../../components/customer/AIBarberAssistant'
import Profile from './Profile'
import bannerImage from '../../assets/img/banner.jpg'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { useBookingNotificationListener } from '../../utils/bookingNotifications'
import { NotificationBell } from '../../components/common/NotificationSystem'
import NotificationsPage from '../../components/customer/NotificationsPage'

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()
  const [activeSection, setActiveSection] = useState('home')
  const [showOnboarding, setShowOnboarding] = useState(false)
  
  // Hook for real-time notifications with toast alerts
  const { unreadCount } = useRealtimeNotifications()
  
  // Hook for booking notification events
  useBookingNotificationListener()

  // Check if we're EXACTLY on the customer dashboard route (not on booking or other pages)
  const isOnCustomerDashboard = location.pathname === '/customer/dashboard' &&
    !location.pathname.includes('/home') &&
    !location.pathname.includes('/client')

  // Early return if not on dashboard route - prevents navigation from showing on other pages
  if (!isOnCustomerDashboard) {
    return null
  }

  // Check if onboarding should be shown (once per session)
  useEffect(() => {
    if (isAuthenticated && user) {
      const onboardingCompleted = sessionStorage.getItem('onboarding_completed')
      if (!onboardingCompleted) {
        setShowOnboarding(true)
      }
    }
  }, [isAuthenticated, user])

  // Listen for custom event to switch to bookings tab
  useEffect(() => {
    const handleSwitchToBookings = () => {
      console.log('Switching to bookings tab...')
      setActiveSection('home')
    }

    window.addEventListener('switchToBookings', handleSwitchToBookings)
    return () => {
      window.removeEventListener('switchToBookings', handleSwitchToBookings)
    }
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Convex queries with error handling
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)
  const bookings = user?._id ? useQuery(api.services.bookings.getBookingsByCustomer, { customerId: user._id }) : undefined
  const vouchers = user?._id ? useQuery(api.services.vouchers.getVouchersByUser, { userId: user._id }) : undefined
  
  // Handle query errors
  useEffect(() => {
    if (services === null) {
      console.error('Failed to load services')
    }
    if (barbers === null) {
      console.error('Failed to load barbers')
    }
    if (user?._id && bookings === null) {
      console.error('Failed to load bookings')
    }
    if (user?._id && vouchers === null) {
      console.error('Failed to load vouchers')
    }
  }, [services, barbers, bookings, vouchers, user])

  const sections = [
    { id: 'home', label: 'Home', icon: Home },
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
        return <Profile onBack={() => setActiveSection('home')} />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => setActiveSection('home')} />
      case 'notifications':
        return <NotificationsPage onBack={() => setActiveSection('home')} />
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
                    <span className="font-thin">TipunoX Angeles</span>
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
            <div className="px-4 mt-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat) => {
                  const IconComponent = stat.icon
                  return (
                    <div key={stat.label} className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#FF8C42] flex items-center justify-center mx-auto mb-2">
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
            <div className="bg-[#1A1A1A] mx-4 rounded-xl p-4 border border-[#2A2A2A]">
              <h3 className="text-sm font-bold mb-3 text-center text-white">Shop Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FF8C42] flex items-center justify-center">
                    <MapPin className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">123 Main Street, Quezon City</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FF8C42] flex items-center justify-center">
                    <Phone className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs font-medium text-gray-300">+63 912 345 6789</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-lg bg-[#FF8C42] flex items-center justify-center">
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
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Premium Onboarding Modal */}
      {showOnboarding && (
        <PremiumOnboarding onComplete={handleOnboardingComplete} />
      )}
      
      {/* Header - Hide when on sections with their own navigation */}
      {!['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-xl border-b border-[#1A1A1A]">
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] flex items-center justify-center shadow-lg">
                  <img 
                    src="/img/tipuno_x_logo_white.avif" 
                    alt="TipunoX Angeles Barbershop Logo" 
                    className="w-6 h-6 object-contain"
                  />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white">TipunoX Angeles</h1>
                  <p className="text-xs font-medium text-[#FF8C42]">Barbershop</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <NotificationBell userId={user?._id} onOpenModal={() => setActiveSection('notifications')} />
                <div className="text-right">
                  <p className="text-xs font-medium text-white">Welcome</p>
                  <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => setActiveSection('profile')}
                  className="w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 hover:ring-white/20 transition-colors"
                >
                  <img
                    src={(user && user.avatar) ? user.avatar : '/img/avatar_default.jpg'}
                    alt={user?.username || 'Profile'}
                    className="w-full h-full object-cover"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 max-w-md mx-auto pb-20">
        {renderContent()}
      </div>

      {/* Bottom Navigation - Only show when not onboarding and not on pages with their own navigation */}
      {!showOnboarding && !['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl border-t border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-3">
          <div className="grid grid-cols-4 py-3">
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