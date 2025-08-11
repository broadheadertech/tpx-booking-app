import apiService from '../api.js'

class ServicesService {
  async getAllServices() {
    console.log('🚨 ServicesService: getAllServices() called - THIS SHOULD NOT HAPPEN FOR BOOKINGS TAB!')
    console.trace('ServicesService: Call stack trace')
    return await apiService.get('/services/')
  }

  async getService(id) {
    return await apiService.get(`/services/${id}/`)
  }

  async createService(serviceData) {
    return await apiService.post('/services/', serviceData)
  }

  async updateService(id, serviceData) {
    return await apiService.put(`/services/${id}/`, serviceData)
  }

  async patchService(id, partialData) {
    return await apiService.patch(`/services/${id}/`, partialData)
  }

  async deleteService(id) {
    return await apiService.delete(`/services/${id}/`)
  }

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
}

export default new ServicesService()