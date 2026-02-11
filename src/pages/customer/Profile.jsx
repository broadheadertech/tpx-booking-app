import { useState, useEffect, useMemo, useRef } from 'react'
import { User, Edit2, LogOut, Settings, ChevronRight, Shield, Bell, HelpCircle, Star, Sparkles, Home, Scissors, Wallet, ShoppingBag, Calendar, Clock, Gift, Crown, Flame, Award, Dna, Share2, Download } from 'lucide-react'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useUser, useClerk } from '@clerk/clerk-react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useEnsureClerkUser } from '../../hooks/useEnsureClerkUser'
import { useNavigate } from 'react-router-dom'
import { APP_VERSION } from '../../config/version'
import { useBranding } from '../../context/BrandingContext'
import StarRewardsCard from '../../components/common/StarRewardsCard'
import { useAppModal } from '../../context/AppModalContext'

// Bottom Navigation
const NAV_SECTIONS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
  { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
  { id: 'wallet', label: 'Pay', icon: Wallet, path: '/customer/wallet' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
  { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
]

// Helper: Get relative time string
const getRelativeTime = (date) => {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffWeeks === 1) return '1 week ago'
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`
  if (diffMonths === 1) return '1 month ago'
  if (diffMonths < 12) return `${diffMonths} months ago`
  if (diffYears === 1) return '1 year ago'
  return `${diffYears} years ago`
}

// Helper: Get member tenure string
const getMemberTenure = (createdAt) => {
  const now = new Date()
  const joined = new Date(createdAt)
  const diffMs = now - joined
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffDays < 30) return 'New Member'
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`
  return `${diffYears} year${diffYears > 1 ? 's' : ''}`
}

const Profile = () => {
  const { showAlert } = useAppModal()
  const { logout: authLogout, sessionToken } = useCurrentUser()
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser()
  const { signOut } = useClerk()
  const navigate = useNavigate()
  const updateUserProfileMutation = useMutation(api.services.auth.updateUserProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isNavHidden, setIsNavHidden] = useState(false)
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
  const [success, setSuccess] = useState('')
  const { branding } = useBranding()

  // Use the hook that ensures Clerk users have Convex records
  const { user, isLoading: userLoading, isClerkAuth } = useEnsureClerkUser()

  // Fetch user's booking history
  const bookings = useQuery(
    api.services.bookings.getBookingsByCustomer,
    user?._id ? { customerId: user._id } : 'skip'
  ) || []

  // Calculate smart greeting data
  const greetingData = useMemo(() => {
    if (!bookings || bookings.length === 0) return null

    // Find most frequent barber (with ID and branch for quick booking)
    const barberData = {}
    bookings.forEach(b => {
      if (b.barber_name && b.barber_name !== 'Not assigned' && b.barber) {
        if (!barberData[b.barber_name]) {
          barberData[b.barber_name] = {
            count: 0,
            barberId: b.barber,
            branchId: b.branch_id
          }
        }
        barberData[b.barber_name].count++
      }
    })
    const favoriteBarberEntry = Object.entries(barberData).sort((a, b) => b[1].count - a[1].count)[0]
    const favoriteBarber = favoriteBarberEntry ? favoriteBarberEntry[0] : null
    const favoriteBarberInfo = favoriteBarberEntry ? favoriteBarberEntry[1] : null

    // Find most common day/time
    const dayCount = {}
    const timeCount = {}
    bookings.forEach(b => {
      const day = new Date(b.date).toLocaleDateString('en-US', { weekday: 'long' })
      dayCount[day] = (dayCount[day] || 0) + 1
      if (b.time) timeCount[b.time] = (timeCount[b.time] || 0) + 1
    })
    const usualDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0]
    const usualTime = Object.entries(timeCount).sort((a, b) => b[1] - a[1])[0]

    // Get last booking
    const lastBooking = bookings[0]

    // Calculate visit streak (consecutive months with at least 1 completed booking)
    const completedBookings = bookings.filter(b => b.status === 'completed')
    let streak = 0
    if (completedBookings.length > 0) {
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Check consecutive months backwards
      for (let i = 0; i < 24; i++) { // Check up to 24 months back
        const checkMonth = (currentMonth - i + 12) % 12
        const checkYear = currentYear - Math.floor((i - currentMonth + 12) / 12)

        const hasBookingInMonth = completedBookings.some(b => {
          const bookingDate = new Date(b.date)
          return bookingDate.getMonth() === checkMonth && bookingDate.getFullYear() === checkYear
        })

        if (hasBookingInMonth) {
          streak++
        } else if (i > 0) { // Allow current month to not have booking yet
          break
        }
      }
    }

    // Calculate spending insights (this year)
    const thisYear = new Date().getFullYear()
    const thisYearBookings = completedBookings.filter(b => {
      const bookingYear = new Date(b.date).getFullYear()
      return bookingYear === thisYear
    })
    const totalSpentThisYear = thisYearBookings.reduce((sum, b) => sum + (b.final_price || b.price || 0), 0)

    return {
      favoriteBarber,
      favoriteBarberCount: favoriteBarberInfo?.count || 0,
      favoriteBarberData: favoriteBarberInfo ? {
        barberId: favoriteBarberInfo.barberId,
        branchId: favoriteBarberInfo.branchId
      } : null,
      totalBookings: bookings.length,
      usualDay: usualDay ? usualDay[0] : null,
      usualTime: usualTime ? usualTime[0] : null,
      lastBooking,
      completedBookings: completedBookings.length,
      streak,
      totalSpentThisYear,
      bookingsThisYear: thisYearBookings.length,
    }
  }, [bookings])

  // Calculate Style DNA
  const styleDNA = useMemo(() => {
    if (!bookings || bookings.length < 2) return null

    const completedBookings = bookings.filter(b => b.status === 'completed')
    if (completedBookings.length < 2) return null

    // Analyze booking frequency (avg days between bookings)
    let totalDaysBetween = 0
    let countPairs = 0
    for (let i = 0; i < completedBookings.length - 1; i++) {
      const date1 = new Date(completedBookings[i].date)
      const date2 = new Date(completedBookings[i + 1].date)
      const daysDiff = Math.abs((date1 - date2) / (1000 * 60 * 60 * 24))
      totalDaysBetween += daysDiff
      countPairs++
    }
    const avgDaysBetween = countPairs > 0 ? totalDaysBetween / countPairs : 30

    // Analyze service variety
    const uniqueServices = new Set(completedBookings.map(b => b.service_name)).size
    const serviceVariety = uniqueServices / completedBookings.length

    // Analyze time preferences
    const morningBookings = completedBookings.filter(b => {
      const hour = parseInt(b.time?.split(':')[0] || '12')
      return hour < 12
    }).length
    const eveningBookings = completedBookings.filter(b => {
      const hour = parseInt(b.time?.split(':')[0] || '12')
      return hour >= 17
    }).length
    const timePreference = morningBookings > eveningBookings ? 'early' : eveningBookings > morningBookings ? 'late' : 'flexible'

    // Analyze barber loyalty
    const barberCounts = {}
    completedBookings.forEach(b => {
      if (b.barber_name) barberCounts[b.barber_name] = (barberCounts[b.barber_name] || 0) + 1
    })
    const topBarberCount = Math.max(...Object.values(barberCounts), 0)
    const barberLoyalty = topBarberCount / completedBookings.length

    // Determine personality type
    let personality = ''
    let description = ''
    let emoji = ''
    let traits = []

    // High frequency + high barber loyalty = The Perfectionist
    if (avgDaysBetween <= 21 && barberLoyalty > 0.7) {
      personality = 'The Perfectionist'
      description = 'Always fresh, always consistent. You know what works and stick with it.'
      emoji = '💎'
      traits = ['High Maintenance', 'Loyal', 'Consistent']
    }
    // High variety = The Experimenter
    else if (serviceVariety > 0.5) {
      personality = 'The Experimenter'
      description = 'Always trying new styles. Your look is ever-evolving.'
      emoji = '🧪'
      traits = ['Adventurous', 'Trendsetter', 'Bold']
    }
    // Low frequency + high loyalty = The Classic
    else if (avgDaysBetween > 35 && barberLoyalty > 0.6) {
      personality = 'The Classic Gentleman'
      description = 'Timeless style, trusted barber. Quality over quantity.'
      emoji = '👔'
      traits = ['Classic', 'Low Maintenance', 'Loyal']
    }
    // Morning person
    else if (timePreference === 'early') {
      personality = 'The Early Riser'
      description = 'First cuts of the day. You start your day looking sharp.'
      emoji = '🌅'
      traits = ['Morning Person', 'Efficient', 'Prepared']
    }
    // Evening person
    else if (timePreference === 'late') {
      personality = 'The Night Owl'
      description = 'Fresh cuts for the evening. Ready for whatever the night brings.'
      emoji = '🌙'
      traits = ['Evening Vibes', 'Social', 'Relaxed']
    }
    // Default
    else {
      personality = 'The Balanced One'
      description = 'Flexible and adaptable. You go with the flow.'
      emoji = '⚖️'
      traits = ['Flexible', 'Easy-going', 'Adaptable']
    }

    return {
      personality,
      description,
      emoji,
      traits,
      avgDaysBetween: Math.round(avgDaysBetween),
      serviceVariety: Math.round(serviceVariety * 100),
      barberLoyalty: Math.round(barberLoyalty * 100),
      timePreference,
    }
  }, [bookings])

  // Calculate OG status
  const memberSince = user?.createdAt ? new Date(user.createdAt) : null
  const memberYear = memberSince ? memberSince.getFullYear() : null
  const tenure = memberSince ? getMemberTenure(user.createdAt) : null
  const isOG = memberSince && (new Date() - memberSince) > (365 * 24 * 60 * 60 * 1000) // 1+ year
  const isFirstTimer = bookings && bookings.length === 0

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    nickname: '',
    mobile_number: '',
    birthday: ''
  })

  // Share card modal state
  const [showShareCard, setShowShareCard] = useState(false)

  useEffect(() => {
    loadProfileData()
  }, [user, clerkUser])

  const loadProfileData = async () => {
    try {
      if (user) {
        setProfileData({
          username: user.username || user.first_name || '',
          email: user.email || clerkUser?.primaryEmailAddress?.emailAddress || '',
          nickname: user.nickname || user.first_name || '',
          mobile_number: user.mobile_number || clerkUser?.primaryPhoneNumber?.phoneNumber || '',
          birthday: user.birthday || ''
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      if (profileData.nickname && profileData.nickname.length > 100) {
        throw new Error('Nickname must be less than 100 characters')
      }
      if (profileData.mobile_number && profileData.mobile_number.length > 0) {
        if (!/^\+?[0-9\s\-\(\)]{7,}$/.test(profileData.mobile_number)) {
          throw new Error('Please enter a valid phone number')
        }
      }

      const result = await updateUserProfileMutation({
        sessionToken: sessionToken || '',
        nickname: profileData.nickname || undefined,
        email: undefined,
        mobile_number: profileData.mobile_number || undefined,
        birthday: profileData.birthday || undefined,
      })

      if (result) {
        setSuccess('Profile updated!')
        setIsEditing(false)
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setError(error?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      if (isClerkAuth) {
        await signOut()
        window.location.href = '/auth/clerk-login'
      } else {
        await authLogout()
        window.location.href = '/auth/login'
      }
    } catch (error) {
      console.error('Logout error:', error)
      window.location.href = '/auth/login'
    }
  }

  // Loading state
  if (userLoading || (!user && !clerkUser)) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    )
  }

  // Get display name
  const displayName = profileData.nickname || profileData.username || clerkUser?.firstName || 'User'
  const avatarUrl = user?.avatar || clerkUser?.imageUrl || '/img/avatar_default.jpg'

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl border-b border-[#1A1A1A]">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-center py-4">
            <h1 className="text-lg font-bold text-white">Account</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6 pb-32">
        {/* Smart Greeting */}
        {greetingData && greetingData.favoriteBarber && (
          <div className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] rounded-2xl p-4 border border-[#2A2A2A]">
            <p className="text-white font-medium">
              Welcome back, <span className="text-[var(--color-primary)]">{displayName}</span>! 👋
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {greetingData.usualDay && greetingData.usualTime
                ? `Your usual ${greetingData.usualDay} ${greetingData.usualTime} with ${greetingData.favoriteBarber}?`
                : `Ready for another session with ${greetingData.favoriteBarber}?`}
            </p>
            <button
              onClick={() => {
                // Store barber data for pre-selection (skips to step 3)
                if (greetingData.favoriteBarberData) {
                  sessionStorage.setItem('preSelectedBarber', JSON.stringify(greetingData.favoriteBarberData))
                }
                navigate('/customer/booking')
              }}
              className="mt-3 px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-semibold rounded-xl active:scale-95 transition-all"
            >
              Book Now
            </button>
          </div>
        )}

        {/* First-Timer Welcome Offer */}
        {isFirstTimer && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Gift className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-green-400 font-bold">Welcome to TipunoX! 🎉</p>
                <p className="text-green-300/80 text-sm mt-1">
                  Book your first appointment and enjoy our premium grooming experience.
                </p>
                <button
                  onClick={() => navigate('/customer/booking')}
                  className="mt-3 px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl active:scale-95 transition-all"
                >
                  Book Your First Cut
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)]">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />

          <div className="relative z-10 p-6">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white/20">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {isClerkAuth && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center ring-2 ring-[var(--color-primary)]">
                    <Shield className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>

              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-xl font-black text-white mb-1">{displayName}</h2>
                <p className="text-sm text-white/80 mb-2">{profileData.email}</p>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full">
                    <Star className="w-3 h-3 text-white" />
                    <span className="text-xs font-bold text-white">
                      {user?.role === 'staff' ? 'Staff' : 'Member'}
                    </span>
                  </div>
                  {/* OG Status Badge */}
                  {memberYear && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${
                      isOG ? 'bg-amber-500/30' : 'bg-white/10'
                    }`}>
                      {isOG ? <Crown className="w-3 h-3 text-amber-400" /> : <Calendar className="w-3 h-3 text-white/70" />}
                      <span className={`text-xs font-bold ${isOG ? 'text-amber-400' : 'text-white/70'}`}>
                        Since {memberYear}
                      </span>
                    </div>
                  )}
                  {/* Tenure Badge */}
                  {tenure && tenure !== 'New Member' && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full">
                      <Award className="w-3 h-3 text-white/70" />
                      <span className="text-xs font-bold text-white/70">{tenure}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Style DNA Card */}
        {styleDNA && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Dna className="w-4 h-4 text-[var(--color-primary)]" />
                Your Style DNA
              </h3>
              <button
                onClick={() => setShowShareCard(true)}
                className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-orange-500/20 rounded-[20px] border border-purple-500/30 p-5">
              <div className="text-center mb-4">
                <span className="text-4xl">{styleDNA.emoji}</span>
                <h4 className="text-xl font-black text-white mt-2">{styleDNA.personality}</h4>
                <p className="text-sm text-gray-300 mt-1">{styleDNA.description}</p>
              </div>

              {/* Traits */}
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {styleDNA.traits.map((trait, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-white"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* DNA Stats */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-400">{styleDNA.avgDaysBetween}</p>
                  <p className="text-[10px] text-gray-400">Days Between Cuts</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-pink-400">{styleDNA.barberLoyalty}%</p>
                  <p className="text-[10px] text-gray-400">Barber Loyalty</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-orange-400">{styleDNA.serviceVariety}%</p>
                  <p className="text-[10px] text-gray-400">Style Variety</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Star Rewards Card */}
        {user?._id && (
          <div>
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              Your Rewards
            </h3>
            <StarRewardsCard userId={user._id} />
          </div>
        )}

        {/* Recent Bookings with Relative Time */}
        {bookings && bookings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[var(--color-primary)]" />
                Recent Activity
              </h3>
              {bookings.length > 3 && (
                <button
                  onClick={() => navigate('/customer/dashboard', { state: { section: 'bookings' } })}
                  className="text-xs font-semibold text-[var(--color-primary)]"
                >
                  View All
                </button>
              )}
            </div>
            <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden divide-y divide-[#2A2A2A]">
              {bookings.slice(0, 3).map((booking) => (
                <div key={booking._id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    booking.status === 'completed' ? 'bg-green-500/20' :
                    booking.status === 'confirmed' ? 'bg-blue-500/20' :
                    booking.status === 'cancelled' ? 'bg-red-500/20' :
                    'bg-amber-500/20'
                  }`}>
                    <Scissors className={`w-5 h-5 ${
                      booking.status === 'completed' ? 'text-green-400' :
                      booking.status === 'confirmed' ? 'text-blue-400' :
                      booking.status === 'cancelled' ? 'text-red-400' :
                      'text-amber-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {booking.service_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {getRelativeTime(booking.date)} with {booking.barber_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      booking.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      booking.status === 'confirmed' ? 'bg-blue-500/20 text-blue-400' :
                      booking.status === 'cancelled' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Streak & Stats */}
            {greetingData && greetingData.completedBookings > 0 && (
              <div className="mt-4 space-y-3">
                {/* Visit Streak Card */}
                {greetingData.streak > 0 && (
                  <div className={`rounded-xl p-4 border ${
                    greetingData.streak >= 6 ? 'bg-gradient-to-r from-orange-500/20 to-red-500/20 border-orange-500/30' :
                    greetingData.streak >= 3 ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30' :
                    'bg-[#1A1A1A] border-[#2A2A2A]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          greetingData.streak >= 6 ? 'bg-orange-500/30' :
                          greetingData.streak >= 3 ? 'bg-amber-500/30' :
                          'bg-[#2A2A2A]'
                        }`}>
                          <Flame className={`w-6 h-6 ${
                            greetingData.streak >= 6 ? 'text-orange-400' :
                            greetingData.streak >= 3 ? 'text-amber-400' :
                            'text-gray-400'
                          }`} />
                        </div>
                        <div>
                          <p className="text-2xl font-black text-white">
                            {greetingData.streak}
                            <span className="text-base ml-1">
                              {greetingData.streak >= 6 ? '🔥🔥🔥' : greetingData.streak >= 3 ? '🔥🔥' : '🔥'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-400">Month Streak</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-bold px-2 py-1 rounded-full ${
                          greetingData.streak >= 12 ? 'bg-purple-500/20 text-purple-400' :
                          greetingData.streak >= 6 ? 'bg-orange-500/20 text-orange-400' :
                          greetingData.streak >= 3 ? 'bg-amber-500/20 text-amber-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {greetingData.streak >= 12 ? 'LEGENDARY' :
                           greetingData.streak >= 6 ? 'ON FIRE' :
                           greetingData.streak >= 3 ? 'WARMING UP' : 'STARTED'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A] text-center">
                    <p className="text-xl font-black text-[var(--color-primary)]">{greetingData.completedBookings}</p>
                    <p className="text-[10px] text-gray-500">Total Cuts</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A] text-center">
                    <p className="text-xl font-black text-green-400">₱{greetingData.totalSpentThisYear?.toLocaleString() || 0}</p>
                    <p className="text-[10px] text-gray-500">Spent {new Date().getFullYear()}</p>
                  </div>
                  <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A] text-center">
                    <p className="text-xl font-black text-blue-400">{greetingData.bookingsThisYear || 0}</p>
                    <p className="text-[10px] text-gray-500">This Year</p>
                  </div>
                </div>

                {/* Favorite Barber */}
                {greetingData.favoriteBarber && (
                  <div className="bg-[#1A1A1A] rounded-xl p-3 border border-[#2A2A2A] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Star className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{greetingData.favoriteBarber}</p>
                        <p className="text-xs text-gray-500">{greetingData.favoriteBarberCount} cuts together</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        // Store barber data for pre-selection (skips to step 3)
                        if (greetingData.favoriteBarberData) {
                          sessionStorage.setItem('preSelectedBarber', JSON.stringify(greetingData.favoriteBarberData))
                        }
                        navigate('/customer/booking')
                      }}
                      className="px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-lg active:scale-95 transition-all"
                    >
                      Book Again
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4">
            <p className="text-sm text-green-300">{success}</p>
          </div>
        )}

        {/* Personal Information */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-[var(--color-primary)]" />
              Personal Information
            </h3>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs font-semibold text-[var(--color-primary)] flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
            {/* Nickname */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Nickname</label>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.nickname}
                  onChange={(e) => handleInputChange('nickname', e.target.value)}
                  placeholder="Your preferred name"
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">{profileData.nickname || 'Not set'}</p>
              )}
            </div>

            {/* Email */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Email</label>
              <p className="text-white font-medium">{profileData.email}</p>
              {isClerkAuth && (
                <p className="text-xs text-gray-500 mt-1">Managed by Clerk</p>
              )}
            </div>

            {/* Phone */}
            <div className="p-4 border-b border-[#2A2A2A]">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profileData.mobile_number}
                  onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                  placeholder="+63 XXX XXX XXXX"
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">{profileData.mobile_number || 'Not set'}</p>
              )}
            </div>

            {/* Birthday */}
            <div className="p-4">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 block">Birthday</label>
              {isEditing ? (
                <input
                  type="date"
                  value={profileData.birthday}
                  onChange={(e) => handleInputChange('birthday', e.target.value)}
                  className="w-full bg-[#0A0A0A] text-white rounded-xl px-4 py-3 border border-[#2A2A2A] focus:border-[var(--color-primary)] focus:outline-none"
                />
              ) : (
                <p className="text-white font-medium">
                  {profileData.birthday ? new Date(profileData.birthday).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not set'}
                </p>
              )}
            </div>
          </div>

          {/* Save/Cancel for edit mode */}
          {isEditing && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setIsEditing(false)
                  loadProfileData()
                }}
                className="flex-1 py-3 bg-[#1A1A1A] text-white font-semibold rounded-2xl border border-[#2A2A2A] active:scale-[0.98] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4 text-[var(--color-primary)]" />
            Settings
          </h3>
          <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] divide-y divide-[#2A2A2A]">
            <button
              onClick={() => navigate('/customer/notifications')}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors first:rounded-t-[20px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-white">Notifications</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-white">Help & Support</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors last:rounded-b-[20px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-400" />
                </div>
                <span className="text-sm font-medium text-red-400">Sign Out</span>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* App Info */}
        <div className="text-center pt-4">
          <p className="text-xs text-gray-500">{branding?.display_name || 'TipunoX Booking'}</p>
          <p className="text-xs text-gray-600 mt-1">Version {APP_VERSION}</p>
          {isClerkAuth && (
            <p className="text-xs text-[var(--color-primary)] mt-2 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" />
              Secured by Clerk
            </p>
          )}
        </div>
      </div>

      {/* Shareable Profile Card Modal */}
      {showShareCard && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm">
            {/* Close button */}
            <div className="flex justify-end mb-3">
              <button
                onClick={() => setShowShareCard(false)}
                className="text-white/60 hover:text-white text-sm"
              >
                Close ✕
              </button>
            </div>

            {/* Shareable Card */}
            <div
              id="share-card"
              className="bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] rounded-[24px] p-6 border border-[#3A3A3A] shadow-2xl"
            >
              {/* TipunoX Branding */}
              <div className="text-center mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-wider">My Style DNA</p>
                <h3 className="text-2xl font-black bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] bg-clip-text text-transparent">
                  {branding?.display_name || 'TipunoX'}
                </h3>
              </div>

              {/* Profile Section */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-[var(--color-primary)]/30">
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">{displayName}</h4>
                  {memberYear && (
                    <p className="text-xs text-gray-400">Member since {memberYear}</p>
                  )}
                  {isOG && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 rounded-full mt-1">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-bold text-amber-400">OG</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Style DNA */}
              {styleDNA && (
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 mb-4 border border-purple-500/20">
                  <div className="text-center">
                    <span className="text-3xl">{styleDNA.emoji}</span>
                    <h5 className="text-lg font-black text-white mt-1">{styleDNA.personality}</h5>
                    <p className="text-xs text-gray-400 mt-1">{styleDNA.description}</p>
                  </div>
                  <div className="flex justify-center gap-2 mt-3">
                    {styleDNA.traits.map((trait, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-[10px] text-white">
                        {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-[#0A0A0A] rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-[var(--color-primary)]">
                    {greetingData?.completedBookings || 0}
                  </p>
                  <p className="text-[9px] text-gray-500">Total Cuts</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-orange-400">
                    {greetingData?.streak || 0}🔥
                  </p>
                  <p className="text-[9px] text-gray-500">Month Streak</p>
                </div>
                <div className="bg-[#0A0A0A] rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-purple-400 truncate">
                    {greetingData?.favoriteBarber || '-'}
                  </p>
                  <p className="text-[9px] text-gray-500">My Barber</p>
                </div>
              </div>

              {/* QR Code Placeholder / CTA */}
              <div className="text-center pt-3 border-t border-[#2A2A2A]">
                <p className="text-xs text-gray-500">Book your appointment at</p>
                <p className="text-sm font-bold text-[var(--color-primary)]">@{branding?.display_name || 'TPXBarbershop'}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  // Copy to clipboard functionality
                  const text = `Check out my Style DNA at ${branding?.display_name || 'TipunoX'}! I'm "${styleDNA?.personality || 'a valued member'}" with ${greetingData?.completedBookings || 0} cuts and a ${greetingData?.streak || 0}-month streak! 💈🔥`
                  navigator.clipboard.writeText(text)
                  showAlert({ title: 'Copied', message: 'Copied to clipboard!', type: 'success' })
                }}
                className="flex-1 py-3 bg-[#2A2A2A] text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Download className="w-4 h-4" />
                Copy Text
              </button>
              <button
                onClick={() => {
                  // Share via Web Share API if available
                  if (navigator.share) {
                    navigator.share({
                      title: `My ${branding?.display_name || 'TipunoX'} Style DNA`,
                      text: `I'm "${styleDNA?.personality || 'a valued member'}" at ${branding?.display_name || 'TipunoX'}! ${greetingData?.completedBookings || 0} cuts, ${greetingData?.streak || 0}-month streak 💈🔥`,
                      url: window.location.origin,
                    })
                  } else {
                    showAlert({ title: 'Share Unavailable', message: 'Share not supported on this device. Screenshot the card instead!', type: 'info' })
                  }
                }}
                className="flex-1 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>

            <p className="text-center text-xs text-gray-500 mt-3">
              📸 Screenshot this card to share on Instagram!
            </p>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ease-in-out ${
        isNavHidden ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {NAV_SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = section.id === 'profile'
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.path)}
                  className={`flex flex-col items-center justify-center py-2 md:py-3 transition-colors ${
                    isActive ? 'text-[var(--color-primary)]' : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile
