import apiService from './api.js'
import { shortCache } from '../utils/cache.js'

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER_ROLE: 'user_role',
  IS_STAFF: 'is_staff',
  USER_ID: 'user_id',
  USERNAME: 'username'
}

class AuthService {
  constructor() {
    this.refreshPromise = null
    this.userDataCache = null
    this.lastUserDataFetch = null
  }
  async login(username, password) {
    const maxAttempts = 3
    let attempt = 0
    let lastError = null

    // Validate input
    const validationErrors = this.validateLoginInput(username, password)
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(', ')
      }
    }

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/login/', {
          username: username.trim(),
          password
        }, { timeout: 15000 })
        
        if (response?.access && response?.refresh) {
          // Store tokens and user info
          this.setTokens(response.access, response.refresh)
          this.setUserInfo(response.user_id, response.role, response.is_staff)
          
          // Store the username that was used for login
          localStorage.setItem(TOKEN_KEYS.USERNAME, username.trim())
          // Also store as 'username' for compatibility
          localStorage.setItem('username', username.trim())
          
          // Cache user data for quick access
          this.cacheUserData({
            id: response.user_id,
            username: username.trim(),
            role: response.role,
            is_staff: response.is_staff,
            ...response.user_data
          })
          
          return {
            success: true,
            data: this.transformUserData(response),
            message: 'Login successful'
          }
        }
        
        return {
          success: false,
          error: 'Invalid response format from server'
        }
      } catch (error) {
        lastError = error
        const retriable = error?.code === 'ECONNABORTED' || 
                         error?.code === 'NETWORK_ERROR' ||
                         error?.status >= 500
        
        if (!retriable || attempt >= maxAttempts) {
          // Handle specific error types
          if (error?.status === 401 || error?.status === 403) {
            return {
              success: false,
              error: 'Invalid username or password'
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
            error: error?.message || 'Login failed'
          }
        }
        
        // Exponential backoff before retry
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Login failed after multiple attempts'
    }
  }

  async register(userData) {
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    // Validate registration data
    const validationErrors = this.validateRegistrationData(userData)
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: validationErrors.join(', ')
      }
    }

    // Transform and sanitize user data
    const sanitizedData = this.sanitizeRegistrationData(userData)

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/register/', sanitizedData, { timeout: 15000 })
        
        return {
          success: true,
          data: this.transformUserData(response),
          message: 'Registration successful'
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
            error: error?.message || 'Registration failed'
          }
        }
        
        // Exponential backoff before retry
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Registration failed after multiple attempts'
    }
  }

  logout() {
    // Clear all stored tokens and user data
    localStorage.removeItem(TOKEN_KEYS.ACCESS)
    localStorage.removeItem(TOKEN_KEYS.REFRESH)
    localStorage.removeItem(TOKEN_KEYS.USER_ROLE)
    localStorage.removeItem(TOKEN_KEYS.IS_STAFF)
    localStorage.removeItem(TOKEN_KEYS.USER_ID)
    localStorage.removeItem(TOKEN_KEYS.USERNAME)
    // Also remove the compatibility username key
    localStorage.removeItem('username')
    
    // Clear cached user data
    this.clearUserDataCache()
    
    // Clear any pending refresh promise
    this.refreshPromise = null
    
    // Clear related caches from other services
    shortCache.clear()
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken)
    localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken)
  }

  setUserInfo(userId, role, isStaff) {
    localStorage.setItem(TOKEN_KEYS.USER_ID, userId.toString())
    localStorage.setItem(TOKEN_KEYS.USER_ROLE, role)
    localStorage.setItem(TOKEN_KEYS.IS_STAFF, isStaff.toString())
  }

  getAccessToken() {
    return localStorage.getItem(TOKEN_KEYS.ACCESS)
  }

  getRefreshToken() {
    return localStorage.getItem(TOKEN_KEYS.REFRESH)
  }

  getUserRole() {
    return localStorage.getItem(TOKEN_KEYS.USER_ROLE)
  }

  getIsStaff() {
    return localStorage.getItem(TOKEN_KEYS.IS_STAFF) === 'true'
  }

  getUserId() {
    const userId = localStorage.getItem(TOKEN_KEYS.USER_ID)
    return userId ? parseInt(userId) : null
  }

  getUsername() {
    return localStorage.getItem(TOKEN_KEYS.USERNAME)
  }

  isAuthenticated() {
    return !!this.getAccessToken()
  }

  async refreshToken() {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      const error = new Error('No refresh token available')
      this.logout()
      throw error
    }

    this.refreshPromise = this._performTokenRefresh(refreshToken)
    
    try {
      const result = await this.refreshPromise
      this.refreshPromise = null
      return result
    } catch (error) {
      this.refreshPromise = null
      throw error
    }
  }

  async _performTokenRefresh(refreshToken) {
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/token/refresh/', {
          refresh: refreshToken
        }, { timeout: 10000 })
        
        if (response.access) {
          localStorage.setItem(TOKEN_KEYS.ACCESS, response.access)
          
          // If new refresh token is provided, update it
          if (response.refresh) {
            localStorage.setItem(TOKEN_KEYS.REFRESH, response.refresh)
          }
          
          return response.access
        }
        
        throw new Error('Invalid refresh response - no access token received')
      } catch (error) {
        lastError = error
        
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          this.logout()
          throw new Error('Refresh token expired or invalid')
        }
        
        const retriable = error?.code === 'ECONNABORTED' || 
                         error?.code === 'NETWORK_ERROR' ||
                         error?.status >= 500
        
        if (!retriable || attempt >= maxAttempts) {
          this.logout()
          throw error
        }
        
        // Exponential backoff before retry
        await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt - 1)))
      }
    }

    this.logout()
    throw lastError || new Error('Token refresh failed after multiple attempts')
  }

  getAuthHeader() {
    const token = this.getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  // User data management with caching
  async getUserData(forceRefresh = false) {
    const userId = this.getUserId()
    if (!userId) {
      throw new Error('User not authenticated')
    }

    // Return cached data if available and not forcing refresh
    if (!forceRefresh && this.userDataCache && this.isUserDataCacheValid()) {
      return this.userDataCache
    }

    try {
      const response = await apiService.get(`/users/${userId}/`, { timeout: 10000 })
      const userData = this.transformUserData(response)
      
      // Cache the user data
      this.cacheUserData(userData)
      
      return userData
    } catch (error) {
      console.error('Error fetching user data:', error)
      
      // Return cached data if available, even if stale
      if (this.userDataCache) {
        return this.userDataCache
      }
      
      throw new Error('Failed to load user data')
    }
  }

  cacheUserData(userData) {
    this.userDataCache = userData
    this.lastUserDataFetch = Date.now()
  }

  clearUserDataCache() {
    this.userDataCache = null
    this.lastUserDataFetch = null
  }

  isUserDataCacheValid() {
    if (!this.lastUserDataFetch) return false
    // Cache is valid for 5 minutes
    return (Date.now() - this.lastUserDataFetch) < (5 * 60 * 1000)
  }

  // Data transformation methods
  transformUserData(apiUser) {
    return {
      id: apiUser.id || apiUser.user_id,
      username: apiUser.username,
      email: apiUser.email,
      role: apiUser.role,
      is_staff: apiUser.is_staff,
      first_name: apiUser.first_name || '',
      last_name: apiUser.last_name || '',
      mobile_number: apiUser.mobile_number || '',
      birthday: apiUser.birthday,
      date_joined: apiUser.date_joined,
      last_login: apiUser.last_login,
      // UI-friendly formatted data
      displayName: this.getDisplayName(apiUser),
      fullName: this.getFullName(apiUser),
      formattedPhone: this.formatPhoneNumber(apiUser.mobile_number),
      joinDate: this.formatDate(apiUser.date_joined),
      lastLoginFormatted: this.formatDateTime(apiUser.last_login),
      avatar: this.generateAvatar(apiUser.username || apiUser.email)
    }
  }

  // Validation methods
  validateLoginInput(username, password) {
    const errors = []
    
    if (!username || typeof username !== 'string' || !username.trim()) {
      errors.push('Username is required')
    } else if (username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long')
    }
    
    if (!password || typeof password !== 'string') {
      errors.push('Password is required')
    }
    
    return errors
  }

  validateRegistrationData(userData) {
    const errors = []
    
    if (!userData.username || !userData.username.trim()) {
      errors.push('Username is required')
    } else if (userData.username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long')
    }
    
    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push('Valid email is required')
    }
    
    if (!userData.password || userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }
    
    if (userData.mobile_number && !this.isValidPhoneNumber(userData.mobile_number)) {
      errors.push('Invalid phone number format')
    }
    
    return errors
  }

  sanitizeRegistrationData(userData) {
    return {
      username: userData.username?.trim(),
      email: userData.email?.trim().toLowerCase(),
      password: userData.password,
      first_name: userData.first_name?.trim() || '',
      last_name: userData.last_name?.trim() || '',
      mobile_number: userData.mobile_number?.trim() || '',
      birthday: userData.birthday || null
    }
  }

  // Helper methods
  getDisplayName(user) {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`
    }
    if (user.first_name) {
      return user.first_name
    }
    return user.username || user.email
  }

  getFullName(user) {
    const firstName = user.first_name || ''
    const lastName = user.last_name || ''
    return `${firstName} ${lastName}`.trim() || user.username || user.email
  }

  formatPhoneNumber(phone) {
    if (!phone) return ''
    // Simple Philippine phone number formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('09')) {
      return `+63 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`
    }
    return phone
  }

  formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-PH')
  }

  formatDateTime(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleString('en-PH')
  }

  generateAvatar(identifier) {
    if (!identifier) return ''
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(identifier)}&background=random&color=fff&size=40&format=svg&bold=true`
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  isValidPhoneNumber(phone) {
    // Philippine mobile number validation
    const phoneRegex = /^(\+63|0)?9\d{9}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  }

  // Token validation
  isTokenExpired(token) {
    if (!token) return true
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const currentTime = Date.now() / 1000
      return payload.exp < currentTime
    } catch (error) {
      return true
    }
  }

  getTokenExpiryTime(token) {
    if (!token) return null
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      return new Date(payload.exp * 1000)
    } catch (error) {
      return null
    }
  }

  // Enhanced authentication check
  isAuthenticated() {
    const accessToken = this.getAccessToken()
    if (!accessToken) return false
    
    // Check if token is expired
    if (this.isTokenExpired(accessToken)) {
      // Try to refresh if refresh token exists
      const refreshToken = this.getRefreshToken()
      if (refreshToken && !this.isTokenExpired(refreshToken)) {
        // Don't await here to avoid blocking, let the refresh happen in background
        this.refreshToken().catch(() => {
          // If refresh fails, user will be logged out
        })
      } else {
        this.logout()
        return false
      }
    }
    
    return true
  }
}

export default new AuthService()