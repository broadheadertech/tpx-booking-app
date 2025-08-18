import apiService from '../api.js'
import authService from '../auth.js'
import { apiCache, shortCache } from '../../utils/cache.js'

class CustomerVoucherService {
  constructor() {
    this.pendingRequests = new Map()
  }
  async validateVoucherCode(code) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Validate input
      const validationErrors = this.validateVoucherInput(code)
      if (validationErrors.length > 0) {
        return {
          success: false,
          error: validationErrors.join(', ')
        }
      }

      const normalizedCode = code.toUpperCase().trim()
      const cacheKey = `voucher-validation-${normalizedCode}`
      
      // Check cache first (30 seconds for validation)
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get vouchers with caching
      const vouchers = await this._getVouchersForValidation()
      const voucher = vouchers.find(v => v.code === normalizedCode)
      
      if (!voucher) {
        const result = {
          success: false,
          error: 'Invalid voucher code'
        }
        // Cache negative results for shorter time
        shortCache.set(cacheKey, result, 10 * 1000) // 10 seconds
        return result
      }

      // Validate voucher with comprehensive checks
      const validationResult = this.performVoucherValidation(voucher, userId)
      
      // Cache the result
      shortCache.set(cacheKey, validationResult)
      
      return validationResult
    } catch (error) {
      console.error('Error validating voucher code:', error)
      return {
        success: false,
        error: 'Failed to validate voucher. Please try again.'
      }
    }
  }

  async _getVouchersForValidation() {
    const cacheKey = 'vouchers-for-validation'
    
    // Check cache first (2 minutes for voucher list)
    const cached = apiCache.get(cacheKey)
    if (cached) {
      return cached
    }

    // Deduplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)
    }

    const request = this._fetchVouchersForValidation(cacheKey)
    this.pendingRequests.set(cacheKey, request)
    
    return request
  }

  async _fetchVouchersForValidation(cacheKey) {
    try {
      const response = await apiService.get('/vouchers/', { timeout: 30000 })
      const vouchers = Array.isArray(response) ? response : response.results || []
      
      // Cache for 2 minutes
      apiCache.set(cacheKey, vouchers, 2 * 60 * 1000)
      this.pendingRequests.delete(cacheKey)
      
      return vouchers
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  performVoucherValidation(voucher, userId) {
    const now = new Date()
    const expiresAt = new Date(voucher.expires_at)
    
    // Check if voucher is redeemed
    if (voucher.redeemed) {
      return {
        success: false,
        error: 'This voucher has already been redeemed',
        errorType: 'already_redeemed'
      }
    }
    
    // Check if voucher is expired
    if (expiresAt < now) {
      return {
        success: false,
        error: 'This voucher has expired',
        errorType: 'expired',
        expiryDate: this.formatVoucherExpiry(voucher.expires_at)
      }
    }
    
    // Check usage limit
    if (voucher.used_count >= voucher.max_uses) {
      return {
        success: false,
        error: 'This voucher has reached its usage limit',
        errorType: 'usage_limit_reached'
      }
    }

    // Check user eligibility if applicable
    if (voucher.user_specific && voucher.user !== userId) {
      return {
        success: false,
        error: 'This voucher is not available for your account',
        errorType: 'user_not_eligible'
      }
    }

    return {
      success: true,
      data: this.transformVoucherData(voucher),
      message: 'Voucher is valid and ready to use'
    }
  }

  async redeemVoucher(code, username = null, value = null) {
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    try {
      // Get current user info
      const userId = authService.getUserId()
      const userRole = authService.getUserRole()
      const isStaff = authService.getIsStaff()
      
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      // Validate voucher first
      const validation = await this.validateVoucherCode(code)
      if (!validation.success) {
        return validation
      }

      // Prepare request body with required parameters
      const requestBody = this.prepareRedemptionData(code, username, value)

      while (attempt < maxAttempts) {
        attempt++
        try {
          const response = await apiService.post('/vouchers/redeem/', requestBody, { timeout: 30000 })
          
          // Clear relevant caches after successful redemption
          this.clearUserCache(userId)
          this.clearVoucherCaches()
          
          return {
            success: true,
            data: this.transformVoucherRedemptionData(response),
            message: 'Voucher redeemed successfully'
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
              error: error?.message || 'Failed to redeem voucher'
            }
          }
          
          // Exponential backoff before retry
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
        }
      }

      return {
        success: false,
        error: lastError?.message || 'Voucher redemption failed after multiple attempts'
      }
    } catch (error) {
      console.error('Error redeeming voucher:', error)
      return {
        success: false,
        error: 'Failed to redeem voucher. Please try again.'
      }
    }
  }

  prepareRedemptionData(code, username, value) {
    const requestBody = {
      code: code.toUpperCase().trim()
    }

    // Always include username parameter
    if (username) {
      // Use provided username (for staff redemption or when explicitly passed)
      requestBody.username = username
    } else {
      // Get current user's username from localStorage
      const currentUsername = authService.getUsername() || localStorage.getItem('username')
      if (currentUsername) {
        requestBody.username = currentUsername
      }
    }

    // Add value if provided (for validation)
    if (value) {
      requestBody.value = value
    }

    return requestBody
  }

  async getUserVouchers() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `user-vouchers-${userId}`
      
      // Check cache first (1 minute for user vouchers)
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Deduplicate requests
      if (this.pendingRequests.has(cacheKey)) {
        return this.pendingRequests.get(cacheKey)
      }

      const request = this._fetchUserVouchers(userId, cacheKey)
      this.pendingRequests.set(cacheKey, request)
      
      return request
    } catch (error) {
      console.error('Error fetching user vouchers:', error)
      throw new Error('Failed to load your vouchers. Please try again.')
    }
  }

  async _fetchUserVouchers(userId, cacheKey) {
    try {
      // Use the new user-specific voucher endpoint
      const response = await apiService.get('/vouchers/my/', { timeout: 30000 })
      
      // The API returns an array of voucher usage data
      const vouchers = Array.isArray(response) ? response : []
      const transformedVouchers = vouchers.map(voucher => this.transformVoucherData(voucher))
      
      // Cache for 1 minute
      shortCache.set(cacheKey, transformedVouchers, 60 * 1000)
      this.pendingRequests.delete(cacheKey)
      
      return transformedVouchers
    } catch (error) {
      this.pendingRequests.delete(cacheKey)
      throw error
    }
  }

  // Keep getAllVouchers for backward compatibility but add security check
  async getAllVouchers() {
    console.warn('getAllVouchers is deprecated. Use getUserVouchers() instead for security.')
    return this.getUserVouchers()
  }

  async getVoucherHistory() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `voucher-history-${userId}`
      
      // Check cache first (2 minutes for history)
      const cached = apiCache.get(cacheKey)
      if (cached) {
        return cached
      }

      const response = await apiService.get('/vouchers/history/', { timeout: 30000 })
      
      let history = []
      if (Array.isArray(response)) {
        history = response
      } else if (response.results && Array.isArray(response.results)) {
        history = response.results
      }
      
      const transformedHistory = history.map(item => this.transformVoucherHistoryData(item))
      
      // Cache for 2 minutes
      apiCache.set(cacheKey, transformedHistory, 2 * 60 * 1000)
      
      return transformedHistory
    } catch (error) {
      console.error('Error fetching voucher history:', error)
      throw new Error('Failed to load voucher history. Please try again.')
    }
  }

  async getAvailableVouchers() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const cacheKey = `available-vouchers-${userId}`
      
      // Check cache first (30 seconds for available vouchers)
      const cached = shortCache.get(cacheKey)
      if (cached) {
        return cached
      }

      // Get user-specific vouchers first
      const userVouchers = await this.getUserVouchers()
      const voucherList = Array.isArray(userVouchers) ? userVouchers : userVouchers.results || []
      
      // Filter vouchers that are available for the current user
      const now = new Date()
      const availableVouchers = voucherList.filter(voucher => {
        const expiresAt = new Date(voucher.expires_at)
        return !voucher.redeemed && 
               voucher.used_count < voucher.max_uses && 
               expiresAt > now &&
               voucher.user === userId // Extra security check
      })
      
      // Cache for 30 seconds
      shortCache.set(cacheKey, availableVouchers)
      
      return availableVouchers
    } catch (error) {
      console.error('Error fetching available vouchers:', error)
      throw new Error('Failed to load available vouchers. Please try again.')
    }
  }

  // Get voucher statistics
  async getVoucherStats() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      const [userVouchers, availableVouchers] = await Promise.allSettled([
        this.getUserVouchers(),
        this.getAvailableVouchers()
      ])

      const vouchers = userVouchers.status === 'fulfilled' ? userVouchers.value : []
      const available = availableVouchers.status === 'fulfilled' ? availableVouchers.value : []
      
      const stats = {
        total: vouchers.length,
        available: available.length,
        redeemed: vouchers.filter(v => v.redeemed).length,
        expired: vouchers.filter(v => this.isVoucherExpired(v.expires_at)).length,
        totalValue: vouchers.reduce((sum, v) => sum + (v.value || 0), 0),
        availableValue: available.reduce((sum, v) => sum + (v.value || 0), 0)
      }

      return {
        ...stats,
        displayTotalValue: this.formatVoucherValue(stats.totalValue),
        displayAvailableValue: this.formatVoucherValue(stats.availableValue)
      }
    } catch (error) {
      console.error('Error fetching voucher stats:', error)
      return {
        total: 0,
        available: 0,
        redeemed: 0,
        expired: 0,
        totalValue: 0,
        availableValue: 0,
        displayTotalValue: '₱0.00',
        displayAvailableValue: '₱0.00'
      }
    }
  }

  // Data transformation methods
  transformVoucherData(apiVoucher) {
    return {
      id: apiVoucher.id,
      code: apiVoucher.code,
      value: apiVoucher.value,
      description: apiVoucher.description || '',
      expires_at: apiVoucher.expires_at,
      redeemed: apiVoucher.redeemed || false,
      used_count: apiVoucher.used_count || 0,
      max_uses: apiVoucher.max_uses || 1,
      user: apiVoucher.user,
      user_specific: apiVoucher.user_specific || false,
      created_at: apiVoucher.created_at,
      updated_at: apiVoucher.updated_at,
      // UI-friendly formatted data
      displayValue: this.formatVoucherValue(apiVoucher.value),
      displayExpiry: this.formatVoucherExpiry(apiVoucher.expires_at),
      isExpired: this.isVoucherExpired(apiVoucher.expires_at),
      isAvailable: this.isVoucherAvailable(apiVoucher),
      usageText: `${apiVoucher.used_count || 0}/${apiVoucher.max_uses || 1}`,
      daysUntilExpiry: this.getDaysUntilExpiry(apiVoucher.expires_at),
      status: this.getVoucherStatus(apiVoucher)
    }
  }

  transformVoucherRedemptionData(apiRedemption) {
    return {
      id: apiRedemption.id,
      voucher_code: apiRedemption.voucher_code || apiRedemption.code,
      value: apiRedemption.value,
      redeemed_at: apiRedemption.redeemed_at || apiRedemption.created_at,
      user: apiRedemption.user,
      // UI-friendly formatted data
      displayValue: this.formatVoucherValue(apiRedemption.value),
      displayDate: this.formatDate(apiRedemption.redeemed_at || apiRedemption.created_at),
      displayTime: this.formatTime(apiRedemption.redeemed_at || apiRedemption.created_at)
    }
  }

  transformVoucherHistoryData(apiHistory) {
    return {
      id: apiHistory.id,
      voucher_code: apiHistory.voucher_code || apiHistory.code,
      action: apiHistory.action || 'redeemed',
      value: apiHistory.value,
      created_at: apiHistory.created_at,
      user: apiHistory.user,
      // UI-friendly formatted data
      displayValue: this.formatVoucherValue(apiHistory.value),
      displayDate: this.formatDate(apiHistory.created_at),
      displayTime: this.formatTime(apiHistory.created_at),
      actionText: this.getActionText(apiHistory.action)
    }
  }

  // Validation methods
  validateVoucherInput(code) {
    const errors = []
    
    if (!code || typeof code !== 'string') {
      errors.push('Voucher code is required')
    } else {
      const trimmedCode = code.trim()
      if (trimmedCode.length < 3) {
        errors.push('Voucher code must be at least 3 characters long')
      }
      if (trimmedCode.length > 20) {
        errors.push('Voucher code must be less than 20 characters long')
      }
      if (!/^[A-Za-z0-9]+$/.test(trimmedCode)) {
        errors.push('Voucher code can only contain letters and numbers')
      }
    }
    
    return errors
  }

  // Helper methods
  formatVoucherValue(value) {
    return `₱${parseFloat(value || 0).toFixed(2)}`
  }

  isVoucherExpired(expiresAt) {
    return new Date(expiresAt) < new Date()
  }

  formatVoucherExpiry(expiresAt) {
    return new Date(expiresAt).toLocaleDateString('en-PH')
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

  isVoucherAvailable(voucher) {
    const now = new Date()
    const expiresAt = new Date(voucher.expires_at)
    return !voucher.redeemed && 
           voucher.used_count < voucher.max_uses && 
           expiresAt > now
  }

  getDaysUntilExpiry(expiresAt) {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffTime = expiry - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return Math.max(0, diffDays)
  }

  getVoucherStatus(voucher) {
    if (voucher.redeemed) return 'redeemed'
    if (this.isVoucherExpired(voucher.expires_at)) return 'expired'
    if (voucher.used_count >= voucher.max_uses) return 'used_up'
    return 'available'
  }

  getActionText(action) {
    const actionMap = {
      'redeemed': 'Redeemed',
      'created': 'Created',
      'expired': 'Expired',
      'cancelled': 'Cancelled'
    }
    return actionMap[action] || 'Unknown'
  }

  // Cache management
  clearUserCache(userId = null) {
    const userIdToUse = userId || authService.getUserId()
    if (userIdToUse) {
      shortCache.delete(`user-vouchers-${userIdToUse}`)
      shortCache.delete(`available-vouchers-${userIdToUse}`)
      apiCache.delete(`voucher-history-${userIdToUse}`)
    }
  }

  clearVoucherCaches() {
    // Clear validation caches
    const cacheKeys = Array.from(shortCache.cache.keys())
    cacheKeys.forEach(key => {
      if (key.startsWith('voucher-validation-')) {
        shortCache.delete(key)
      }
    })
    
    // Clear voucher list cache
    apiCache.delete('vouchers-for-validation')
  }

  clearAllCache() {
    apiCache.clear()
    shortCache.clear()
    this.pendingRequests.clear()
  }
}

export default new CustomerVoucherService()