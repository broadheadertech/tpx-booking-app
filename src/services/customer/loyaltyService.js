import apiService from '../api.js'
import authService from '../auth.js'
import { apiCache, shortCache } from '../../utils/cache.js'

class LoyaltyService {
  constructor() {
    this.pendingRequests = new Map()
  }
  async getUserPoints() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `user-points-${userId}`
      
      // Check cache first (30 seconds for points data)
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate identical requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchUserPoints(userId, cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching user points:', error)
      throw new Error('Failed to load your loyalty points. Please try again.')
    }
  }

  async _fetchUserPoints(userId, cacheKey) {
    try {
      // Use user-specific endpoint or add user filter parameter
      const response = await apiService.get(`/points/?user=${userId}`, { timeout: 30000 })
      
      let userPoints = null
      
      // Handle different response formats
      if (Array.isArray(response)) {
        userPoints = response.find(point => point.user === userId)
      } else if (response.results && Array.isArray(response.results)) {
        // Handle paginated response
        userPoints = response.results.find(point => point.user === userId)
      } else if (response.user === userId) {
        // Handle direct user points response
        userPoints = response
      }
      
      // Transform and provide fallback data
      const transformedPoints = this.transformPointsData(userPoints || {
        user: userId,
        total_points: 0,
        last_updated: null
      })
      
      // Cache for 30 seconds
      shortCache.set(cacheKey, transformedPoints)
      this.pendingRequests.delete(cacheKey)
      
      return transformedPoints
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
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
      
      const cacheKey = 'all-points'
      
      // Check cache first (2 minutes for all points data)
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchAllPoints(cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching all points:', error)
      throw new Error('Failed to load loyalty points data. Please try again.')
    }
  }

  async _fetchAllPoints(cacheKey) {
    try {
      const response = await apiService.get('/points/', { timeout: 30000 })
      
      // Handle different response formats and transform data
      let allPoints = []
      if (Array.isArray(response)) {
        allPoints = response
      } else if (response.results && Array.isArray(response.results)) {
        allPoints = response.results
      }
      
      const transformedPoints = allPoints.map(points => this.transformPointsData(points))
      
      // Cache for 2 minutes
      apiCache.set(cacheKey, transformedPoints, 2 * 60 * 1000)
      this.pendingRequests.delete(cacheKey)
      
      return transformedPoints
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  // Points transaction methods
  async getPointsHistory(userId = null) {
    try {
      const userIdToUse = userId || authService.getUserId()
      if (!userIdToUse) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `points-history-${userIdToUse}`
      
      // Check cache first (1 minute for history)
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const response = await apiService.get(`/points/history/?user=${userIdToUse}`, { timeout: 30000 })
      
      let history = []
      if (Array.isArray(response)) {
        history = response
      } else if (response.results && Array.isArray(response.results)) {
        history = response.results
      }
      
      const transformedHistory = history.map(transaction => this.transformTransactionData(transaction))
      
      // Cache for 1 minute
      shortCache.set(cacheKey, transformedHistory, 60 * 1000)
      
      return transformedHistory
    } catch (error) {
      console.error('Error fetching points history:', error)
      // Return empty array instead of throwing for better UX
      return []
    }
  }

  async addPoints(userId, points, description = 'Points earned') {
    try {
      const response = await apiService.post('/points/add/', {
        user: userId,
        points,
        description
      }, { timeout: 30000 })
      
      // Clear relevant caches after adding points
      this.clearUserCache(userId)
      
      return {
        success: true,
        data: this.transformTransactionData(response)
      }
    } catch (error) {
      console.error('Error adding points:', error)
      return {
        success: false,
        error: error?.message || 'Failed to add points'
      }
    }
  }

  async redeemPoints(userId, points, description = 'Points redeemed') {
    try {
      const response = await apiService.post('/points/redeem/', {
        user: userId,
        points,
        description
      }, { timeout: 30000 })
      
      // Clear relevant caches after redeeming points
      this.clearUserCache(userId)
      
      return {
        success: true,
        data: this.transformTransactionData(response)
      }
    } catch (error) {
      console.error('Error redeeming points:', error)
      return {
        success: false,
        error: error?.message || 'Failed to redeem points'
      }
    }
  }

  // Data transformation methods
  transformPointsData(apiPoints) {
    return {
      id: apiPoints.id,
      user: apiPoints.user,
      total_points: apiPoints.total_points || 0,
      last_updated: apiPoints.last_updated,
      created_at: apiPoints.created_at,
      updated_at: apiPoints.updated_at,
      // UI-friendly formatted data
      displayPoints: this.formatPoints(apiPoints.total_points || 0),
      lastUpdatedFormatted: this.formatDate(apiPoints.last_updated),
      pointsLevel: this.getPointsLevel(apiPoints.total_points || 0),
      nextLevelPoints: this.getNextLevelPoints(apiPoints.total_points || 0)
    }
  }

  transformTransactionData(apiTransaction) {
    return {
      id: apiTransaction.id,
      user: apiTransaction.user,
      points: apiTransaction.points,
      description: apiTransaction.description || 'Points transaction',
      transaction_type: apiTransaction.transaction_type || 'earned',
      created_at: apiTransaction.created_at,
      // UI-friendly formatted data
      displayPoints: this.formatPoints(Math.abs(apiTransaction.points)),
      isEarned: apiTransaction.points > 0,
      isRedeemed: apiTransaction.points < 0,
      dateFormatted: this.formatDate(apiTransaction.created_at),
      timeFormatted: this.formatTime(apiTransaction.created_at)
    }
  }

  // Helper methods
  formatPoints(points) {
    return points.toLocaleString()
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-PH')
  }

  formatTime(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  getPointsLevel(points) {
    if (points >= 10000) return 'Platinum'
    if (points >= 5000) return 'Gold'
    if (points >= 1000) return 'Silver'
    return 'Bronze'
  }

  getNextLevelPoints(points) {
    if (points >= 10000) return 0 // Already at max level
    if (points >= 5000) return 10000 - points
    if (points >= 1000) return 5000 - points
    return 1000 - points
  }

  // Cache management
  clearUserCache(userId = null) {
    const userIdToUse = userId || authService.getUserId()
    if (userIdToUse) {
      shortCache.delete(`user-points-${userIdToUse}`)
      shortCache.delete(`points-history-${userIdToUse}`)
    }
  }

  clearAllCache() {
    apiCache.clear()
    shortCache.clear()
    this.pendingRequests.clear()
  }
}

export default new LoyaltyService()