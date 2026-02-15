import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useBranding } from '../../context/BrandingContext'
import {
  Calendar,
  Clock,
  Scissors,
  User,
  MapPin,
  Plus,
  History,
  ChevronRight,
  Star,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Timer,
  Sparkles,
  CalendarDays,
  Zap,
  Crown,
  ArrowRight,
  QrCode,
  Home,
  Wallet,
  ShoppingBag,
  HelpCircle,
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { customerBookingHubSteps } from '../../config/walkthroughSteps'
import QRCode from 'qrcode'

/**
 * BookingHub - Modern Booking Management Interface
 * Features:
 * - Tab navigation (My Bookings | Book Now | History)
 * - Countdown cards for upcoming appointments
 * - Quick rebook from history
 * - Wow-factor animations
 */

// ============================================
// COUNTDOWN TIMER COMPONENT
// ============================================
const CountdownTimer = ({ targetDate, targetTime }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [isToday, setIsToday] = useState(false)
  const [isNow, setIsNow] = useState(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      // Parse the target date and time
      const [year, month, day] = targetDate.split('-').map(Number)
      const [hours, minutes] = targetTime.split(':').map(Number)

      // Create target date in local time
      const target = new Date(year, month - 1, day, hours, minutes, 0)
      const now = new Date()
      const diff = target - now

      if (diff <= 0) {
        setIsNow(true)
        return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hoursLeft = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const secondsLeft = Math.floor((diff % (1000 * 60)) / 1000)

      setIsToday(days === 0)
      return { days, hours: hoursLeft, minutes: minutesLeft, seconds: secondsLeft }
    }

    setTimeLeft(calculateTimeLeft())
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, targetTime])

  if (isNow) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        <Zap className="w-4 h-4 text-green-400" />
        <span className="text-green-400 font-bold text-sm">HAPPENING NOW!</span>
      </div>
    )
  }

  if (isToday) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded-lg">
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-amber-400 font-bold text-xs">TODAY</span>
        </div>
        <div className="flex items-center gap-1 text-white font-mono">
          <span className="bg-white/10 px-2 py-1 rounded text-sm">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-gray-500">:</span>
          <span className="bg-white/10 px-2 py-1 rounded text-sm">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-gray-500">:</span>
          <span className="bg-white/10 px-2 py-1 rounded text-sm">{String(timeLeft.seconds).padStart(2, '0')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-gray-400 text-sm">
      <CalendarDays className="w-4 h-4" />
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}d `}
        {timeLeft.hours}h {timeLeft.minutes}m
      </span>
    </div>
  )
}

// ============================================
// UPCOMING BOOKING CARD (COUNTDOWN STYLE)
// ============================================
const UpcomingBookingCard = ({ booking, onViewDetails, isPrimary = false }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState(null)
  const [showQR, setShowQR] = useState(false)

  // Generate QR code for booking
  useEffect(() => {
    if (booking._id) {
      QRCode.toDataURL(booking._id, {
        width: 120,
        margin: 2,
        color: { dark: '#ffffff', light: '#00000000' }
      }).then(url => setQrCodeUrl(url))
    }
  }, [booking._id])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const options = { weekday: 'short', month: 'short', day: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const statusConfig = {
    booked: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Confirmed' },
    pending: { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending' },
    completed: { icon: CheckCircle2, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Completed' },
    cancelled: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' },
  }

  const status = statusConfig[booking.status] || statusConfig.pending
  const StatusIcon = status.icon

  if (isPrimary) {
    // Featured card for next upcoming booking
    return (
      <div
        className="relative overflow-hidden rounded-3xl p-1 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]"
      >
        <div className="bg-[var(--color-bg)] rounded-[22px] p-5 relative overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[var(--color-primary)]/10 to-transparent rounded-full blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-[var(--color-accent)]/10 to-transparent rounded-full blur-xl" />

          {/* Header */}
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-bold text-sm">NEXT APPOINTMENT</span>
            </div>
            <div className={`flex items-center gap-1.5 ${status.bg} px-3 py-1 rounded-full`}>
              <StatusIcon className={`w-3.5 h-3.5 ${status.color}`} />
              <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex gap-4 relative z-10">
            {/* Left: Service & Barber Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                {booking.service?.name || 'Haircut'}
              </h3>

              <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                <User className="w-4 h-4" />
                <span>{booking.barber?.name || 'Any Barber'}</span>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="font-medium">{formatDate(booking.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-[var(--color-accent)]" />
                  <span className="font-medium">{formatTime(booking.time)}</span>
                </div>
              </div>

              {/* Countdown */}
              <CountdownTimer targetDate={booking.date} targetTime={booking.time} />
            </div>

            {/* Right: QR Code */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => setShowQR(!showQR)}
                className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
              >
                {showQR && qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="QR Code" className="w-20 h-20" />
                ) : (
                  <QrCode className="w-20 h-20 text-white/30" />
                )}
              </button>
              <span className="text-[10px] text-gray-500 mt-1">Tap for QR</span>
            </div>
          </div>

          {/* Branch Info */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10 relative z-10">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400 text-sm">{booking.branch?.name || 'Main Branch'}</span>
          </div>

          {/* Action Button */}
          <button
            onClick={() => onViewDetails(booking)}
            className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-white font-medium transition-all group"
          >
            <span>View Details</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    )
  }

  // Compact card for other bookings
  return (
    <div
      onClick={() => onViewDetails(booking)}
      className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 transition-all cursor-pointer group"
    >
      <div className="flex items-center gap-4">
        {/* Service Icon */}
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--color-primary)]/20">
          <Scissors className="w-6 h-6 text-[var(--color-primary)]" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white truncate">{booking.service?.name || 'Service'}</h4>
          <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
            <span>{formatDate(booking.date)}</span>
            <span>•</span>
            <span>{formatTime(booking.time)}</span>
          </div>
        </div>

        {/* Status & Arrow */}
        <div className="flex items-center gap-3">
          <div className={`${status.bg} p-1.5 rounded-full`}>
            <StatusIcon className={`w-4 h-4 ${status.color}`} />
          </div>
          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </div>
      </div>

      {/* Countdown for cards within 24 hours */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <CountdownTimer targetDate={booking.date} targetTime={booking.time} />
      </div>
    </div>
  )
}

// ============================================
// HISTORY BOOKING CARD (WITH REBOOK)
// ============================================
const HistoryBookingCard = ({ booking, onRebook }) => {
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
    return date.toLocaleDateString('en-US', options)
  }

  return (
    <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
      <div className="flex items-start gap-4">
        {/* Service Icon */}
        <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center">
          <Scissors className="w-6 h-6 text-gray-400" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{booking.service?.name || 'Service'}</h4>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
            <User className="w-3.5 h-3.5" />
            <span>{booking.barber?.name || 'Any Barber'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(booking.date)}</span>
          </div>

          {/* Rating if completed */}
          {booking.status === 'completed' && booking.rating && (
            <div className="flex items-center gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < booking.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Rebook Button */}
        <button
          onClick={() => onRebook(booking)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
        >
          <RotateCcw className="w-4 h-4" />
          Rebook
        </button>
      </div>
    </div>
  )
}

// ============================================
// QUICK ACTION CARDS
// ============================================
const QuickActionCard = ({ icon: Icon, title, description, onClick, gradient, badge }) => (
  <button
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98] group"
    style={{ background: gradient }}
  >
    {/* Badge */}
    {badge && (
      <div className="absolute top-3 right-3 bg-white/20 px-2 py-0.5 rounded-full">
        <span className="text-[10px] font-bold text-white">{badge}</span>
      </div>
    )}

    <div className="flex items-start gap-3">
      <div className="p-2.5 bg-white/20 rounded-xl">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-white">{title}</h4>
        <p className="text-white/70 text-sm mt-0.5">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all self-center" />
    </div>
  </button>
)

// ============================================
// TAB NAVIGATION
// ============================================
const TabNavigation = ({ activeTab, onTabChange, tabs }) => {
  return (
    <div data-tour="bh-tabs" className="flex bg-[#1A1A1A] rounded-2xl p-1.5 gap-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm transition-all ${
              isActive
                ? 'text-white shadow-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// EMPTY STATE
// ============================================
const EmptyState = ({ icon: Icon, title, description, actionLabel, onAction }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 bg-[var(--color-primary)]/20">
        <Icon className="w-10 h-10 text-[var(--color-primary)]" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400 max-w-xs mb-6">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105 active:scale-95 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

// ============================================
// MAIN BOOKING HUB COMPONENT
// ============================================
const BookingHub = ({ onStartBooking, onViewBookingDetails, defaultTab = 'upcoming' }) => {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const { branding } = useBranding()
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [isNavHidden, setIsNavHidden] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const lastScrollY = useRef(0)

  // Scroll-aware navigation - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return
      if (currentScrollY < 50) {
        setIsNavHidden(false)
      } else if (currentScrollY > lastScrollY.current) {
        setIsNavHidden(true)
      } else {
        setIsNavHidden(false)
      }
      lastScrollY.current = currentScrollY
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Fetch user's bookings (secure query - automatically filters by authenticated user)
  const bookingsData = useQuery(
    api.services.bookings.getMyBookings,
    user?._id ? {} : 'skip'
  )

  const tabs = [
    { id: 'upcoming', label: 'My Bookings', icon: Calendar },
    { id: 'book', label: 'Book Now', icon: Plus },
    { id: 'history', label: 'History', icon: History },
  ]

  // Process bookings into categories
  const { upcomingBookings, historyBookings } = useMemo(() => {
    if (!bookingsData) return { upcomingBookings: [], historyBookings: [] }

    const now = new Date()

    const upcoming = []
    const history = []

    bookingsData.forEach(rawBooking => {
      // Map the flat query response to expected UI structure
      const booking = {
        ...rawBooking,
        service: {
          _id: rawBooking.service,
          name: rawBooking.serviceName,
          price: rawBooking.service_price,
          duration: rawBooking.serviceDuration
        },
        barber: rawBooking.barber ? {
          _id: rawBooking.barber,
          name: rawBooking.barberName
        } : null,
        branch: {
          _id: rawBooking.branch_id,
          name: rawBooking.branchName,
          phone: rawBooking.branchPhone
        }
      }

      // Parse booking date and time
      const bookingDateTime = new Date(`${booking.date}T${booking.time || '00:00'}`)
      const isInPast = bookingDateTime < now
      const isCancelled = booking.status === 'cancelled'
      const isCompleted = booking.status === 'completed'

      if (isCancelled || isCompleted || isInPast) {
        history.push(booking)
      } else {
        upcoming.push(booking)
      }
    })

    // Sort upcoming by date (nearest first)
    upcoming.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
      return dateA - dateB
    })

    // Sort history by date (most recent first)
    history.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time || '00:00'}`)
      const dateB = new Date(`${b.date}T${b.time || '00:00'}`)
      return dateB - dateA
    })

    return { upcomingBookings: upcoming, historyBookings: history }
  }, [bookingsData])

  const handleViewDetails = (booking) => {
    if (onViewBookingDetails) {
      onViewBookingDetails(booking)
    }
  }

  const handleRebook = (booking) => {
    // Navigate to booking with pre-filled data
    if (onStartBooking) {
      onStartBooking({
        rebookFrom: booking,
        service: booking.service,
        barber: booking.barber,
        branch: booking.branch
      })
    }
  }

  const handleStartNewBooking = () => {
    if (onStartBooking) {
      onStartBooking()
    }
  }

  // Handle "Book Now" tab - immediately trigger booking flow
  useEffect(() => {
    if (activeTab === 'book') {
      handleStartNewBooking()
    }
  }, [activeTab])

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'upcoming':
        return (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div data-tour="bh-quick-action" className="grid grid-cols-1 gap-3">
              <QuickActionCard
                icon={Sparkles}
                title="Book New Appointment"
                description="Find your perfect style today"
                onClick={handleStartNewBooking}
                gradient={`linear-gradient(135deg, ${branding?.primaryColor || 'var(--color-primary)'}, ${branding?.accentColor || 'var(--color-accent)'})`}
              />
            </div>

            {/* Upcoming Bookings */}
            {upcomingBookings.length === 0 ? (
              <EmptyState
                icon={Calendar}
                title="No Upcoming Bookings"
                description="You don't have any appointments scheduled. Book your next fresh cut now!"
                actionLabel="Book Appointment"
                onAction={handleStartNewBooking}
              />
            ) : (
              <div data-tour="bh-upcoming" className="space-y-4">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">
                  Upcoming ({upcomingBookings.length})
                </h3>

                {/* Primary Card for Next Booking */}
                {upcomingBookings[0] && (
                  <UpcomingBookingCard
                    booking={upcomingBookings[0]}
                    onViewDetails={handleViewDetails}
                    isPrimary={true}
                  />
                )}

                {/* Other Upcoming Bookings */}
                {upcomingBookings.slice(1).map((booking) => (
                  <UpcomingBookingCard
                    key={booking._id}
                    booking={booking}
                    onViewDetails={handleViewDetails}
                    isPrimary={false}
                  />
                ))}
              </div>
            )}
          </div>
        )

      case 'book':
        // Loading state while redirecting to booking flow
        return (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full" />
            <p className="text-gray-400 mt-4">Loading booking experience...</p>
          </div>
        )

      case 'history':
        return (
          <div className="space-y-4">
            {historyBookings.length === 0 ? (
              <EmptyState
                icon={History}
                title="No Booking History"
                description="Your past appointments will appear here. Book your first appointment to get started!"
                actionLabel="Book First Appointment"
                onAction={handleStartNewBooking}
              />
            ) : (
              <>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide px-1">
                  Past Appointments ({historyBookings.length})
                </h3>
                <div className="space-y-3">
                  {historyBookings.map((booking) => (
                    <HistoryBookingCard
                      key={booking._id}
                      booking={booking}
                      onRebook={handleRebook}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )

      default:
        return null
    }
  }

  // Bottom navigation sections
  const navSections = [
    { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
    { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
    { id: 'wallet', label: 'Pay', icon: Wallet, path: '/customer/wallet' },
    { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
    { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[var(--color-bg)]/95 backdrop-blur-xl border-b border-white/5">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-white">Bookings</h1>
            <button onClick={() => setShowTutorial(true)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors" title="Show tutorial">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
          <TabNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabs={tabs}
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 pb-28">
        {renderContent()}
      </div>

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${
        isNavHidden ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {navSections.map((section) => {
              const IconComponent = section.icon
              const isActive = section.id === 'booking'
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.path)}
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

      <WalkthroughOverlay steps={customerBookingHubSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

export default BookingHub
