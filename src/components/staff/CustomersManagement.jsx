import React, { useState } from 'react'
import { User, Mail, Phone, Calendar, Search, Filter, Plus, RotateCcw } from 'lucide-react'

const CustomersManagement = ({ customers = [], onRefresh, onAddCustomer }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')

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

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.total}</p>
            </div>
            <User className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.active}</p>
            </div>
            <User className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">New</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.new}</p>
            </div>
            <User className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Inactive</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.inactive}</p>
            </div>
            <User className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Spent</p>
              <p className="text-2xl font-bold text-[#FF8C42]">₱{stats.totalSpent.toFixed(0)}</p>
            </div>
            <Calendar className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            <button 
              onClick={onAddCustomer}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Customer</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A] border-b border-[#444444]/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-[#FF8C42]" />
                    <span>Customer</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-[#FF8C42]" />
                    <span>Contact</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-[#FF8C42]" />
                    <span>Birthday</span>
                  </div>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] divide-y divide-[#444444]/30">
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
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-[#FF8C42]/20 flex items-center justify-center`}>
                          <User className="h-5 w-5 text-[#FF8C42]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-white truncate">
                            {customer.name || customer.username}
                          </div>
                          <div className="text-sm text-gray-400">
                            @{customer.username}
                            {customer.nickname && (
                              <span className="ml-2 text-xs bg-[#444444] text-gray-300 px-2 py-0.5 rounded-full">
                                {customer.nickname}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">ID: {customer.id}</div>
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

                    {/* Birthday */}
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {customer.formattedBirthday || customer.birthday || 'Not provided'}
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        Role: {customer.role || 'client'}
                      </div>
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
                        <button className="inline-flex items-center px-3 py-1.5 bg-[#FF8C42]/20 text-[#FF8C42] rounded-lg hover:bg-[#FF8C42]/30 transition-colors text-xs font-medium">
                          <User className="h-3 w-3 mr-1" />
                          View
                        </button>
                        <button className="inline-flex items-center px-3 py-1.5 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-xs font-medium">
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
    </div>
  )
}

export default CustomersManagement