import apiService from '../api.js'

class ClientsService {
  async getAllClients() {
    try {
      const response = await apiService.get('/clients/')
      return response.map(client => this.transformClientData(client))
    } catch (error) {
      console.error('Error fetching clients:', error)
      throw error
    }
  }

  async getClient(id) {
    try {
      const response = await apiService.get(`/clients/${id}/`)
      return this.transformClientData(response)
    } catch (error) {
      console.error('Error fetching client:', error)
      throw error
    }
  }

  // Transform API response to UI format
  transformClientData(apiClient) {
    return {
      id: apiClient.id,
      username: apiClient.username,
      nickname: apiClient.nickname,
      name: apiClient.nickname || apiClient.username, // Display name
      email: apiClient.email,
      mobile_number: apiClient.mobile_number,
      phone: apiClient.mobile_number, // Alias for compatibility
      birthday: apiClient.birthday,
      role: apiClient.role,
      // Add UI-friendly formatted data
      formattedBirthday: this.formatDate(apiClient.birthday),
      joinedDate: new Date().toISOString().split('T')[0], // Placeholder
      avatar: this.generateAvatar(apiClient.nickname || apiClient.username),
      // Add some default values for UI compatibility
      totalBookings: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      status: 'active' // Clients are active by default
    }
  }

  // Helper methods
  generateAvatar(name) {
    const displayName = name || 'Client'
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=3B82F6&color=fff&size=150`
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  formatPhone(phoneNumber) {
    if (!phoneNumber) return 'N/A'
    // Format Philippine mobile numbers
    if (phoneNumber.startsWith('09') && phoneNumber.length === 11) {
      return `${phoneNumber.slice(0, 4)} ${phoneNumber.slice(4, 7)} ${phoneNumber.slice(7)}`
    }
    return phoneNumber
  }

  getStatusConfig(status) {
    const statusMap = {
      'active': { 
        label: 'Active', 
        color: 'green',
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        iconColor: 'text-green-500'
      },
      'inactive': { 
        label: 'Inactive', 
        color: 'red',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
    return statusMap[status] || statusMap['active']
  }

  // Search and filter helpers
  filterClients(clients, searchTerm) {
    if (!searchTerm) return clients
    
    const term = searchTerm.toLowerCase()
    return clients.filter(client => 
      client.username.toLowerCase().includes(term) ||
      (client.nickname && client.nickname.toLowerCase().includes(term)) ||
      client.email.toLowerCase().includes(term) ||
      client.mobile_number.includes(term)
    )
  }

  sortClients(clients, sortBy) {
    return [...clients].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'email':
          return a.email.localeCompare(b.email)
        case 'joined':
          return new Date(b.joinedDate) - new Date(a.joinedDate)
        case 'bookings':
          return b.totalBookings - a.totalBookings
        default:
          return a.id - b.id
      }
    })
  }
}

export default new ClientsService()