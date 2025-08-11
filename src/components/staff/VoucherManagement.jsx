import React, { useState } from 'react'
import { Gift, Calendar, User, DollarSign, CheckCircle, XCircle, Clock, Search, Filter, Plus, RotateCcw } from 'lucide-react'

const VoucherManagement = ({ vouchers = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')

  const getStatusConfig = (voucher) => {
    if (voucher.redeemed) {
      return {
        status: 'redeemed',
        label: 'Redeemed',
        icon: CheckCircle,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        iconColor: 'text-green-500'
      }
    }
    if (voucher.isExpired) {
      return {
        status: 'expired',
        label: 'Expired',
        icon: XCircle,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
    return {
      status: 'active',
      label: 'Active',
      icon: Clock,
      bg: 'bg-orange-50',
      text: 'text-orange-700',
      border: 'border-orange-200',
      iconColor: 'text-orange-500'
    }
  }

  const filteredVouchers = vouchers
    .filter(voucher => {
      const matchesSearch = voucher.code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFilter = filterStatus === 'all' || getStatusConfig(voucher).status === filterStatus
      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'value') return parseFloat(b.value) - parseFloat(a.value)
      if (sortBy === 'expires_at') return new Date(a.expires_at) - new Date(b.expires_at)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const stats = {
    total: vouchers.length,
    active: vouchers.filter(v => !v.redeemed && !v.isExpired).length,
    redeemed: vouchers.filter(v => v.redeemed).length,
    expired: vouchers.filter(v => v.isExpired && !v.redeemed).length,
    totalValue: vouchers.reduce((sum, v) => sum + parseFloat(v.value), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Gift className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-orange-600">{stats.active}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Redeemed</p>
              <p className="text-2xl font-bold text-green-600">{stats.redeemed}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              <p className="text-2xl font-bold text-gray-900">₱{stats.totalValue.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search voucher code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="redeemed">Redeemed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="created_at">Sort by Date</option>
              <option value="value">Sort by Value</option>
              <option value="expires_at">Sort by Expiry</option>
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
            <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
              <Plus className="h-4 w-4" />
              <span>New Voucher</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vouchers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVouchers.map((voucher) => {
          const statusConfig = getStatusConfig(voucher)
          const StatusIcon = statusConfig.icon

          return (
            <div
              key={voucher.id}
              className={`bg-white rounded-lg border-2 ${statusConfig.border} shadow-sm hover:shadow-md transition-shadow p-4`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                    <Gift className="h-4 w-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="font-mono text-sm font-bold text-gray-900">{voucher.code}</p>
                    <p className="text-xs text-gray-500">ID: {voucher.id}</p>
                  </div>
                </div>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${statusConfig.bg} ${statusConfig.border} border`}>
                  <StatusIcon className={`h-3 w-3 ${statusConfig.iconColor}`} />
                  <span className={`text-xs font-medium ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Value</span>
                  <span className="text-lg font-bold text-gray-900">{voucher.formattedValue}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Points Required</span>
                  <span className="text-sm font-medium text-gray-900">{voucher.points_required}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">User</span>
                  <span className="text-sm font-medium text-gray-900">User {voucher.user}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Created</span>
                  <span className="text-sm text-gray-600">
                    {new Date(voucher.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Expires</span>
                  <span className={`text-sm ${voucher.isExpired ? 'text-red-600' : 'text-gray-600'}`}>
                    {new Date(voucher.expires_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {!voucher.redeemed && !voucher.isExpired && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <button className="w-full px-3 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors text-sm font-medium">
                    Manage Voucher
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filteredVouchers.length === 0 && (
        <div className="text-center py-12">
          <Gift className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No vouchers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new voucher.'
            }
          </p>
        </div>
      )}
    </div>
  )
}

export default VoucherManagement