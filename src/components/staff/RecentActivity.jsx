import React from 'react'
import Card from '../common/Card'
import { Calendar, Gift, UserPlus, Clock, ChevronRight, DollarSign, User, Info } from 'lucide-react'

const RecentActivity = ({ activities = [] }) => {
  // Icon mapping for different activity types
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking':
      case 'appointment':
        return Calendar
      case 'voucher':
        return Gift
      case 'customer':
      case 'client':
        return UserPlus
      case 'sale':
        return DollarSign
      case 'user':
        return User
      case 'info':
      default:
        return Info
    }
  }

  const getColorClasses = (type, status) => {
    const typeColors = {
      booking: 'blue',
      appointment: 'blue', 
      voucher: 'emerald',
      customer: 'purple',
      client: 'purple',
      sale: 'green',
      user: 'gray',
      info: 'gray'
    }
    
    const color = typeColors[type] || 'gray'
    
    const colors = {
      blue: {
        bg: 'bg-gradient-to-r from-[#3B82F6] to-[#2563EB]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-blue-50 text-blue-700 border-2 border-blue-200' : 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      emerald: {
        bg: 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-[#FF8C42]/10 text-[#FF8C42] border-2 border-[#FF8C42]/20' : 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      purple: {
        bg: 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-purple-50 text-purple-700 border-2 border-purple-200' : 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      green: {
        bg: 'bg-gradient-to-r from-[#10B981] to-[#059669]',
        icon: 'text-white',
        status: 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      gray: {
        bg: 'bg-gradient-to-r from-[#6B6B6B] to-[#4A4A4A]',
        icon: 'text-white',
        status: 'bg-gray-50 text-gray-700 border-2 border-gray-200'
      }
    }
    return colors[color]
  }

  return (
    <Card className="p-8 bg-white border-2 border-[#F5F5F5] rounded-3xl shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-2xl font-black text-[#1A1A1A]">Recent Activity</h3>
        <button className="flex items-center space-x-2 text-[#FF8C42] hover:text-[#FF7A2B] text-base font-bold transition-all duration-300 group hover:scale-105">
          <span>View All</span>
          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Info className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">No recent activity available</p>
          </div>
        ) : (
          activities.map((activity) => {
            const IconComponent = getActivityIcon(activity.type)
            const colorClasses = getColorClasses(activity.type, activity.status)
            
            return (
              <div key={activity.id} className="flex items-start space-x-6 p-6 rounded-2xl bg-[#F5F5F5]/30 border-2 border-transparent hover:bg-white hover:border-[#FF8C42]/20 transition-all duration-300 group cursor-pointer hover:shadow-lg hover:-translate-y-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClasses.bg} group-hover:scale-110 transition-transform shadow-lg ring-4 ring-white`}>
                  <IconComponent className={`w-6 h-6 ${colorClasses.icon}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-[#1A1A1A] mb-2 group-hover:text-[#FF8C42] transition-colors">
                    {activity.message}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-[#6B6B6B]" />
                    <p className="text-sm text-[#6B6B6B] font-semibold">{activity.time}</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider ${colorClasses.status}`}>
                  {activity.status}
                </div>
              </div>
            )
          })
        )}
      </div>
    </Card>
  )
}

export default RecentActivity