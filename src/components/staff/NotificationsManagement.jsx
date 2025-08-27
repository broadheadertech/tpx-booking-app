import React from 'react'
import { Bell } from 'lucide-react'

const NotificationsManagement = ({ onRefresh }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-gray-900">Notifications</h2>
          <p className="text-gray-600 mt-1">Stay updated with important alerts and messages</p>
        </div>

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
          <Bell className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Notifications Coming Soon</h3>
          <p className="text-yellow-700">The notifications system is currently being migrated to Convex. Please check back later!</p>
        </div>
      </div>
    </div>
  )
}

export default NotificationsManagement
