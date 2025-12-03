import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Calendar, Gift, Star, Clock, MapPin, Phone, History, User, Bot, Bell, Wallet, Building } from 'lucide-react'
import ServiceBooking from '../../components/customer/ServiceBooking'
import CustomerProfile from '../../components/customer/CustomerProfile'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import PremiumOnboarding from '../../components/customer/PremiumOnboarding'
import AIBarberAssistant from '../../components/customer/AIBarberAssistant'
import Profile from './Profile'
import Carousel from '../../components/customer/Carousel'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'
import { useBranding } from '../../context/BrandingContext'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { useBookingNotificationListener } from '../../utils/bookingNotifications'
import { NotificationBell } from '../../components/common/NotificationSystem'
import NotificationsPage from '../../components/customer/NotificationsPage'

const Dashboard = ({ initialSection = 'home' }) => {
  const { user, isAuthenticated } = useAuth()
  const { branding } = useBranding()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Hook for real-time notifications with toast alerts
  const { unreadCount } = useRealtimeNotifications()

  // Hook for booking notification events
  useBookingNotificationListener()

  // Sync activeSection with initialSection prop when route changes
  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

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
  const branches = useQuery(api.services.branches.getAllBranches)
  const currentBranch = branches?.find(b => b.is_active) || branches?.[0]

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
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'vouchers', label: 'Vouchers', icon: Gift },
    { id: 'ai-assistant', label: 'AI', icon: Bot }
  ]

  // Calculate dashboard stats from Convex data
  const calculateStats = () => {
    const totalBookings = bookings ? bookings.filter(b => b.status !== 'cancelled').length : 0

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
        return <ServiceBooking onBack={(section) => setActiveSection(section || 'home')} />
      case 'bookings':
        return <MyBookings onBack={() => navigate('/customer/dashboard')} />
      case 'vouchers':
        return <VoucherManagement onBack={() => navigate('/customer/dashboard')} />
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
        return <Profile onBack={() => navigate('/customer/dashboard')} />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => navigate('/customer/dashboard')} />
      case 'notifications':
        return <NotificationsPage onBack={() => navigate('/customer/dashboard')} />
      default:
        return (
          <div className="space-y-6">
            {/* Hero Section - Premium Carousel */}
            <div className="px-4 mb-8">
              <div className="relative overflow-hidden rounded-[28px] shadow-2xl">
                <Carousel
                  images={currentBranch?.carousel_images || []}
                  autoPlay={true}
                  interval={5000}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                {/* Welcome Text Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                  <h2 className="text-2xl font-black text-white mb-1">Welcome Back</h2>
                  <p className="text-sm text-white/80 font-medium">Your next grooming experience awaits</p>
                </div>
              </div>
            </div>

            {/* Quick Stats - Premium Design */}
            <div className="px-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                {quickStats.map((stat) => {
                  return (
                    <div
                      key={stat.label}
                      className="relative bg-[var(--color-bg)] rounded-[24px] p-6 border-2 border-[var(--color-primary)]/40 hover:border-[var(--color-primary)] active:scale-[0.98] transition-all duration-200 group"
                    >
                      {/* Subtle gradient background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent rounded-[24px] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* Content */}
                      <div className="relative">
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{stat.label}</div>
                        <div className="text-5xl font-black text-white">{stat.value}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Primary CTA - Premium Design */}
            <div className="px-4 mb-8">
              <button
                onClick={() => setActiveSection('booking')}
                className="w-full relative rounded-[24px] overflow-hidden group active:scale-[0.98] transition-all duration-300"
              >
                {/* Dark background with gradient border effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-accent)] to-[var(--color-primary)] bg-[length:200%_100%] animate-gradient p-[2px] rounded-[24px]">
                  <div className="w-full h-full bg-[var(--color-bg)] rounded-[22px]" />
                </div>

                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary)]/0 via-[var(--color-primary)]/20 to-[var(--color-primary)]/0 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />

                {/* Content */}
                <div className="relative z-10 p-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Icon with gradient background */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl blur-md opacity-60" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
                        <Calendar className="w-7 h-7 text-white" />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="text-left">
                      <div className="text-xl font-black text-white mb-0.5">Book Appointment</div>
                      <div className="text-sm text-gray-400 font-medium">Schedule your next visit</div>
                    </div>
                  </div>

                  {/* Arrow with orange gradient */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>


          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Premium Onboarding Modal */}
      {showOnboarding && (
        <PremiumOnboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Header - Premium Design */}
      {!['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div className="sticky top-0 z-40 bg-[var(--color-bg)]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-between items-center py-5">
              <div className="flex items-center space-x-3">
                <img
                  src={branding?.logo_light_url }
                  alt={branding?.display_name || 'Logo'}
                  className="w-14 h-14 object-contain"
                />
                <div>
                  <h1 className="text-base font-black text-[var(--color-primary)]">{branding?.display_name || ''}</h1>
                  <p className="text-xs font-semibold text-[var(--color-primary)]">{branding?.display_name ? 'Branch' : 'Angeles'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <NotificationBell userId={user?._id} onOpenModal={() => navigate('/customer/notifications')} />
                <button
                  onClick={() => navigate('/customer/profile')}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#1A1A1A] group-hover:ring-[var(--color-primary)]/50 transition-all duration-300">
                    <img
                      src={(user && user.avatar) ? user.avatar : '/img/avatar_default.jpg'}
                      alt={user?.username || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  </div>
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

      {/* Bottom Navigation - Premium Floating Bar */}
      {!showOnboarding && !['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
          <div className="max-w-md mx-auto px-4 pb-6">
            <div className="bg-[var(--color-bg)]/95 backdrop-blur-2xl rounded-[28px] border border-[#1A1A1A] shadow-2xl p-2">
              <div role="navigation" aria-label="Primary" className="grid grid-cols-5 gap-1">
                {sections.map((section) => {
                  const IconComponent = section.icon
                  const isActive = activeSection === section.id
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        if (section.id === 'home') {
                          navigate('/customer/dashboard')
                        } else if (section.id === 'wallet') {
                          navigate('/customer/wallet')
                        } else if (section.id === 'bookings') {
                          navigate('/customer/bookings')
                        } else if (section.id === 'vouchers') {
                          navigate('/customer/vouchers')
                        } else if (section.id === 'ai-assistant') {
                          navigate('/customer/ai-assistant')
                        } else {
                          setActiveSection(section.id)
                        }
                      }}
                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-[20px] transition-all duration-300 relative active:scale-95 ${isActive
                          ? 'bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]'
                          : 'hover:bg-white/5'
                        }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Active indicator - minimal line */}
                      {isActive && (
                        <div className="absolute top-1 w-6 h-0.5 rounded-full bg-white/60" />
                      )}

                      <IconComponent className={`w-6 h-6 mb-1 transition-all ${isActive ? 'text-white' : 'text-gray-500'
                        }`} />

                      <span className={`text-[10px] font-semibold transition-all ${isActive ? 'text-white' : 'text-gray-500'
                        }`}>
                        {section.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
