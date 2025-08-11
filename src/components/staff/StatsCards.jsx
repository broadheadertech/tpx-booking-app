import React from 'react'
import Card from '../common/Card'
import { DollarSign, Calendar, Users, Gift, TrendingUp, TrendingDown, Star, Scissors, Award } from 'lucide-react'

const StatsCards = ({ stats = [] }) => {
  // Icon mapping for different stat types
  const getIcon = (iconPath, label) => {
    // Map common icons based on label
    if (label.toLowerCase().includes('revenue')) return DollarSign
    if (label.toLowerCase().includes('booking') || label.toLowerCase().includes('appointment')) return Calendar
    if (label.toLowerCase().includes('customer') || label.toLowerCase().includes('client')) return Users
    if (label.toLowerCase().includes('voucher')) return Gift
    if (label.toLowerCase().includes('service')) return Star
    if (label.toLowerCase().includes('barber')) return Scissors
    if (label.toLowerCase().includes('point')) return Award
    
    // Default fallback
    return Star
  }

  // Default gradient mapping
  const getGradient = (index) => {
    const gradients = [
      "from-[#FF8C42] to-[#FF7A2B]",
      "from-[#1A1A1A] to-[#2A2A2A]", 
      "from-[#6B6B6B] to-[#4A4A4A]",
      "from-[#FF8C42] to-[#FF7A2B]",
      "from-[#3B82F6] to-[#2563EB]",
      "from-[#10B981] to-[#059669]"
    ]
    return gradients[index % gradients.length]
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = getIcon(stat.icon, stat.label)
        const gradient = getGradient(index)
        
        // Determine trend type based on change value
        const changeType = stat.trend === 'up' ? 'positive' : stat.trend === 'down' ? 'negative' : 'neutral'
        const TrendIcon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : null
        
        return (
          <Card key={index} className="relative p-5 bg-white border border-[#E5E7EB] hover:border-[#FF8C42]/40 hover:shadow-lg transition-all duration-300 rounded-2xl group">
            {/* Header with icon and label */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider leading-tight">{stat.label}</div>
              </div>
            </div>
            
            {/* Main value */}
            <div className="mb-3">
              <div className="text-2xl font-black text-[#1A1A1A] leading-none">{stat.value}</div>
              {stat.subtitle && (
                <div className="text-xs text-[#9CA3AF] mt-1">{stat.subtitle}</div>
              )}
            </div>
            
            {/* Trend indicator */}
            <div className="flex items-center justify-between">
              {stat.change && changeType !== 'neutral' && (
                <div className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                  changeType === 'positive' 
                    ? 'text-green-700 bg-green-50 border border-green-200' 
                    : 'text-red-700 bg-red-50 border border-red-200'
                }`}>
                  {TrendIcon && <TrendIcon className="w-3 h-3" />}
                  <span>{stat.change}</span>
                </div>
              )}
              {changeType === 'neutral' && stat.change && (
                <div className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-md text-gray-600 bg-gray-50 border border-gray-200">
                  <span>{stat.change}</span>
                </div>
              )}
              <span className="text-xs text-[#9CA3AF] font-medium">vs last week</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsCards