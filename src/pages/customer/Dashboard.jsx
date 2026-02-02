import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Calendar, Gift, Star, Clock, MapPin, Phone, History, User, Bot, Bell, Wallet, Building, Scissors, Sparkles, ChevronRight } from 'lucide-react'
import { useUser } from '@clerk/clerk-react'
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
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import { useBranding } from '../../context/BrandingContext'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { useBookingNotificationListener } from '../../utils/bookingNotifications'
import { NotificationBell } from '../../components/common/NotificationSystem'
import NotificationsPage from '../../components/customer/NotificationsPage'
import ActivePromoBanner from '../../components/common/ActivePromoBanner'
import StarRewardsCard from '../../components/common/StarRewardsCard'
import SocialFeed from '../../components/common/SocialFeed'

const Dashboard = ({ initialSection = 'home' }) => {
  // Use the hook that ensures Clerk users have Convex records
  const { user, isClerkAuth, clerkUser } = useEnsureClerkUser()
  const { branding } = useBranding()
  const location = useLocation()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // Determine authentication status
  const isAuthenticated = !!user

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
  const bookings = useQuery(
    api.services.bookings.getBookingsByCustomer,
    user?._id ? { customerId: user._id } : 'skip'
  )
  const vouchers = useQuery(
    api.services.vouchers.getVouchersByUser,
    user?._id ? { userId: user._id } : 'skip'
  )
  const branches = useQuery(api.services.branches.getAllBranches)
  const currentBranch = branches?.find(b => b.is_active) || branches?.[0]

  // Wallet balance query for quick card
  const wallet = useQuery(
    api.services.wallet.getWallet,
    user?._id ? { userId: user._id } : 'skip'
  )

  // Recent points transactions for activity feed
  const recentPoints = useQuery(
    api.services.points.getPointsLedger,
    user?._id ? { userId: user._id } : 'skip'
  )

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

  // Starbucks-style navigation
  const sections = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'booking', label: 'Book', icon: Scissors },
    { id: 'wallet', label: 'Pay', icon: Wallet },
    { id: 'loyalty', label: 'Rewards', icon: Star },
    { id: 'profile', label: 'Account', icon: User }
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
          <div className="space-y-6 pt-4">
            {/* Hero Star Rewards Card - Compact */}
            <div className="px-4">
              <StarRewardsCard userId={user?._id} />
            </div>

            {/* Quick Actions - Horizontal Scroll */}
            <div className="px-4">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {/* Wallet Card */}
                <button
                  onClick={() => navigate('/customer/wallet')}
                  className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-[var(--color-primary)]/50 active:scale-[0.98] transition-all min-w-[140px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/20 flex items-center justify-center mb-2">
                    <Wallet className="w-5 h-5 text-[var(--color-primary)]" />
                  </div>
                  <div className="text-lg font-black text-white">
                    ₱{((wallet?.balance || 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-500">Wallet</div>
                </button>

                {/* Book Card */}
                <button
                  onClick={() => setActiveSection('booking')}
                  className="flex-shrink-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-4 active:scale-[0.98] transition-all min-w-[140px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-2">
                    <Scissors className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-lg font-black text-white">Book Now</div>
                  <div className="text-xs text-white/70">Find a slot</div>
                </button>

                {/* Bookings Card */}
                <button
                  onClick={() => navigate('/customer/bookings')}
                  className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-blue-500/50 active:scale-[0.98] transition-all min-w-[140px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
                    <Calendar className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="text-lg font-black text-white">{stats.totalBookings}</div>
                  <div className="text-xs text-gray-500">Bookings</div>
                </button>

                {/* Vouchers Card */}
                <button
                  onClick={() => navigate('/customer/vouchers')}
                  className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-purple-500/50 active:scale-[0.98] transition-all min-w-[140px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center mb-2">
                    <Gift className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="text-lg font-black text-white">{stats.activeVouchers}</div>
                  <div className="text-xs text-gray-500">Vouchers</div>
                </button>
              </div>
            </div>

            {/* Active Promotions Banner */}
            {user?._id && currentBranch?._id && (
              <div className="px-4">
                <ActivePromoBanner userId={user._id} branchId={currentBranch._id} />
              </div>
            )}

            {/* Social Feed - Instagram Style */}
            {currentBranch?._id && (
              <div className="px-4 pb-4">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
                  Latest Updates
                </h3>
                <SocialFeed
                  branchId={currentBranch._id}
                  userId={user?._id}
                  limit={10}
                  showFilters={true}
                />
              </div>
            )}
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

      {/* Header - Starbucks Style */}
      {!['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div className="sticky top-0 z-40 bg-[var(--color-bg)]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              {/* Left - Logo and Greeting */}
              <div className="flex items-center space-x-3">
                <img
                  src={branding?.logo_light_url}
                  alt={branding?.display_name || 'Logo'}
                  className="w-10 h-10 object-contain"
                />
                <div>
                  <p className="text-xs font-medium text-gray-400">Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},</p>
                  <h1 className="text-base font-bold text-white">{user?.first_name || user?.username || 'Guest'} ☀️</h1>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="flex items-center space-x-2">
                <NotificationBell userId={user?._id} onOpenModal={() => navigate('/customer/notifications')} />
                <button
                  onClick={() => navigate('/customer/profile')}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                  <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-[var(--color-primary)]/30 group-hover:ring-[var(--color-primary)]/50 transition-all duration-300">
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
                        } else if (section.id === 'booking') {
                          setActiveSection('booking')
                        } else if (section.id === 'wallet') {
                          navigate('/customer/wallet')
                        } else if (section.id === 'loyalty') {
                          navigate('/customer/loyalty')
                        } else if (section.id === 'profile') {
                          navigate('/customer/profile')
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
