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

  async confirmVoucherRedemption(code) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated'
        }
      }

      const requestBody = {
        code: code.toUpperCase().trim()
      }

      const response = await apiService.post('/vouchers/confirm-voucher-redeem/', requestBody, { timeout: 30000 })
      
      // Clear relevant caches after successful confirmation
      this.clearUserCache(userId)
      this.clearVoucherCaches()
      
      return {
        success: true,
        data: {
          value: response.value,
          message: response.success || 'Voucher redeemed successfully'
        },
        message: 'Voucher redeemed successfully'
      }
    } catch (error) {
      console.error('Error confirming voucher redemption:', error)
      
      // Handle API validation errors
      if (error.response?.data) {
        const errorData = error.response.data
        if (typeof errorData === 'string') {
          return {
            success: false,
            error: errorData
          }
        }
        if (typeof errorData === 'object' && errorData.error) {
          return {
            success: false,
            error: errorData.error
          }
        }
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
        error: error?.message || 'Failed to confirm voucher redemption. Please try again.'
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
      
      const result = await request
      return result || [] // Ensure we always return an array
    } catch (error) {
      console.error('Error fetching user vouchers:', error)
      
      // For 500 errors, return empty array instead of throwing
      if (error.status === 500) {
        console.warn('Voucher service returned 500, returning empty voucher list')
        return []
      }
      
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
      
      // If the /vouchers/my/ endpoint is not available, try alternative approaches
      if (error.status === 500 || error.status === 404 || error.status === 405) {
        console.warn('Vouchers /my/ endpoint failed with status:', error.status)
        console.warn('Attempting fallback to history endpoint')
        
        try {
          const historyResponse = await apiService.get('/vouchers/history/', { timeout: 30000 })
          const history = Array.isArray(historyResponse) ? historyResponse : []
          
          // Transform history data to voucher format
          const transformedVouchers = history.map(item => this.transformVoucherHistoryToVoucher(item))
          
          // Cache for 1 minute
          shortCache.set(cacheKey, transformedVouchers, 60 * 1000)
          
          console.info(`Fallback successful: loaded ${transformedVouchers.length} vouchers from history`)
          return transformedVouchers
        } catch (fallbackError) {
          console.error('History endpoint also failed, trying basic vouchers endpoint')
          
          try {
            // Last resort: try to get all vouchers and filter client-side
            const allVouchersResponse = await apiService.get('/vouchers/', { timeout: 30000 })
            const allVouchers = Array.isArray(allVouchersResponse) ? allVouchersResponse : allVouchersResponse.results || []
            
            // For now, return empty array since we can't filter by user without more info
            console.warn('Basic vouchers endpoint worked but user filtering not implemented')
            return []
          } catch (basicError) {
            console.error('All voucher endpoints failed:', { 
              my: { status: error.status, message: error.message },
              history: { status: fallbackError.status, message: fallbackError.message },
              basic: { status: basicError.status, message: basicError.message }
            })
            // Return empty array to avoid breaking the UI
            console.warn('Returning empty voucher array due to all API failures')
            return []
          }
        }
      }
      
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
    // Handle the actual API response structure: {code, value, status, assigned_at, redeemed_at, expired}
    return {
      id: apiVoucher.id || apiVoucher.code, // Use code as ID if id not available
      code: apiVoucher.code,
      value: apiVoucher.value,
      description: apiVoucher.description || 'Voucher',
      expires_at: apiVoucher.expires_at || null,
      expired: apiVoucher.expired || false,
      status: apiVoucher.status, // Use actual status from API: "assigned" or "redeemed"
      redeemed: apiVoucher.status === 'redeemed',
      assigned: apiVoucher.status === 'assigned',
      used_count: apiVoucher.status === 'redeemed' ? 1 : 0,
      max_uses: 1,
      user: apiVoucher.user,
      user_specific: true,
      created_at: apiVoucher.created_at || apiVoucher.assigned_at,
      updated_at: apiVoucher.updated_at || apiVoucher.redeemed_at || apiVoucher.assigned_at,
      used_at: apiVoucher.redeemed_at || apiVoucher.assigned_at,
      assigned_at: apiVoucher.assigned_at,
      redeemed_at: apiVoucher.redeemed_at,
      // UI-friendly formatted data
      displayValue: this.formatVoucherValue(apiVoucher.value),
      displayExpiry: apiVoucher.expires_at ? this.formatVoucherExpiry(apiVoucher.expires_at) : 'No expiry',
      isExpired: apiVoucher.expired || false,
      isAvailable: false, // Vouchers from /my/ are already assigned/redeemed
      usageText: apiVoucher.status === 'redeemed' ? '1/1' : '0/1',
      daysUntilExpiry: apiVoucher.expires_at ? this.getDaysUntilExpiry(apiVoucher.expires_at) : 0
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

  transformVoucherHistoryToVoucher(historyItem) {
    // Transform history item to voucher format for fallback compatibility
    const voucher = historyItem.voucher || {}
    return {
      id: historyItem.id,
      code: historyItem.voucher?.code || voucher.code || 'UNKNOWN',
      value: historyItem.voucher?.value || voucher.value || '0.00',
      description: '',
      expires_at: historyItem.voucher?.expires_at || voucher.expires_at || null,
      redeemed: historyItem.status === 'redeemed',
      used_count: historyItem.status === 'redeemed' ? 1 : 0,
      max_uses: 1,
      user: historyItem.user,
      user_specific: true,
      created_at: historyItem.assigned_at || historyItem.created_at,
      updated_at: historyItem.redeemed_at || historyItem.updated_at,
      used_at: historyItem.redeemed_at || (historyItem.status === 'redeemed' ? historyItem.assigned_at : null),
      expired: historyItem.voucher?.expires_at ? new Date(historyItem.voucher.expires_at) < new Date() : false,
      // UI-friendly formatted data
      displayValue: this.formatVoucherValue(historyItem.voucher?.value || voucher.value || '0.00'),
      displayExpiry: this.formatVoucherExpiry(historyItem.voucher?.expires_at || voucher.expires_at || new Date()),
      isExpired: historyItem.voucher?.expires_at ? this.isVoucherExpired(historyItem.voucher.expires_at) : false,
      isAvailable: false, // History items are already used
      usageText: historyItem.status === 'redeemed' ? '1/1' : '0/1',
      daysUntilExpiry: historyItem.voucher?.expires_at ? this.getDaysUntilExpiry(historyItem.voucher.expires_at) : 0,
      status: historyItem.status === 'redeemed' ? 'redeemed' : 'assigned'
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

  // Diagnostic method to test voucher endpoints
  async testVoucherEndpoints() {
    const endpoints = [
      '/vouchers/my/',
      '/vouchers/history/',
      '/vouchers/',
    ]
    
    const results = {}
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Testing endpoint: ${endpoint}`)
        const response = await apiService.get(endpoint, { timeout: 10000 })
        results[endpoint] = {
          status: 'success',
          dataType: Array.isArray(response) ? 'array' : typeof response,
          itemCount: Array.isArray(response) ? response.length : 'N/A'
        }
        console.log(`✅ ${endpoint} - Success:`, results[endpoint])
      } catch (error) {
        results[endpoint] = {
          status: 'error',
          errorStatus: error.status,
          errorMessage: error.message
        }
        console.log(`❌ ${endpoint} - Error:`, results[endpoint])
      }
    }
    
    return results
  }
}

export default new CustomerVoucherService()