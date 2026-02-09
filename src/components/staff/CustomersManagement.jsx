import { useState } from 'react'
import { User, Mail, Phone, Calendar, Search, Filter, RotateCcw, MessageCircle, MapPin, Star, CreditCard, Package, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import Modal from '../common/Modal'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

// Wallet Details Section Component - fetches and displays wallet transaction history
const WalletDetailsSection = ({ customerId }) => {
  const walletData = useQuery(
    api.services.wallet.getCustomerWalletByUserId,
    customerId ? { userId: customerId } : "skip"
  )

  if (!walletData) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Wallet className="h-5 w-5 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700">Wallet Transactions</h4>
        </div>
        <p className="text-sm text-gray-500">Loading wallet data...</p>
      </div>
    )
  }

  const { transactions } = walletData

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-3">
          <Wallet className="h-5 w-5 text-gray-400" />
          <h4 className="text-sm font-semibold text-gray-700">Wallet Transactions</h4>
        </div>
        <p className="text-sm text-gray-500">No transactions yet</p>
      </div>
    )
  }

  const formatCurrency = (amount) => `₱${(amount / 100).toFixed(2)}`
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Wallet className="h-5 w-5 text-[var(--color-primary)]" />
        <h4 className="text-sm font-semibold text-gray-700">Recent Wallet Transactions</h4>
      </div>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {transactions.slice(0, 5).map((tx) => (
          <div
            key={tx._id}
            className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-100"
          >
            <div className="flex items-center space-x-3">
              {tx.type === 'topup' ? (
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <ArrowDownRight className="h-4 w-4 text-green-600" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">{tx.type}</p>
                <p className="text-xs text-gray-500">{tx.description || formatDate(tx.createdAt)}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm font-semibold ${tx.type === 'topup' ? 'text-green-600' : 'text-red-600'}`}>
                {tx.type === 'topup' ? '+' : '-'}{formatCurrency(tx.amount)}
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                tx.status === 'completed' ? 'bg-green-100 text-green-700' :
                tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const CustomersManagement = ({ customers = [], wallets = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [viewCustomer, setViewCustomer] = useState(null)
  const [contactCustomer, setContactCustomer] = useState(null)
  const [contactMethod, setContactMethod] = useState('email')
  const [contactMessage, setContactMessage] = useState('')
  const [sendingContact, setSendingContact] = useState(false)

  // Helper to get wallet balance for a customer
  const getCustomerWallet = (customerId) => {
    const wallet = wallets.find(w => w.userId === customerId)
    return wallet || { balance: 0, bonusBalance: 0, totalBalance: 0 }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return `₱${(amount / 100).toFixed(2)}`
  }

  const getStatusConfig = (customer) => {
    const status = customer.status || 'active'
    switch (status) {
      case 'active':
        return {
          status: 'active',
          label: 'Active',
          bg: 'bg-green-50',
          text: 'text-green-700',
          border: 'border-green-200',
          iconColor: 'text-green-500'
        }
      case 'new':
        return {
          status: 'new',
          label: 'New',
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          iconColor: 'text-blue-500'
        }
      default: // inactive
        return {
          status: 'inactive',
          label: 'Inactive',
          bg: 'bg-red-50',
          text: 'text-red-700',
          border: 'border-red-200',
          iconColor: 'text-red-500'
        }
    }
  }

  const filteredCustomers = customers
    .filter(customer => {
      const matchesSearch = 
        (customer.name || customer.username || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phone || customer.mobile_number || '').includes(searchTerm)
      const matchesFilter = filterStatus === 'all' || getStatusConfig(customer).status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name || a.username || '').localeCompare(b.name || b.username || '')
      if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '')
      if (sortBy === 'joined') return new Date(b.joinedDate || 0) - new Date(a.joinedDate || 0)
      if (sortBy === 'bookings') return (b.totalBookings || 0) - (a.totalBookings || 0)
      return a.id - b.id
    })

  const stats = {
    total: customers.length,
    active: customers.filter(c => (c.status || 'active') === 'active').length,
    new: customers.filter(c => (c.status || 'active') === 'new').length,
    inactive: customers.filter(c => (c.status || 'active') === 'inactive').length,
    totalSpent: customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0)
  }

  // Handle view customer
  const handleViewCustomer = (customer) => {
    setViewCustomer(customer)
  }

  // Handle contact customer
  const handleContactCustomer = (customer) => {
    setContactCustomer(customer)
    setContactMethod('email')
    setContactMessage('')
  }

  // Handle send contact
  const handleSendContact = async () => {
    if (!contactMessage.trim()) {
      alert('Please enter a message')
      return
    }

    setSendingContact(true)
    try {
      // Simulate sending contact (in production, this would call an API)
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (contactMethod === 'email') {
        // Open email client as fallback
        window.location.href = `mailto:${contactCustomer.email}?subject=Message from Barbershop&body=${encodeURIComponent(contactMessage)}`
      } else if (contactMethod === 'sms') {
        // Open SMS app as fallback
        window.location.href = `sms:${contactCustomer.mobile_number || contactCustomer.phone}?body=${encodeURIComponent(contactMessage)}`
      } else if (contactMethod === 'whatsapp') {
        // Open WhatsApp
        const phone = (contactCustomer.mobile_number || contactCustomer.phone || '').replace(/[^0-9]/g, '')
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(contactMessage)}`, '_blank')
      }
      
      setContactCustomer(null)
      setContactMessage('')
    } catch (error) {
      console.error('Error sending contact:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingContact(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <User className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.active}</p>
            </div>
            <User className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">New</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.new}</p>
            </div>
            <User className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Inactive</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.inactive}</p>
            </div>
            <User className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Spent</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">₱{stats.totalSpent.toFixed(0)}</p>
            </div>
            <Calendar className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="new">New</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="joined">Sort by Joined Date</option>
              <option value="bookings">Sort by Bookings</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#0A0A0A] border-b border-[#444444]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>Customer</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>Contact</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-[var(--color-primary)]" />
                    <span>Wallet</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#444444]/30">
              {filteredCustomers.map((customer, index) => {
                const statusConfig = getStatusConfig(customer)
                return (
                  <tr 
                    key={customer.id}
                    className={`hover:bg-[#333333]/50 transition-colors ${
                      index % 2 === 0 ? 'bg-[#2A2A2A]' : 'bg-[#333333]/30'
                    }`}
                  >
                    {/* Customer Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center`}>
                          <User className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate max-w-[200px]" title={customer.name || customer.username}>
                            {(customer.name || customer.username || '').length > 25
                              ? (customer.name || customer.username).substring(0, 25) + '...'
                              : (customer.name || customer.username)}
                          </div>
                          <div className="text-sm text-gray-400 truncate max-w-[180px]" title={customer.username}>
                            @{customer.username?.length > 20 ? customer.username.substring(0, 20) + '...' : customer.username}
                            {customer.nickname && (
                              <span className="ml-2 text-xs bg-[#444444] text-gray-300 px-2 py-0.5 rounded-full">
                                {customer.nickname}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-3 w-3 text-gray-500" />
                          <span className="text-sm text-white truncate max-w-48" title={customer.email}>
                            {customer.email || 'No email'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="h-3 w-3 text-gray-500" />
                          <span className="text-sm text-gray-400">
                            {customer.phone || customer.mobile_number || 'No phone'}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Wallet Balance */}
                    <td className="px-6 py-4">
                      {(() => {
                        const wallet = getCustomerWallet(customer._id || customer.id)
                        return (
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-white">
                              {formatCurrency(wallet.totalBalance)}
                            </div>
                            {wallet.bonusBalance > 0 && (
                              <div className="text-xs text-green-400">
                                +{formatCurrency(wallet.bonusBalance)} bonus
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig.iconColor.replace('text-', 'bg-')}`}></div>
                        {statusConfig.label}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          onClick={() => handleViewCustomer(customer)}
                          className="inline-flex items-center px-3 py-1.5 bg-[var(--color-primary)]/20 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/30 transition-colors text-xs font-medium"
                        >
                          <User className="h-3 w-3 mr-1" />
                          View
                        </button>
                        <button 
                          onClick={() => handleContactCustomer(customer)}
                          className="inline-flex items-center px-3 py-1.5 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-xs font-medium"
                        >
                          <Mail className="h-3 w-3 mr-1" />
                          Contact
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">No customers found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding a new customer.'
            }
          </p>
        </div>
      )}

      {/* View Customer Modal */}
      {viewCustomer && (
        <Modal 
          isOpen={!!viewCustomer} 
          onClose={() => setViewCustomer(null)} 
          title="Customer Details"
          size="lg"
        >
          <div className="space-y-6">
            {/* Customer Header */}
            <div className="flex items-center space-x-4 pb-6 border-b border-gray-200">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                <User className="h-8 w-8 text-[var(--color-primary)]" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#1A1A1A]">
                  {viewCustomer.name || viewCustomer.username}
                </h3>
                <p className="text-sm text-gray-600">@{viewCustomer.username}</p>
                {viewCustomer.nickname && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-primary)]/10 text-[var(--color-primary)] mt-1">
                    {viewCustomer.nickname}
                  </span>
                )}
              </div>
              <div className="flex-shrink-0">
                {(() => {
                  const statusConfig = getStatusConfig(viewCustomer)
                  return (
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border} border`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${statusConfig.iconColor.replace('text-', 'bg-')}`}></div>
                      {statusConfig.label}
                    </span>
                  )
                })()}
              </div>
            </div>

            {/* Customer Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center">
                  <Mail className="h-5 w-5 text-[var(--color-primary)] mr-2" />
                  Contact Information
                </h4>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {viewCustomer.email || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {viewCustomer.phone || viewCustomer.mobile_number || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  {viewCustomer.address && (
                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Address</p>
                        <p className="text-sm font-medium text-gray-900">
                          {viewCustomer.address}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-[#1A1A1A] flex items-center">
                  <User className="h-5 w-5 text-[var(--color-primary)] mr-2" />
                  Personal Information
                </h4>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Birthday</p>
                      <p className="text-sm font-medium text-gray-900">
                        {viewCustomer.formattedBirthday || viewCustomer.birthday || 'Not provided'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <User className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Role</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {viewCustomer.role || 'Customer'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Calendar className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Account ID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono">
                        {viewCustomer._id || viewCustomer.id}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 text-center">
                <Package className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-900">
                  {viewCustomer.totalBookings || 0}
                </p>
                <p className="text-xs text-blue-700">Total Bookings</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 text-center">
                <CreditCard className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-900">
                  ₱{(viewCustomer.totalSpent || 0).toFixed(0)}
                </p>
                <p className="text-xs text-green-700">Total Spent</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 text-center">
                <Star className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-yellow-900">
                  {viewCustomer.loyaltyPoints || 0}
                </p>
                <p className="text-xs text-yellow-700">Loyalty Points</p>
              </div>
              {/* Wallet Balance */}
              {(() => {
                const wallet = getCustomerWallet(viewCustomer._id || viewCustomer.id)
                return (
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 text-center">
                    <Wallet className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-900">
                      {formatCurrency(wallet.totalBalance)}
                    </p>
                    <p className="text-xs text-orange-700">Wallet Balance</p>
                    {wallet.bonusBalance > 0 && (
                      <p className="text-xs text-green-600 mt-1">
                        +{formatCurrency(wallet.bonusBalance)} bonus
                      </p>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* Wallet Details Section */}
            <WalletDetailsSection customerId={viewCustomer._id || viewCustomer.id} />

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setViewCustomer(null)
                  handleContactCustomer(viewCustomer)
                }}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm font-medium"
              >
                <Mail className="h-4 w-4 inline mr-2" />
                Contact Customer
              </button>
              <button
                onClick={() => setViewCustomer(null)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Contact Customer Modal */}
      {contactCustomer && (
        <Modal 
          isOpen={!!contactCustomer} 
          onClose={() => setContactCustomer(null)} 
          title="Contact Customer"
          size="md"
        >
          <div className="space-y-6">
            {/* Customer Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-semibold text-[#1A1A1A]">
                    {contactCustomer.name || contactCustomer.username}
                  </h4>
                  <p className="text-sm text-gray-600 truncate">
                    {contactCustomer.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Method Selection */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Contact Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setContactMethod('email')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    contactMethod === 'email'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Mail className={`h-6 w-6 mb-2 ${contactMethod === 'email' ? 'text-[var(--color-primary)]' : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${contactMethod === 'email' ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                    Email
                  </span>
                </button>
                <button
                  onClick={() => setContactMethod('sms')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    contactMethod === 'sms'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MessageCircle className={`h-6 w-6 mb-2 ${contactMethod === 'sms' ? 'text-[var(--color-primary)]' : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${contactMethod === 'sms' ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                    SMS
                  </span>
                </button>
                <button
                  onClick={() => setContactMethod('whatsapp')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all ${
                    contactMethod === 'whatsapp'
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Phone className={`h-6 w-6 mb-2 ${contactMethod === 'whatsapp' ? 'text-[var(--color-primary)]' : 'text-gray-500'}`} />
                  <span className={`text-xs font-medium ${contactMethod === 'whatsapp' ? 'text-[var(--color-primary)]' : 'text-gray-700'}`}>
                    WhatsApp
                  </span>
                </button>
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                Message
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none text-sm"
              />
              <p className="mt-2 text-xs text-gray-500">
                {contactMethod === 'email' && 'This will open your default email client'}
                {contactMethod === 'sms' && 'This will open your SMS app'}
                {contactMethod === 'whatsapp' && 'This will open WhatsApp Web or App'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSendContact}
                disabled={sendingContact || !contactMessage.trim()}
                className="flex-1 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingContact ? 'Sending...' : 'Send Message'}
              </button>
              <button
                onClick={() => setContactCustomer(null)}
                disabled={sendingContact}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default CustomersManagement