import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Users, Calendar, Gift, Download, Filter, RefreshCw } from 'lucide-react'

const ReportsManagement = ({ onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('week')
  const [selectedReport, setSelectedReport] = useState('revenue')
  const [loading, setLoading] = useState(false)

  // Mock data for reports
  const reportData = {
    revenue: {
      current: 125430,
      previous: 98750,
      change: 27.0,
      trend: 'up',
      chartData: [
        { period: 'Mon', value: 15200 },
        { period: 'Tue', value: 18900 },
        { period: 'Wed', value: 22100 },
        { period: 'Thu', value: 19800 },
        { period: 'Fri', value: 25400 },
        { period: 'Sat', value: 28900 },
        { period: 'Sun', value: 15130 }
      ]
    },
    customers: {
      current: 342,
      previous: 298,
      change: 14.8,
      trend: 'up',
      chartData: [
        { period: 'Mon', value: 45 },
        { period: 'Tue', value: 52 },
        { period: 'Wed', value: 48 },
        { period: 'Thu', value: 55 },
        { period: 'Fri', value: 62 },
        { period: 'Sat', value: 58 },
        { period: 'Sun', value: 22 }
      ]
    },
    bookings: {
      current: 156,
      previous: 142,
      change: 9.9,
      trend: 'up',
      chartData: [
        { period: 'Mon', value: 22 },
        { period: 'Tue', value: 25 },
        { period: 'Wed', value: 28 },
        { period: 'Thu', value: 24 },
        { period: 'Fri', value: 30 },
        { period: 'Sat', value: 18 },
        { period: 'Sun', value: 9 }
      ]
    },
    vouchers: {
      current: 89,
      previous: 76,
      change: 17.1,
      trend: 'up',
      chartData: [
        { period: 'Mon', value: 12 },
        { period: 'Tue', value: 15 },
        { period: 'Wed', value: 18 },
        { period: 'Thu', value: 14 },
        { period: 'Fri', value: 16 },
        { period: 'Sat', value: 10 },
        { period: 'Sun', value: 4 }
      ]
    }
  }

  const reportTypes = [
    { id: 'revenue', label: 'Revenue', icon: DollarSign, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'customers', label: 'Customers', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'bookings', label: 'Bookings', icon: Calendar, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
    { id: 'vouchers', label: 'Vouchers', icon: Gift, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' }
  ]

  const periods = [
    { id: 'day', label: 'Today' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' }
  ]

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const currentData = reportData[selectedReport]
  const maxValue = Math.max(...currentData.chartData.map(d => d.value))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600 mt-1">Track your business performance and insights</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Period:</span>
            </div>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {periods.map(period => (
                <option key={period.id} value={period.id}>{period.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((type) => {
          const IconComponent = type.icon
          const data = reportData[type.id]
          const isSelected = selectedReport === type.id
          
          return (
            <button
              key={type.id}
              onClick={() => setSelectedReport(type.id)}
              className={`p-6 rounded-lg border-2 transition-all duration-200 text-left ${
                isSelected
                  ? `${type.bgColor} ${type.borderColor} shadow-lg transform scale-105`
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-white/80' : type.bgColor
                }`}>
                  <IconComponent className={`h-6 w-6 ${
                    isSelected ? type.color : type.color
                  }`} />
                </div>
                {data.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">{type.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {type.id === 'revenue' ? formatCurrency(data.current) : formatNumber(data.current)}
                </p>
                <p className={`text-xs font-medium ${
                  data.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {data.trend === 'up' ? '+' : '-'}{data.change}% from last {selectedPeriod}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {reportTypes.find(t => t.id === selectedReport)?.label} Trend
            </h3>
            <p className="text-sm text-gray-600">Performance over the selected period</p>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-4">
          {currentData.chartData.map((item, index) => {
            const percentage = (item.value / maxValue) * 100
            return (
              <div key={index} className="flex items-center space-x-4">
                <div className="w-12 text-sm font-medium text-gray-600">
                  {item.period}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-end pr-3">
                    <span className="text-xs font-medium text-gray-700">
                      {selectedReport === 'revenue' ? formatCurrency(item.value) : formatNumber(item.value)}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Average Daily</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {selectedReport === 'revenue' 
              ? formatCurrency(Math.round(currentData.current / 7))
              : formatNumber(Math.round(currentData.current / 7))
            }
          </p>
          <p className="text-sm text-gray-600 mt-1">Per day this {selectedPeriod}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Best Day</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {(() => {
              const bestDay = currentData.chartData.reduce((max, day) => 
                day.value > max.value ? day : max
              )
              return selectedReport === 'revenue' 
                ? formatCurrency(bestDay.value)
                : formatNumber(bestDay.value)
            })()} 
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {currentData.chartData.reduce((max, day) => 
              day.value > max.value ? day : max
            ).period}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-purple-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900">Growth Rate</h4>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            +{currentData.change}%
          </p>
          <p className="text-sm text-gray-600 mt-1">Compared to last {selectedPeriod}</p>
        </div>
      </div>
    </div>
  )
}

export default ReportsManagement