import apiService from '../api.js'

class BookingsService {
  async getAllBookings() {
    try {
      const response = await apiService.get('/bookings/')

      // Handle both paginated and non-paginated responses
      if (response && Array.isArray(response.results)) {
        return response.results.map((booking) => this.transformBookingData(booking))
      }
      if (Array.isArray(response)) {
        return response.map((booking) => this.transformBookingData(booking))
      }

      // If response is an object but not paginated, try to normalize
      if (response && typeof response === 'object' && response.count !== undefined && !Array.isArray(response.results)) {
        return []
      }

      return []
    } catch (error) {
      console.error('BookingsService: Error fetching bookings:', error)
      throw error
    }
  }

  async getBooking(id) {
    try {
      const booking = await apiService.get(`/bookings/${id}/`)
      return this.transformBookingData(booking)
    } catch (error) {
      console.error('Error fetching booking:', error)
      throw error
    }
  }

  async createBooking(bookingData) {
    try {
      // API expects: service, barber (optional), date, time
      const payload = {
        service: bookingData.service || bookingData.service_id,
        date: bookingData.date,
        time: bookingData.time,
      }

      if (bookingData.barber || bookingData.barber_id) {
        payload.barber = bookingData.barber || bookingData.barber_id
      }

      const booking = await apiService.post('/bookings/', payload)
      return this.transformBookingData(booking)
    } catch (error) {
      console.error('Error creating booking:', error)
      throw error
    }
  }

  async updateBooking(id, bookingData) {
    try {
      const payload = {
        service: bookingData.service || bookingData.service_id,
        date: bookingData.date,
        time: bookingData.time,
      }

      if (bookingData.barber || bookingData.barber_id) {
        payload.barber = bookingData.barber || bookingData.barber_id
      } else {
        // Explicitly send null if barber is cleared
        payload.barber = null
      }

      const booking = await apiService.put(`/bookings/${id}/`, payload)
      return this.transformBookingData(booking)
    } catch (error) {
      console.error('Error updating booking:', error)
      throw error
    }
  }

  async patchBooking(id, partialData) {
    try {
      const booking = await apiService.patch(`/bookings/${id}/`, partialData)
      return this.transformBookingData(booking)
    } catch (error) {
      console.error('Error patching booking:', error)
      throw error
    }
  }

  async deleteBooking(id) {
    try {
      await apiService.delete(`/bookings/${id}/`)
      return true
    } catch (error) {
      console.error('Error deleting booking:', error)
      throw error
    }
  }

  async updateBookingStatus(id, status) {
    return await this.patchBooking(id, { status })
  }

  async getTodayBookings() {
    const today = new Date().toISOString().split('T')[0]
    const bookings = await this.getAllBookings()
    return bookings.filter((booking) => booking.date === today)
  }

  async getUpcomingBookings(days = 7) {
    const bookings = await this.getAllBookings()
    const today = new Date()
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.date)
      return bookingDate >= today && bookingDate <= futureDate
    })
  }

  // Transform booking data to ensure consistent structure
  transformBookingData(booking) {
    if (!booking) return null

    try {
      const transformed = {
        id: booking.id,
        booking_code: booking.booking_code || `BK${String(booking.id).padStart(6, '0')}`,
        service: booking.service,
        service_id: booking.service, // For backward compatibility
        barber: booking.barber ?? null,
        barber_id: booking.barber ?? null, // For backward compatibility
        barber_name: booking.barber_name || 'Unassigned',
        date: booking.date,
        time: this.normalizeTime(booking.time),
        status: booking.status || 'pending',
        created_at: booking.created_at,
        // Add formatted versions for easy display
        formattedDate: this.formatDate(booking.date),
        formattedTime: this.formatTime(booking.time),
        formattedStatus: this.formatStatus(booking.status || 'pending'),
      }
      return transformed
    } catch (error) {
      console.error('BookingsService: Error transforming booking:', error, 'Original booking:', booking)
      // Return a minimal version if transformation fails
      return {
        id: booking.id,
        booking_code: booking.booking_code || 'N/A',
        service: booking.service,
        barber: booking.barber ?? null,
        barber_name: booking.barber_name || 'Unassigned',
        date: booking.date,
        time: booking.time,
        status: booking.status || 'pending',
        created_at: booking.created_at,
      }
    }
  }

  // Normalize time format from API response
  normalizeTime(timeString) {
    if (!timeString) return 'N/A'

    // Handle ISO datetime strings (e.g., "10:09:54.751Z")
    if (typeof timeString === 'string' && (timeString.includes('T') || timeString.includes('Z'))) {
      const date = new Date(timeString)
      return date.toTimeString().substring(0, 8) // HH:MM:SS
    }

    // Handle time strings with microseconds (e.g., "10:09:54.751")
    if (typeof timeString === 'string' && timeString.includes('.')) {
      return timeString.split('.')[0] // Remove microseconds
    }

    // Already in correct format
    return timeString
  }

  // Helper methods for formatting
  formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  formatTime(timeString) {
    if (!timeString) return 'N/A'

    const normalizedTime = this.normalizeTime(timeString)

    // Handle both HH:MM and HH:MM:SS formats
    const timePart = normalizedTime.includes(':') ? normalizedTime.split(':').slice(0, 2).join(':') : normalizedTime
    return timePart
  }

  formatStatus(status) {
    const statusMap = {
      pending: { label: 'Pending', color: 'orange' },
      confirmed: { label: 'Confirmed', color: 'green' },
      cancelled: { label: 'Cancelled', color: 'red' },
    }
    return statusMap[status] || { label: status || 'Unknown', color: 'gray' }
  }
}

export default new BookingsService()