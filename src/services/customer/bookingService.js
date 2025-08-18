import apiService from '../api.js'
import authService from '../auth.js'
import { apiCache, shortCache } from '../../utils/cache.js'

class CustomerBookingService {
  constructor() {
    this.pendingRequests = new Map()
  }
  async getUserBookings() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `user-bookings-${userId}`
      
      // Check cache first
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate identical requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchUserBookings(userId, cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching user bookings:', error)
      throw new Error('Failed to load your bookings. Please try again.')
    }
  }

  async _fetchUserBookings(userId, cacheKey) {
    try {
      // Use the new user-specific bookings endpoint
      const response = await apiService.get('/bookings/my/', { timeout: 30000 })
      
      // Transform and validate data
      const bookings = Array.isArray(response) ? response : []
      const transformedBookings = bookings.map(booking => this.transformBookingData(booking))
      
      // Cache the result for 30 seconds
      shortCache.set(cacheKey, transformedBookings)
      this.pendingRequests.delete(cacheKey)
      
      return transformedBookings
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  async getServices() {
    try {
      const cacheKey = 'services'
      
      // Check cache first (5 minutes for services)
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchServices(cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching services:', error)
      throw new Error('Failed to load services. Please try again.')
    }
  }

  async _fetchServices(cacheKey) {
    try {
      const response = await apiService.get('/services/', { timeout: 30000 })
      const services = Array.isArray(response) ? response : []
      const transformedServices = services.map(service => this.transformServiceData(service))
      
      // Cache for 5 minutes
      apiCache.set(cacheKey, transformedServices)
      this.pendingRequests.delete(cacheKey)
      
      return transformedServices
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  async getBarbers() {
    try {
      const cacheKey = 'active-barbers'
      
      // Check cache first (5 minutes for barbers)
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchBarbers(cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching barbers:', error)
      throw new Error('Failed to load barbers. Please try again.')
    }
  }

  async _fetchBarbers(cacheKey) {
    try {
      const response = await apiService.get('/barbers/', { timeout: 30000 })
      const barbers = Array.isArray(response) ? response : []
      // Filter only active barbers and transform data
      const activeBarbers = barbers
        .filter(barber => barber.is_active)
        .map(barber => this.transformBarberData(barber))
      
      // Cache for 5 minutes
      apiCache.set(cacheKey, activeBarbers)
      this.pendingRequests.delete(cacheKey)
      
      return activeBarbers
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  async getBarbersByService(serviceId) {
    try {
      const cacheKey = `barbers-service-${serviceId}`
      
      // Check cache first
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const barbers = await this.getBarbers()
      // Filter barbers who provide the specific service
      const serviceBarbers = barbers.filter(barber => 
        barber.services && barber.services.includes(serviceId)
      )
      
      // Cache for 5 minutes
      apiCache.set(cacheKey, serviceBarbers)
      
      return serviceBarbers
    } catch (error) {
      console.error('Error fetching barbers for service:', error)
      throw new Error('Failed to load barbers for this service. Please try again.')
    }
  }

  // Get booking data with services and barbers in parallel
  async getBookingData() {
    try {
      const [services, barbers] = await Promise.allSettled([
        this.getServices(),
        this.getBarbers()
      ])

      return {
        services: services.status === 'fulfilled' ? services.value : [],
        barbers: barbers.status === 'fulfilled' ? barbers.value : [],
        // Log any failures
        servicesError: services.status === 'rejected' ? services.reason : null,
        barbersError: barbers.status === 'rejected' ? barbers.reason : null
      }
    } catch (error) {
      console.error('Error fetching booking data:', error)
      return {
        services: [],
        barbers: [],
        servicesError: error,
        barbersError: error
      }
    }
  }

  async createBooking(bookingData) {
    const maxAttempts = 3
    let attempt = 0
    let lastError = null

    // Validate booking data
    const validationErrors = this.validateBookingData(bookingData)
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(', ')
      }
    }

    // Transform UI data to API format
    const apiData = this.transformBookingToAPI(bookingData)

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/bookings/', apiData, { timeout: 45000 })
        
        // Clear relevant caches after successful booking creation
        const userId = authService.getUserId()
        if (userId) {
          shortCache.delete(`user-bookings-${userId}`)
        }
        
        return {
          success: true,
          data: this.transformBookingData(response)
        }
      } catch (error) {
        lastError = error
        const retriable = error?.code === 'ECONNABORTED' || 
                         error?.code === 'NETWORK_ERROR' ||
                         error?.status >= 500
        
        if (!retriable || attempt >= maxAttempts) {
          // Handle API validation errors
          if (error.response?.data) {
            const errorData = error.response.data
            if (typeof errorData === 'object' && !Array.isArray(errorData)) {
              // Handle non_field_errors specifically
              if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
                return {
                  success: false,
                  error: errorData.non_field_errors.join('. ')
                }
              }
              
              const errorMessages = Object.entries(errorData)
                .map(([field, errors]) => {
                  const errorList = Array.isArray(errors) ? errors : [errors]
                  if (field === 'non_field_errors') {
                    return errorList.join('. ')
                  }
                  return `${field}: ${errorList.join(', ')}`
                })
                .join('; ')
              return {
                success: false,
                error: errorMessages
              }
            }
          }
          
          return {
            success: false,
            error: error?.message || 'Failed to create booking'
          }
        }
        // Exponential backoff before retry
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Booking creation failed after multiple attempts'
    }
  }

  async updateBooking(bookingId, updates) {
    try {
      // Transform UI data to API format if needed
      const apiData = this.transformBookingToAPI(updates, true)
      
      const response = await apiService.patch(`/bookings/${bookingId}/`, apiData, { timeout: 30000 })
      
      // Clear relevant caches after successful update
      const userId = authService.getUserId()
      if (userId) {
        shortCache.delete(`user-bookings-${userId}`)
      }
      
      return {
        success: true,
        data: this.transformBookingData(response)
      }
    } catch (error) {
      console.error('Error updating booking:', error)
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ')
          return {
            success: false,
            error: errorMessages
          }
        }
      }
      
      return {
        success: false,
        error: error?.message || 'Failed to update booking'
      }
    }
  }

  async cancelBooking(bookingId) {
    try {
      await apiService.delete(`/bookings/${bookingId}/`, { timeout: 30000 })
      
      // Clear relevant caches after successful cancellation
      const userId = authService.getUserId()
      if (userId) {
        shortCache.delete(`user-bookings-${userId}`)
      }
      
      return {
        success: true
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      
      // Handle specific error cases
      if (error?.status === 404) {
        return {
          success: false,
          error: 'Booking not found. It may have already been cancelled or does not exist.'
        }
      }
      
      if (error?.status === 403) {
        return {
          success: false,
          error: 'You do not have permission to cancel this booking.'
        }
      }
      
      if (error?.status === 400) {
        return {
          success: false,
          error: 'This booking cannot be cancelled. It may already be completed or cancelled.'
        }
      }
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ')
          return {
            success: false,
            error: errorMessages
          }
        }
      }
      
      return {
        success: false,
        error: error?.message || 'Failed to cancel booking. Please try again.'
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
      case 'booked':
        return {
          label: 'Booked',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
        }
      case 'pending':
        return {
          label: 'Pending',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200'
        }
      default: // booked (default for new bookings)
        return {
          label: 'Booked',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200'
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

  // Data transformation methods
  transformBookingData(apiBooking) {
    const status = apiBooking.status || 'booked'
    return {
      id: apiBooking.id,
      booking_code: apiBooking.booking_code,
      service: apiBooking.service,
      service_name: apiBooking.service_name || 'Unknown Service',
      barber: apiBooking.barber,
      barber_name: apiBooking.barber_name || 'Any Barber',
      date: apiBooking.date,
      time: apiBooking.time,
      status: status,
      created_at: apiBooking.created_at,
      updated_at: apiBooking.updated_at,
      // UI-friendly formatted data
      displayDate: this.formatBookingDate(apiBooking.date),
      displayTime: this.formatBookingTime(apiBooking.time),
      statusConfig: this.getStatusConfig(status),
      // Additional computed properties
      isPast: new Date(apiBooking.date) < new Date(),
      canCancel: status === 'booked' || status === 'pending' || status === 'confirmed',
      canReschedule: status === 'booked' || status === 'pending' || status === 'confirmed'
    }
  }

  transformServiceData(apiService) {
    return {
      id: apiService.id,
      name: apiService.name,
      description: apiService.description || '',
      price: apiService.price,
      duration: apiService.duration,
      is_active: apiService.is_active,
      // UI-friendly formatted data
      displayPrice: this.formatPrice(apiService.price),
      displayDuration: this.formatDuration(apiService.duration),
      category: apiService.category || 'General'
    }
  }

  transformBarberData(apiBarber) {
    return {
      id: apiBarber.id,
      user: apiBarber.user,
      full_name: apiBarber.full_name,
      name: apiBarber.full_name, // Alias for UI compatibility
      is_active: apiBarber.is_active,
      services: apiBarber.services || [],
      // UI-friendly data
      avatar: this.generateAvatar(apiBarber.full_name),
      specialties: this.mapServicesToSpecialties(apiBarber.services),
      rating: 4.5, // Default rating
      experience: '5+ years' // Default experience
    }
  }

  transformBookingToAPI(uiData, isPartial = false) {
    const apiData = {}
    
    if (uiData.service || uiData.service_id) {
      apiData.service = uiData.service || uiData.service_id
    }
    
    if (uiData.barber || uiData.barber_id) {
      apiData.barber = uiData.barber || uiData.barber_id
    }
    
    if (uiData.date) {
      apiData.date = uiData.date
    }
    
    if (uiData.time) {
      apiData.time = uiData.time
    }
    
    if (uiData.status) {
      apiData.status = uiData.status
    }
    
    return apiData
  }

  // Validation methods
  validateBookingData(bookingData) {
    const errors = []
    
    if (!bookingData.service && !bookingData.service_id) {
      errors.push('Service is required')
    }
    
    if (!bookingData.date) {
      errors.push('Date is required')
    } else {
      const bookingDate = new Date(bookingData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (bookingDate < today) {
        errors.push('Booking date cannot be in the past')
      }
    }
    
    if (!bookingData.time) {
      errors.push('Time is required')
    }
    
    return errors
  }

  // Helper methods
  formatPrice(price) {
    return `₱${parseFloat(price).toFixed(2)}`
  }

  formatDuration(minutes) {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const remainingMinutes = minutes % 60
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
    }
    return `${minutes}m`
  }

  generateAvatar(name) {
    const initials = name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
    
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=40&format=svg&bold=true`
  }

  mapServicesToSpecialties(serviceIds) {
    // Default specialties mapping - could be enhanced with actual service data
    const specialtyMap = {
      1: 'Hair Cut',
      2: 'Beard Styling', 
      3: 'Hot Towel Shave',
      4: 'Hair Coloring',
      5: 'Fade Cuts'
    }
    
    return serviceIds.map(id => specialtyMap[id] || 'General Styling')
  }

  // Cache management
  clearUserCache(userId = null) {
    const userIdToUse = userId || authService.getUserId()
    if (userIdToUse) {
      shortCache.delete(`user-bookings-${userIdToUse}`)
    }
  }

  clearAllCache() {
    apiCache.clear()
    shortCache.clear()
    this.pendingRequests.clear()
  }
}

export default new CustomerBookingService()