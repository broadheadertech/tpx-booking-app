import apiService from '../api.js'
import authService from '../auth.js'

class LoyaltyService {
  async getUserPoints() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Use user-specific endpoint or add user filter parameter
      const response = await apiService.get(`/points/?user=${userId}`)
      
      // Handle different response formats
      if (Array.isArray(response)) {
        const userPoints = response.find(point => point.user === userId)
        return userPoints || { total_points: 0, last_updated: null }
      }
      
      // Handle paginated response
      if (response.results && Array.isArray(response.results)) {
        const userPoints = response.results.find(point => point.user === userId)
        return userPoints || { total_points: 0, last_updated: null }
      }
      
      // Handle direct user points response
      if (response.user === userId) {
        return response
      }
      
      return { total_points: 0, last_updated: null }
    } catch (error) {
      console.error('Error fetching user points:', error)
      throw error
    }
  }

  // This method should only be used by staff/admin - not for customer use
  async getAllPoints() {
    try {
      const userRole = authService.getUserRole()
      const isStaff = authService.getIsStaff()
      
      if (userRole !== 'staff' && userRole !== 'administrator' && !isStaff) {
        throw new Error('Unauthorized: Only staff can access all points data')
      }
      
      const response = await apiService.get('/points/')
      return response
    } catch (error) {
      console.error('Error fetching all points:', error)
      throw error
    }
  }

  formatPoints(points) {
    return points.toLocaleString()
  }
}

export default new LoyaltyService()