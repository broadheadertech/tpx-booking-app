import apiService from '../api.js'

class UsersService {
  async getAllUsers() {
    // Note: This endpoint might not exist in the API yet, but we'll structure it
    try {
      return await apiService.get('/users/')
    } catch (error) {
      console.warn('Users endpoint not available, returning empty array')
      return []
    }
  }

  async getUser(id) {
    try {
      return await apiService.get(`/users/${id}/`)
    } catch (error) {
      console.error('Error fetching user:', error)
      throw error
    }
  }

  async createUser(userData) {
    try {
      return await apiService.post('/users/', userData)
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  async updateUser(id, userData) {
    try {
      return await apiService.put(`/users/${id}/`, userData)
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  async deleteUser(id) {
    try {
      return await apiService.delete(`/users/${id}/`)
    } catch (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  async getUserStats(userId) {
    // This would aggregate data from bookings, loyalty points, etc.
    try {
      const bookings = await apiService.get(`/bookings/?user=${userId}`)
      const loyaltyPoints = await apiService.get(`/points/?user=${userId}`)
      
      return {
        totalBookings: bookings.length,
        loyaltyPoints: loyaltyPoints.reduce((sum, lp) => sum + lp.total_points, 0),
        lastBooking: bookings.length > 0 ? bookings[bookings.length - 1] : null
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return {
        totalBookings: 0,
        loyaltyPoints: 0,
        lastBooking: null
      }
    }
  }

  formatUserInfo(user) {
    return {
      ...user,
      fullName: user.nickname || user.username,
      displayName: user.nickname || user.username,
      formattedPhone: user.mobile_number,
      joinDate: new Date(user.date_joined || Date.now()).toLocaleDateString()
    }
  }
}

export default new UsersService()