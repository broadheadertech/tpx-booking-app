import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import BookingHub from '../../components/customer/BookingHub'
import ServiceBooking from '../../components/customer/ServiceBooking'
import BookingDetailModal from '../../components/customer/BookingDetailModal'

/**
 * Customer Booking Page
 *
 * Modern booking experience with:
 * - BookingHub: Tab-based navigation (My Bookings | Book Now | History)
 * - ServiceBooking: Booking flow when creating new appointment
 * - Seamless transitions between views
 */
function CustomerBooking() {
  const [searchParams] = useSearchParams()

  // View state: 'hub' (default) or 'booking' (creating new booking)
  // Check both URL param and sessionStorage for booking intent
  const [currentView, setCurrentView] = useState(() => {
    const hasBookAction = searchParams.get('action') === 'book'
    const hasPreSelectedBarber = sessionStorage.getItem('preSelectedBarber')
    return (hasBookAction || hasPreSelectedBarber) ? 'booking' : 'hub'
  })

  // Listen for URL parameter changes (e.g., navigating from feed with ?action=book)
  useEffect(() => {
    const hasBookAction = searchParams.get('action') === 'book'
    const hasPreSelectedBarber = sessionStorage.getItem('preSelectedBarber')
    if (hasBookAction || hasPreSelectedBarber) {
      setCurrentView('booking')
    }
  }, [searchParams])

  // Pre-filled booking data (for rebook feature)
  const [bookingPrefill, setBookingPrefill] = useState(null)

  // Booking detail modal state
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // Handle starting a new booking
  const handleStartBooking = useCallback((prefillData = null) => {
    setBookingPrefill(prefillData)
    setCurrentView('booking')
  }, [])

  // Handle going back from booking flow to hub
  const handleBackToHub = useCallback(() => {
    setBookingPrefill(null)
    setCurrentView('hub')
  }, [])

  // Handle viewing booking details
  const handleViewBookingDetails = useCallback((booking) => {
    setSelectedBooking(booking)
    setShowDetailModal(true)
  }, [])

  // Handle closing detail modal
  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false)
    setSelectedBooking(null)
  }, [])

  // Handle booking completion (after successful booking)
  const handleBookingComplete = useCallback((booking) => {
    // Return to hub with fresh data
    setCurrentView('hub')
    setBookingPrefill(null)
    // Optionally show the new booking details
    if (booking) {
      setSelectedBooking(booking)
      setShowDetailModal(true)
    }
  }, [])

  return (
    <>
      {currentView === 'hub' ? (
        <BookingHub
          onStartBooking={handleStartBooking}
          onViewBookingDetails={handleViewBookingDetails}
          defaultTab="upcoming"
        />
      ) : (
        <ServiceBooking
          onBack={handleBackToHub}
          onComplete={handleBookingComplete}
          prefillData={bookingPrefill}
        />
      )}

      {/* Booking Detail Modal */}
      {showDetailModal && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={handleCloseDetailModal}
          onRebook={(booking) => {
            handleCloseDetailModal()
            handleStartBooking({
              rebookFrom: booking,
              service: booking.service,
              barber: booking.barber,
              branch: booking.branch
            })
          }}
        />
      )}
    </>
  )
}

export default CustomerBooking
