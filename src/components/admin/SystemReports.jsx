import React, { useState } from 'react'
import { BarChart3, TrendingUp, Download, Calendar, Building, Users, DollarSign, Activity } from 'lucide-react'

const SystemReports = ({ onRefresh }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('month')

  const reportCards = [
    {
      title: 'Branch Performance',
      description: 'Revenue and booking statistics by branch',
      icon: Building,
      color: 'from-blue-500 to-blue-600',
      value: '12 Branches',
      subvalue: 'All Active'
    },
    {
      title: 'User Analytics',
      description: 'User registration and activity metrics',
      icon: Users,
      color: 'from-green-500 to-green-600',
      value: '2,543 Users',
      subvalue: '+156 this month'
    },
    {
      title: 'Revenue Analytics',
      description: 'Global revenue trends and projections',
      icon: DollarSign,
      color: 'from-purple-500 to-purple-600',
      value: '₱1,234,567',
      subvalue: '+23% vs last month'
    },
    {
      title: 'System Health',
      description: 'Server performance and uptime statistics',
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      value: '99.9% Uptime',
      subvalue: 'All systems operational'
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span>System Reports</span>
          </h2>
          <p className="text-gray-400 mt-1">Global analytics and performance metrics</p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Period Selector */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-[#333333] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>

          {/* Export Button */}
          <button
            onClick={() => console.log('Export reports')}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportCards.map((card, index) => {
          const IconComponent = card.icon
          return (
            <div
              key={index}
              className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50 hover:border-[#FF8C42]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#FF8C42]/10 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>

              <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-[#FF8C42] transition-colors">
                {card.title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {card.description}
              </p>

              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {card.value}
                </div>
                <div className="text-sm text-green-400">
                  {card.subvalue}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart Placeholder */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Charts Coming Soon</h3>
          <p className="text-gray-400">
            Advanced analytics charts and visualizations will be available here
          </p>
          <button
            onClick={onRefresh}
            className="mt-4 px-6 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}

export default SystemReports