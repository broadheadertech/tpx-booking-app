import apiService from '../api.js'

class SalesService {
  async getAllSales() {
    return await apiService.get('/sales/')
  }

  async getSale(id) {
    return await apiService.get(`/sales/${id}/`)
  }

  async createSale(saleData) {
    return await apiService.post('/sales/', saleData)
  }

  async updateSale(id, saleData) {
    return await apiService.put(`/sales/${id}/`, saleData)
  }

  async patchSale(id, partialData) {
    return await apiService.patch(`/sales/${id}/`, partialData)
  }

  async deleteSale(id) {
    return await apiService.delete(`/sales/${id}/`)
  }

  async getTodaySales() {
    const sales = await this.getAllSales()
    const today = new Date().toISOString().split('T')[0]
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date).toISOString().split('T')[0]
      return saleDate === today
    })
  }

  async getWeeklySales() {
    const sales = await this.getAllSales()
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date)
      return saleDate >= weekAgo && saleDate <= today
    })
  }

  async getMonthlySales() {
    const sales = await this.getAllSales()
    const today = new Date()
    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
    
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date)
      return saleDate >= monthAgo && saleDate <= today
    })
  }

  calculateTotalRevenue(sales) {
    return sales.reduce((total, sale) => {
      return total + parseFloat(sale.discounted_amount || sale.total_amount)
    }, 0)
  }

  formatCurrency(amount) {
    return `₱${parseFloat(amount).toFixed(2)}`
  }

  getSalesAnalytics(sales) {
    const totalRevenue = this.calculateTotalRevenue(sales)
    const averageSale = sales.length > 0 ? totalRevenue / sales.length : 0
    const totalTransactions = sales.length
    const withVouchers = sales.filter(sale => sale.voucher).length
    const voucherUsageRate = sales.length > 0 ? (withVouchers / sales.length) * 100 : 0

    return {
      totalRevenue: this.formatCurrency(totalRevenue),
      averageSale: this.formatCurrency(averageSale),
      totalTransactions,
      voucherUsageRate: `${voucherUsageRate.toFixed(1)}%`
    }
  }
}

export default new SalesService()