import React from 'react'
import Card from '../common/Card'
import { Calendar, Gift, UserPlus, Clock, ChevronRight } from 'lucide-react'

const RecentActivity = () => {
  const activities = [
    {
      id: 1,
      type: 'appointment',
      message: 'New appointment booked by John Doe',
      time: '2 min ago',
      icon: Calendar,
      status: 'new',
      color: 'blue'
    },
    {
      id: 2,
      type: 'voucher',
      message: 'Voucher SAV123 redeemed by Jane Smith',
      time: '15 min ago',
      icon: Gift,
      status: 'completed',
      color: 'emerald'
    },
    {
      id: 3,
      type: 'customer',
      message: 'New customer registration: Mike Johnson',
      time: '1 hour ago',
      icon: UserPlus,
      status: 'new',
      color: 'purple'
    }
  ]

  const getColorClasses = (color, status) => {
    const colors = {
      blue: {
        bg: 'bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-[#FF8C42]/10 text-[#FF8C42] border-2 border-[#FF8C42]/20' : 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      emerald: {
        bg: 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-[#FF8C42]/10 text-[#FF8C42] border-2 border-[#FF8C42]/20' : 'bg-green-50 text-green-700 border-2 border-green-200'
      },
      purple: {
        bg: 'bg-gradient-to-r from-[#6B6B6B] to-[#4A4A4A]',
        icon: 'text-white',
        status: status === 'new' ? 'bg-[#FF8C42]/10 text-[#FF8C42] border-2 border-[#FF8C42]/20' : 'bg-green-50 text-green-700 border-2 border-green-200'
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
        {activities.map((activity) => {
          const IconComponent = activity.icon
          const colorClasses = getColorClasses(activity.color, activity.status)
          
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
        })}
      </div>
    </Card>
  )
}

export default RecentActivity