import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Calendar, X } from 'lucide-react'

/**
 * StickyAppointmentCard - Top floating reminder when nav is hidden
 * Appears at top of screen when user scrolls down (replacing hidden header)
 */
const StickyAppointmentCard = ({ userId, isVisible = true }) => {
  const navigate = useNavigate()
  const [isDismissed, setIsDismissed] = useState(false)

  // Get user's bookings
  const bookings = useQuery(
    api.services.bookings.getBookingsByCustomer,
    userId ? { customerId: userId } : 'skip'
  )

  // Find the next upcoming booking
  const getUpcomingBooking = () => {
    if (!bookings || bookings.length === 0) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const upcomingBookings = bookings
      .filter(b => {
        const bookingDate = new Date(b.date)
        bookingDate.setHours(0, 0, 0, 0)
        return bookingDate >= today &&
               b.status !== 'cancelled' &&
               b.status !== 'completed' &&
               b.status !== 'no_show'
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    return upcomingBookings[0] || null
  }

  const upcomingBooking = getUpcomingBooking()

  // Reset dismissal when booking changes
  useEffect(() => {
    const dismissedBookingId = sessionStorage.getItem('dismissedAppointmentCard')
    if (upcomingBooking && dismissedBookingId !== upcomingBooking._id) {
      setIsDismissed(false)
    }
  }, [upcomingBooking])

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    const bookingDate = new Date(date)
    bookingDate.setHours(0, 0, 0, 0)

    if (bookingDate.getTime() === today.getTime()) return 'Today'
    if (bookingDate.getTime() === tomorrow.getTime()) return 'Tomorrow'
    return date.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const [hours, minutes] = timeStr.split(':').map(Number)
    if (isNaN(hours)) return timeStr
    const period = hours >= 12 ? 'PM' : 'AM'
    const friendlyHour = hours % 12 || 12
    return `${friendlyHour}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const isAppointmentSoon = () => {
    if (!upcomingBooking) return false
    const bookingDate = new Date(upcomingBooking.date)
    const today = new Date()
    if (bookingDate.toDateString() !== today.toDateString()) return false
    if (upcomingBooking.time) {
      const [hours, minutes] = upcomingBooking.time.split(':').map(Number)
      const bookingTime = new Date(today)
      bookingTime.setHours(hours, minutes, 0, 0)
      const diffMs = bookingTime - today
      const diffMins = Math.floor(diffMs / (1000 * 60))
      return diffMins > 0 && diffMins <= 120
    }
    return false
  }

  const handleDismiss = (e) => {
    e.stopPropagation()
    setIsDismissed(true)
    if (upcomingBooking) {
      sessionStorage.setItem('dismissedAppointmentCard', upcomingBooking._id)
    }
  }

  const handleClick = () => {
    navigate('/customer/bookings')
  }

  if (!upcomingBooking || isDismissed) return null

  const isSoon = isAppointmentSoon()
  const showCard = isVisible

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${
        showCard ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        className={`flex items-center justify-center gap-2 px-4 py-2 cursor-pointer ${
          isSoon
            ? 'bg-green-500 text-white'
            : 'bg-[var(--color-primary)] text-white'
        }`}
      >
        <Calendar className="w-4 h-4" />
        <span className="text-xs font-bold">
          Next: {formatDate(upcomingBooking.date)} at {formatTime(upcomingBooking.time)}
        </span>

        <button
          onClick={handleDismiss}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default StickyAppointmentCard
