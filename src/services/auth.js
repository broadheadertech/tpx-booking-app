import apiService from './api.js'

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER_ROLE: 'user_role',
  IS_STAFF: 'is_staff',
  USER_ID: 'user_id',
  USERNAME: 'username'
}

class AuthService {
  async login(username, password) {
    const maxAttempts = 2
    let attempt = 0
    let lastError = null

    while (attempt < maxAttempts) {
      attempt++
      try {
        const response = await apiService.post('/login/', {
          username,
          password
        }, { timeout: 45000 })
        
        if (response?.access && response?.refresh) {
          this.setTokens(response.access, response.refresh)
          this.setUserInfo(response.user_id, response.role, response.is_staff)
          // Store the username that was used for login
          localStorage.setItem(TOKEN_KEYS.USERNAME, username)
          // Also store as 'username' for compatibility
          localStorage.setItem('username', username)
          return {
            success: true,
            data: response
          }
        }
        
        return {
          success: false,
          error: 'Invalid response format'
        }
      } catch (error) {
        lastError = error
        const retriable = error?.code === 'ECONNABORTED' || error?.code === 'NETWORK_ERROR'
        if (!retriable || attempt >= maxAttempts) {
          return {
            success: false,
            error: error?.message
          }
        }
        // backoff before retry
        await new Promise(res => setTimeout(res, 800 * attempt))
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Login failed'
    }
  }

  async register(userData) {
    try {
      const response = await apiService.post('/register/', userData, { timeout: 45000 })
      return {
        success: true,
        data: response
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEYS.ACCESS)
    localStorage.removeItem(TOKEN_KEYS.REFRESH)
    localStorage.removeItem(TOKEN_KEYS.USER_ROLE)
    localStorage.removeItem(TOKEN_KEYS.IS_STAFF)
    localStorage.removeItem(TOKEN_KEYS.USER_ID)
    localStorage.removeItem(TOKEN_KEYS.USERNAME)
    // Also remove the compatibility username key
    localStorage.removeItem('username')
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
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await apiService.post('/token/refresh/', {
        refresh: refreshToken
      })
      
      if (response.access) {
        localStorage.setItem(TOKEN_KEYS.ACCESS, response.access)
        return response.access
      }
      
      throw new Error('Invalid refresh response')
    } catch (error) {
      this.logout()
      throw error
    }
  }

  getAuthHeader() {
    const token = this.getAccessToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}

export default new AuthService()