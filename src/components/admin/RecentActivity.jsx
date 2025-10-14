import React from 'react'
import { Activity, Clock, User, Building, AlertCircle } from 'lucide-react'

const RecentActivity = ({ activities = [] }) => {
  // Mock data if no activities provided
  const mockActivities = [
    {
      id: 1,
      type: 'branch_created',
      title: 'New Branch Created',
      description: 'Downtown Branch was created by admin',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      icon: Building,
      color: 'text-blue-400'
    },
    {
      id: 2,
      type: 'user_registered',
      title: 'New User Registered',
      description: 'Branch admin account created for John Doe',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      icon: User,
      color: 'text-green-400'
    },
    {
      id: 3,
      type: 'system_alert',
      title: 'System Maintenance',
      description: 'Scheduled maintenance completed successfully',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
      icon: AlertCircle,
      color: 'text-orange-400'
    }
  ]

  const displayActivities = activities.length > 0 ? activities : mockActivities

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  return (
    <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Recent Activity</h3>
            <p className="text-sm text-gray-400">Latest system events</p>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="space-y-4">
        {displayActivities.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-400 mb-2">No Recent Activity</h4>
            <p className="text-sm text-gray-500">System events will appear here</p>
          </div>
        ) : (
          displayActivities.slice(0, 5).map((activity) => {
            const IconComponent = activity.icon

            return (
              <div
                key={activity.id}
                className="group flex items-start space-x-4 p-4 bg-[#1A1A1A]/50 rounded-xl border border-[#444444]/30 hover:border-[#FF8C42]/30 transition-all duration-200 hover:bg-[#1A1A1A]/80"
              >
                {/* Icon */}
                <div className={`w-10 h-10 bg-[#333333] rounded-lg flex items-center justify-center group-hover:bg-[#444444] transition-colors flex-shrink-0`}>
                  <IconComponent className={`w-5 h-5 ${activity.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-white font-medium text-sm group-hover:text-[#FF8C42] transition-colors">
                      {activity.title}
                    </h4>
                    <div className="flex items-center space-x-1 text-gray-500 text-xs">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(activity.timestamp)}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                    {activity.description}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>


    </div>
  )
}

export default RecentActivity