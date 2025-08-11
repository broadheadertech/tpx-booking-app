import apiService from '../api.js'

class BarbersService {
  async getAllBarbers() {
    try {
      const response = await apiService.get('/barbers/')
      return response.map(barber => this.transformBarberFromAPI(barber))
    } catch (error) {
      console.error('Error fetching barbers:', error)
      throw error
    }
  }

  async getBarber(id) {
    try {
      const response = await apiService.get(`/barbers/${id}/`)
      return this.transformBarberFromAPI(response)
    } catch (error) {
      console.error('Error fetching barber:', error)
      throw error
    }
  }

  async createBarber(barberData) {
    try {
      // Validate required fields
      const validationErrors = this.validateBarberData(barberData)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      // Transform UI data to API format
      const apiData = this.transformBarberToAPI(barberData)
      console.log('Creating barber with data:', apiData)
      
      const response = await apiService.post('/barbers/', apiData)
      return this.transformBarberFromAPI(response)
    } catch (error) {
      console.error('Error creating barber:', error)
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ')
          throw new Error(errorMessages)
        }
      }
      
      throw new Error(error.message || 'Failed to create barber')
    }
  }

  async updateBarber(id, barberData) {
    try {
      // Validate required fields
      const validationErrors = this.validateBarberData(barberData)
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '))
      }

      const apiData = this.transformBarberToAPI(barberData)
      console.log('Updating barber with data:', apiData)
      
      const response = await apiService.put(`/barbers/${id}/`, apiData)
      return this.transformBarberFromAPI(response)
    } catch (error) {
      console.error('Error updating barber:', error)
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ')
          throw new Error(errorMessages)
        }
      }
      
      throw new Error(error.message || 'Failed to update barber')
    }
  }

  async patchBarber(id, partialData) {
    try {
      const apiData = this.transformBarberToAPI(partialData, true)
      console.log('Patching barber with data:', apiData)
      
      const response = await apiService.patch(`/barbers/${id}/`, apiData)
      return this.transformBarberFromAPI(response)
    } catch (error) {
      console.error('Error updating barber:', error)
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'object' && !Array.isArray(errorData)) {
          const errorMessages = Object.entries(errorData)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('; ')
          throw new Error(errorMessages)
        }
      }
      
      throw new Error(error.message || 'Failed to update barber')
    }
  }

  async deleteBarber(id) {
    try {
      await apiService.delete(`/barbers/${id}/`)
      return true
    } catch (error) {
      console.error('Error deleting barber:', error)
      throw error
    }
  }

  async getActiveBarbers() {
    try {
      const allBarbers = await this.getAllBarbers()
      return allBarbers.filter(barber => barber.is_active)
    } catch (error) {
      console.error('Error fetching active barbers:', error)
      throw error
    }
  }

  // Transform API response to UI format
  transformBarberFromAPI(apiBarber) {
    return {
      id: apiBarber.id,
      user: apiBarber.user,
      full_name: apiBarber.full_name,
      name: apiBarber.full_name, // Alias for UI compatibility
      is_active: apiBarber.is_active,
      services: apiBarber.services || [],
      // Extended UI properties with defaults
      email: `${apiBarber.full_name.toLowerCase().replace(/\s+/g, '.')}@tpxbooking.com`,
      phone: '+639123456789',
      specialties: this.mapServicesToSpecialties(apiBarber.services),
      experience: '5 years',
      rating: 4.5,
      totalBookings: 0,
      avatar: this.generateAvatar(apiBarber.full_name),
      status: apiBarber.is_active ? 'active' : 'inactive',
      schedule: this.getDefaultSchedule(),
      joinedDate: new Date().toISOString().split('T')[0],
      monthlyRevenue: 0,
      bio: `Professional barber with expertise in various styling techniques.`
    }
  }

  // Transform UI data to API format
  transformBarberToAPI(uiBarber, isPartial = false) {
    const apiData = {}
    
    if (!isPartial || uiBarber.user !== undefined) {
      apiData.user = uiBarber.user
    }
    if (!isPartial || uiBarber.full_name !== undefined) {
      apiData.full_name = uiBarber.full_name || uiBarber.name
    }
    if (!isPartial || uiBarber.is_active !== undefined) {
      apiData.is_active = uiBarber.is_active !== undefined ? uiBarber.is_active : (uiBarber.status === 'active')
    }
    if (!isPartial || uiBarber.services !== undefined) {
      apiData.services = uiBarber.services || []
    }

    return apiData
  }

  // Helper methods
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

  generateAvatar(fullName) {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=F68B24&color=fff&size=150`
  }

  getDefaultSchedule() {
    return {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "18:00", available: true },
      saturday: { start: "08:00", end: "16:00", available: true },
      sunday: { start: "", end: "", available: false }
    }
  }

  getStatusConfig(status) {
    const statusMap = {
      'active': { 
        label: 'Active', 
        color: 'green',
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200'
      },
      'on_leave': { 
        label: 'On Leave', 
        color: 'yellow',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      },
      'inactive': { 
        label: 'Inactive', 
        color: 'red',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      }
    }
    return statusMap[status] || statusMap['inactive']
  }

  formatRevenue(amount) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  getWorkingDays(schedule) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return days.filter(day => schedule[day]?.available).length
  }

  getTotalWorkingHours(schedule) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    return days.reduce((total, day) => {
      if (schedule[day]?.available && schedule[day]?.start && schedule[day]?.end) {
        const start = new Date(`1970-01-01T${schedule[day].start}:00`)
        const end = new Date(`1970-01-01T${schedule[day].end}:00`)
        const hours = (end - start) / (1000 * 60 * 60)
        return total + hours
      }
      return total
    }, 0)
  }

  // Validation helpers
  validateBarberData(barberData) {
    const errors = []
    
    if (!barberData.user) {
      errors.push('User is required')
    }
    if (!barberData.full_name || barberData.full_name.trim().length === 0) {
      errors.push('Full name is required')
    }
    
    return errors
  }
}

export default new BarbersService()