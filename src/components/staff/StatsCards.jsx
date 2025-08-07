import React from 'react'
import Card from '../common/Card'
import { DollarSign, Calendar, Users, Gift, TrendingUp, TrendingDown } from 'lucide-react'

const StatsCards = () => {
  const stats = [
    {
      label: "Today's Revenue",
      value: "₱62,350",
      change: "+12%",
      changeType: "positive",
      icon: DollarSign,
      gradient: "from-[#FF8C42] to-[#FF7A2B]"
    },
    {
      label: "Appointments",
      value: "24",
      change: "+8%",
      changeType: "positive",
      icon: Calendar,
      gradient: "from-[#1A1A1A] to-[#2A2A2A]"
    },
    {
      label: "New Customers",
      value: "8",
      change: "+15%",
      changeType: "positive",
      icon: Users,
      gradient: "from-[#6B6B6B] to-[#4A4A4A]"
    },
    {
      label: "Active Vouchers",
      value: "156",
      change: "-3%",
      changeType: "negative",
      icon: Gift,
      gradient: "from-[#FF8C42] to-[#FF7A2B]"
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon
        const TrendIcon = stat.changeType === 'positive' ? TrendingUp : TrendingDown
        
        return (
          <Card key={index} className="relative p-5 bg-white border border-[#E5E7EB] hover:border-[#FF8C42]/40 hover:shadow-lg transition-all duration-300 rounded-2xl group">
            {/* Header with icon and label */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${stat.gradient} rounded-xl flex items-center justify-center shadow-sm`}>
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider leading-tight">{stat.label}</div>
              </div>
            </div>
            
            {/* Main value */}
            <div className="mb-3">
              <div className="text-2xl font-black text-[#1A1A1A] leading-none">{stat.value}</div>
            </div>
            
            {/* Trend indicator */}
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-md ${
                stat.changeType === 'positive' 
                  ? 'text-green-700 bg-green-50 border border-green-200' 
                  : 'text-red-700 bg-red-50 border border-red-200'
              }`}>
                <TrendIcon className="w-3 h-3" />
                <span>{stat.change}</span>
              </div>
              <span className="text-xs text-[#9CA3AF] font-medium">vs last month</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

export default StatsCards