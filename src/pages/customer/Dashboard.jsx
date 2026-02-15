import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, ShoppingBag, User, Wallet, Scissors, HelpCircle } from 'lucide-react'
import VoucherManagement from '../../components/customer/VoucherManagement'
import LoyaltyPoints from '../../components/customer/LoyaltyPoints'
import MyBookings from '../../components/customer/MyBookings'
import PremiumOnboarding from '../../components/customer/PremiumOnboarding'
import AIBarberAssistant from '../../components/customer/AIBarberAssistant'
import Profile from './Profile'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import { useBranding } from '../../context/BrandingContext'
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications'
import { useBookingNotificationListener } from '../../utils/bookingNotifications'
import { NotificationBell } from '../../components/common/NotificationSystem'
import NotificationsPage from '../../components/customer/NotificationsPage'
import ActivePromoBanner from '../../components/common/ActivePromoBanner'
import SocialFeed from '../../components/common/SocialFeed'
import SmartGreeting from '../../components/customer/SmartGreeting'
import StoriesCarousel from '../../components/customer/StoriesCarousel'
import StickyAppointmentCard from '../../components/customer/StickyAppointmentCard'
import WalkthroughOverlay from '../../components/common/WalkthroughOverlay'
import { customerSteps, customerHomeFeedSteps } from '../../config/walkthroughSteps'

const Dashboard = ({ initialSection = 'home' }) => {
  // Use the hook that ensures Clerk users have Convex records
  const { user } = useEnsureClerkUser()
  const { branding } = useBranding()
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState(initialSection)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [isViewingStory, setIsViewingStory] = useState(false)
  const [isNavHidden, setIsNavHidden] = useState(false)
  const [showStickyAppointment, setShowStickyAppointment] = useState(false)
  const [showWalkthrough, setShowWalkthrough] = useState(false)
  const [showHomeTutorial, setShowHomeTutorial] = useState(false)
  const lastScrollY = useRef(0)
  const scrollThreshold = 10 // Minimum scroll distance to trigger hide/show
  const stickyCardThreshold = 200 // Show sticky card after scrolling this far

  // Tutorial completion mutation
  const markTutorialComplete = useMutation(api.services.auth.markTutorialComplete)

  // Determine authentication status
  const isAuthenticated = !!user

  // Hook for real-time notifications with toast alerts
  useRealtimeNotifications()

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

  // Show walkthrough tutorial for first-time users
  useEffect(() => {
    if (isAuthenticated && user?._id && !user.has_seen_tutorial && !showOnboarding && activeSection === 'home') {
      // Small delay so the page renders first and nav targets exist
      const timer = setTimeout(() => setShowWalkthrough(true), 800)
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user, showOnboarding, activeSection])

  const handleWalkthroughComplete = useCallback(async () => {
    setShowWalkthrough(false)
    if (user?._id) {
      try { await markTutorialComplete({ user_id: user._id }) } catch (e) { console.error('[Walkthrough] Error saving:', e) }
    }
  }, [user?._id, markTutorialComplete])

  const handleWalkthroughSkip = useCallback(async () => {
    setShowWalkthrough(false)
    if (user?._id) {
      try { await markTutorialComplete({ user_id: user._id }) } catch (e) { console.error('[Walkthrough] Error saving:', e) }
    }
  }, [user?._id, markTutorialComplete])

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

  // Scroll-aware navigation - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Show sticky appointment card after scrolling past greeting
      setShowStickyAppointment(currentScrollY > stickyCardThreshold)

      // Only trigger nav hide/show after threshold
      if (Math.abs(currentScrollY - lastScrollY.current) < scrollThreshold) {
        return
      }

      // At the very top, always show nav
      if (currentScrollY < 50) {
        setIsNavHidden(false)
      } else if (currentScrollY > lastScrollY.current) {
        // Scrolling down - hide nav
        setIsNavHidden(true)
      } else {
        // Scrolling up - show nav
        setIsNavHidden(false)
      }

      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  // Handle booking from feed post (Quick Book CTA)
  const handleBookWithBarber = (author) => {
    // If we have barber data, store it for pre-selection
    if (author?.barberId) {
      // Store pre-selected barber info for ServiceBooking to pick up
      // Use the post's branch (author.branchId) so booking is on the correct branch
      sessionStorage.setItem('preSelectedBarber', JSON.stringify({
        branchId: author.branchId || currentBranch?._id,
        barberId: author.barberId
      }))
    } else {
      // Clear any stale pre-selection data
      sessionStorage.removeItem('preSelectedBarber')
    }

    // Always navigate to booking flow (even without barber pre-selection)
    navigate('/customer/booking?action=book')
  }

  // Get current branch for feed
  const branches = useQuery(api.services.branches.getAllBranches)
  const currentBranch = branches?.find(b => b.is_active) || branches?.[0]

  // Navigation sections
  const sections = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'booking', label: 'Book', icon: Scissors },
    { id: 'wallet', label: 'Pay', icon: Wallet },
    { id: 'shop', label: 'Shop', icon: ShoppingBag },
    { id: 'profile', label: 'Account', icon: User }
  ]

  const renderContent = () => {
    switch (activeSection) {
      case 'booking':
        // Redirect to new BookingHub
        navigate('/customer/booking')
        return null
      case 'bookings':
        return <MyBookings onBack={() => navigate('/customer/dashboard')} />
      case 'vouchers':
        return <VoucherManagement onBack={() => navigate('/customer/dashboard')} />
      case 'ai-assistant':
        return <AIBarberAssistant onNavigateToBooking={(selectedService) => {
          // Store pre-selected service if provided
          if (selectedService) {
            sessionStorage.setItem('preSelectedService', JSON.stringify(selectedService))
          }
          // Navigate to booking hub
          navigate('/customer/booking?action=book')
        }} />
      case 'profile':
        return <Profile onBack={() => navigate('/customer/dashboard')} />
      case 'loyalty':
        return <LoyaltyPoints onBack={() => navigate('/customer/dashboard')} />
      case 'notifications':
        return <NotificationsPage onBack={() => navigate('/customer/dashboard')} />
      default:
        return (
          <div className="space-y-4 pt-4">
            {/* Smart Greeting Card */}
            <div data-tour="home-greeting" className="px-4">
              <SmartGreeting
                user={user}
                onBookNow={() => navigate('/customer/booking?action=book')}
              />
            </div>

            {/* Stories Carousel - Instagram Style */}
            <div data-tour="home-stories" className="px-4">
              <StoriesCarousel
                onStoryOpen={() => setIsViewingStory(true)}
                onStoryClose={() => setIsViewingStory(false)}
              />
            </div>

            {/* Active Promotions Banner - Compact */}
            {user?._id && currentBranch?._id && (
              <div data-tour="home-promos" className="px-4">
                <ActivePromoBanner userId={user._id} branchId={currentBranch._id} />
              </div>
            )}

            {/* Social Feed - Feed Dominant Layout (all branches) */}
            <div data-tour="home-feed" className="px-4 pb-4">
              <SocialFeed
                userId={user?._id}
                limit={20}
                showFilters={true}
                onBookWithBarber={handleBookWithBarber}
              />
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

      {/* Header - Starbucks Style with scroll animation */}
      {!isViewingStory && !['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div
          className={`sticky top-0 z-40 bg-[var(--color-bg)]/98 backdrop-blur-2xl border-b border-[#1A1A1A] transition-transform duration-300 ease-in-out ${
            isNavHidden ? '-translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="max-w-md mx-auto px-4">
            <div className="flex justify-between items-center py-4">
              {/* Left - Logo */}
              <div className="flex items-center space-x-3">
                <img
                  src={branding?.logo_light_url}
                  alt={branding?.display_name || 'Logo'}
                  className="w-10 h-10 object-contain"
                />
                <span className="text-lg font-bold text-white">{branding?.display_name || 'TipunoX'}</span>
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

      {/* Sticky Appointment Card - Shows at top when nav is hidden */}
      {!showOnboarding && !isViewingStory && activeSection === 'home' && user?._id && (
        <StickyAppointmentCard
          userId={user._id}
          isVisible={isNavHidden}
        />
      )}

      {/* Bottom Navigation */}
      {!showOnboarding && !isViewingStory && !['booking', 'vouchers', 'ai-assistant', 'loyalty', 'bookings', 'profile'].includes(activeSection) && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${
            isNavHidden ? 'translate-y-full' : 'translate-y-0'
          }`}
        >
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
              {sections.map((section) => {
                const IconComponent = section.icon
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    data-tour={`customer-nav-${section.id}`}
                    onClick={() => {
                      if (section.id === 'home') {
                        navigate('/customer/dashboard')
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      } else if (section.id === 'booking') {
                        navigate('/customer/booking')
                      } else if (section.id === 'wallet') {
                        navigate('/customer/wallet')
                      } else if (section.id === 'shop') {
                        navigate('/customer/shop')
                      } else if (section.id === 'profile') {
                        navigate('/customer/profile')
                      } else {
                        setActiveSection(section.id)
                      }
                    }}
                    className={`flex flex-col items-center justify-center py-2 md:py-3 transition-colors ${
                      isActive ? 'text-[var(--color-primary)]' : 'text-gray-600 hover:text-gray-400'
                    }`}
                  >
                    <IconComponent className="w-5 h-5 md:w-6 md:h-6" />
                    <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Walkthrough Tutorial Overlay */}
      <WalkthroughOverlay
        steps={customerSteps}
        isVisible={showWalkthrough}
        onComplete={handleWalkthroughComplete}
        onSkip={handleWalkthroughSkip}
      />

      {/* Home Feed Tutorial Overlay */}
      <WalkthroughOverlay
        steps={customerHomeFeedSteps}
        isVisible={showHomeTutorial}
        onComplete={() => setShowHomeTutorial(false)}
        onSkip={() => setShowHomeTutorial(false)}
      />

      {/* Floating Help Button — re-trigger walkthrough */}
      {!showWalkthrough && !showHomeTutorial && !showOnboarding && !isViewingStory && activeSection === 'home' && user?.has_seen_tutorial && (
        <button
          onClick={() => setShowHomeTutorial(true)}
          className="fixed bottom-20 right-4 z-40 w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all shadow-lg shadow-black/40"
          title="Show tutorial"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export default Dashboard
