import apiService from '../api.js'
import authService from '../auth.js'

class CustomerVoucherService {
  async validateVoucherCode(code) {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Get all vouchers and find the one with matching code
      const response = await apiService.get('/vouchers/')
      const vouchers = Array.isArray(response) ? response : response.results || []
      
      const voucher = vouchers.find(v => v.code === code.toUpperCase())
      
      if (!voucher) {
        return {
          success: false,
          error: 'Invalid voucher code'
        }
      }

      // Check if voucher is valid
      const now = new Date()
      const expiresAt = new Date(voucher.expires_at)
      
      if (voucher.redeemed) {
        return {
          success: false,
          error: 'This voucher has already been redeemed'
        }
      }
      
      if (expiresAt < now) {
        return {
          success: false,
          error: 'This voucher has expired'
        }
      }
      
      if (voucher.used_count >= voucher.max_uses) {
        return {
          success: false,
          error: 'This voucher has reached its usage limit'
        }
      }

      return {
        success: true,
        data: voucher
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  async redeemVoucher(code, username = null, value = null) {
    try {
      // Get current user info
      const userId = authService.getUserId()
      const userRole = authService.getUserRole()
      const isStaff = authService.getIsStaff()
      
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Prepare request body with required parameters
      const requestBody = {
        code: code
      }

      // Always include username parameter
       if (username) {
         // Use provided username (for staff redemption or when explicitly passed)
         requestBody.username = username
       } else {
         // Get current user's username from localStorage
         const currentUsername = localStorage.getItem('username')
         if (currentUsername) {
           requestBody.username = currentUsername
         }
       }

      // Add value if provided (for validation)
      if (value) {
        requestBody.value = value
      }

      const response = await apiService.post('/vouchers/redeem/', requestBody)
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

  async getUserVouchers() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
      }

      // Use the new user-specific voucher endpoint
      const response = await apiService.get('/vouchers/my/')
      
      // The API returns an array of voucher usage data
      return Array.isArray(response) ? response : []
    } catch (error) {
      console.error('Error fetching user vouchers:', error)
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
      const response = await apiService.get('/vouchers/history/')
      return response
    } catch (error) {
      console.error('Error fetching voucher history:', error)
      throw error
    }
  }

  async getAvailableVouchers() {
    try {
      const userId = authService.getUserId()
      if (!userId) {
        throw new Error('User not authenticated')
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
      
      return availableVouchers
    } catch (error) {
      console.error('Error fetching available vouchers:', error)
      throw error
    }
  }

  formatVoucherValue(value) {
    return `₱${parseFloat(value).toFixed(2)}`
  }

  isVoucherExpired(expiresAt) {
    return new Date(expiresAt) < new Date()
  }

  formatVoucherExpiry(expiresAt) {
    return new Date(expiresAt).toLocaleDateString('en-PH')
  }
}

export default new CustomerVoucherService()