import apiService from '../api.js'

class LoyaltyService {
  async getAllLoyaltyPoints() {
    return await apiService.get('/points/')
  }

  async getLoyaltyPoints(id) {
    return await apiService.get(`/points/${id}/`)
  }

  async createLoyaltyPoints(pointsData) {
    return await apiService.post('/points/', pointsData)
  }

  async updateLoyaltyPoints(id, pointsData) {
    return await apiService.put(`/points/${id}/`, pointsData)
  }

  async patchLoyaltyPoints(id, partialData) {
    return await apiService.patch(`/points/${id}/`, partialData)
  }

  async deleteLoyaltyPoints(id) {
    return await apiService.delete(`/points/${id}/`)
  }

  async getUserLoyaltyPoints(userId) {
    const allPoints = await this.getAllLoyaltyPoints()
    return allPoints.find(points => points.user === userId) || { total_points: 0 }
  }

  async addPointsToUser(userId, points) {
    try {
      const existingPoints = await this.getUserLoyaltyPoints(userId)
      
      if (existingPoints.id) {
        const newTotal = existingPoints.total_points + points
        return await this.patchLoyaltyPoints(existingPoints.id, { total_points: newTotal })
      } else {
        return await this.createLoyaltyPoints({ user: userId, total_points: points })
      }
    } catch (error) {
      console.error('Error adding points:', error)
      throw error
    }
  }

  async deductPointsFromUser(userId, points) {
    try {
      const existingPoints = await this.getUserLoyaltyPoints(userId)
      
      if (existingPoints.id && existingPoints.total_points >= points) {
        const newTotal = existingPoints.total_points - points
        return await this.patchLoyaltyPoints(existingPoints.id, { total_points: newTotal })
      } else {
        throw new Error('Insufficient points')
      }
    } catch (error) {
      console.error('Error deducting points:', error)
      throw error
    }
  }

  calculatePointsFromAmount(amount, pointsPerPeso = 1) {
    return Math.floor(parseFloat(amount) * pointsPerPeso)
  }

  async getTopCustomersByPoints(limit = 10) {
    const allPoints = await this.getAllLoyaltyPoints()
    return allPoints
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit)
  }

  async getTotalPointsDistributed() {
    const allPoints = await this.getAllLoyaltyPoints()
    return allPoints.reduce((total, points) => total + points.total_points, 0)
  }

  formatPoints(points) {
    return points.toLocaleString()
  }
}

export default new LoyaltyService()