import apiService from './api.js'

const TOKEN_KEYS = {
  ACCESS: 'access_token',
  REFRESH: 'refresh_token',
  USER_ROLE: 'user_role',
  IS_STAFF: 'is_staff'
}

class AuthService {
  async login(username, password) {
    try {
      const response = await apiService.post('/login/', {
        username,
        password
      })
      
      if (response.access && response.refresh) {
        this.setTokens(response.access, response.refresh)
        this.setUserInfo(response.role, response.is_staff)
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
      return {
        success: false,
        error: error.message
      }
    }
  }

  async register(userData) {
    try {
      const response = await apiService.post('/register/', userData)
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
  }

  setTokens(accessToken, refreshToken) {
    localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken)
    localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken)
  }

  setUserInfo(role, isStaff) {
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

  isAuthenticated() {
    return !!this.getAccessToken()
  }

  async refreshToken() {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await apiService.post('/token/refresh', {
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