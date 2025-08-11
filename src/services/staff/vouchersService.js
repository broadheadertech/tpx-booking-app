import apiService from '../api.js'

class VouchersService {
  async getAllVouchers() {
    return await apiService.get('/vouchers/')
  }

  async getVoucher(id) {
    return await apiService.get(`/vouchers/${id}/`)
  }

  async createVoucher(voucherData) {
    return await apiService.post('/vouchers/', voucherData)
  }

  async updateVoucher(id, voucherData) {
    return await apiService.put(`/vouchers/${id}/`, voucherData)
  }

  async patchVoucher(id, partialData) {
    return await apiService.patch(`/vouchers/${id}/`, partialData)
  }

  async deleteVoucher(id) {
    return await apiService.delete(`/vouchers/${id}/`)
  }

  async redeemVoucher(code, totalAmount) {
    return await apiService.post('/vouchers/redeem/', {
      code,
      total_amount: totalAmount
    })
  }

  generateVoucherCode(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  isExpired(expiresAt) {
    return new Date(expiresAt) < new Date()
  }

  formatValue(value) {
    return `₱${parseFloat(value).toFixed(2)}`
  }

  getActiveVouchers() {
    return this.getAllVouchers().then(vouchers => 
      vouchers.filter(voucher => !voucher.redeemed && !this.isExpired(voucher.expires_at))
    )
  }

  getExpiredVouchers() {
    return this.getAllVouchers().then(vouchers => 
      vouchers.filter(voucher => this.isExpired(voucher.expires_at))
    )
  }

  getRedeemedVouchers() {
    return this.getAllVouchers().then(vouchers => 
      vouchers.filter(voucher => voucher.redeemed)
    )
  }
}

export default new VouchersService()