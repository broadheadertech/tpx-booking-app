import apiService from '../api.js'
import authService from '../auth.js'

class CustomerBookingService {
  async getUserBookings() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Use the new user-specific bookings endpoint
      const response = await apiService.get('/bookings/my/', { timeout: 30000 })
      
      // The API returns an array of bookings with nested service and barber data
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error fetching user bookings:', error)
      throw new Error('Failed to load your bookings. Please try again.')
    }
  }

  async getServices() {
    try {
      const response = await apiService.get('/services/', { timeout: 30000 })
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error fetching services:', error)
      throw new Error('Failed to load services. Please try again.')
    }
  }

  async getBarbers() {
    try {
      const response = await apiService.get('/barbers/', { timeout: 30000 })
      // Filter only active barbers
      const barbers = Array.isArray(response) ? response : []
      return barbers.filter(barber => barber.is_active)
    } catch (error) {
      console.error('Error fetching barbers:', error)
      throw new Error('Failed to load barbers. Please try again.')
    }
  }

  async getBarbersByService(serviceId) {
    try {
      const barbers = await this.getBarbers()
      // Filter barbers who provide the specific service
      return barbers.filter(barber => 
        barber.services && barber.services.includes(serviceId)
      )
    } catch (error) {
      console.error('Error fetching barbers for service:', error)
      throw error
    }
  }

  async createBooking(bookingData) {
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/bookings/', bookingData, { timeout: 45000 })
        return {
          success: true,
          data: response
        }
      } catch (error) {
        lastError = error
        const retriable = error?.code === 'ECONNABORTED' || error?.code === 'NETWORK_ERROR'
        if (!retriable || attempt >= maxAttempts) {
          return {
            success: false,
            error: error?.message || 'Failed to create booking'
          }
        }
        // backoff before retry
        await new Promise(res => setTimeout(res, 1000 * attempt))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Booking creation failed'
    }
  }

  async updateBooking(bookingId, updates) {
    try {
      const response = await apiService.patch(`/bookings/${bookingId}/`, updates, { timeout: 30000 })
      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Failed to update booking'
      }
    }
  }

  async cancelBooking(bookingId) {
    try {
      await apiService.delete(`/bookings/${bookingId}/`, { timeout: 30000 })
      return {
        success: true
      }
    } catch (error) {
      return {
        success: false,
        error: error?.message || 'Failed to cancel booking'
      }
    }
  }

  getStatusConfig(status) {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Confirmed',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200'
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200'
        }
      default: // pending
        return {
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        }
    }
  }

  formatBookingDate(date) {
    return new Date(date).toLocaleDateString('en-PH')
  }

  formatBookingTime(time) {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }
}

export default new CustomerBookingService()