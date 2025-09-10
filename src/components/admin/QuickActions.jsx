import React from 'react'
import { Plus, Users, Building, BarChart3, Settings, Database, Shield } from 'lucide-react'

const QuickActions = () => {
  const actions = [
    {
      id: 'create-branch',
      title: 'Create Branch',
      description: 'Add new branch location',
      icon: Building,
      onClick: () => {
        // TODO: Implement create branch modal
        console.log('Create branch clicked')
      }
    },
    {
      id: 'create-admin',
      title: 'Create Admin',
      description: 'Add new branch admin',
      icon: Shield,
      onClick: () => {
        // TODO: Implement create admin modal
        console.log('Create admin clicked')
      }
    },
    {
      id: 'system-reports',
      title: 'System Reports',
      description: 'View global analytics',
      icon: BarChart3,
      onClick: () => {
        // TODO: Implement system reports
        console.log('System reports clicked')
      }
    },
    {
      id: 'backup-data',
      title: 'Backup Data',
      description: 'Export system data',
      icon: Database,
      onClick: () => {
        // TODO: Implement data backup
        console.log('Backup data clicked')
      }
    }
  ]

  return (
    <div className="bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] rounded-3xl shadow-2xl border border-[#333333]/50 p-8 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span>Quick Actions</span>
          </h2>
          <p className="text-gray-400 mt-1">Common administrative tasks</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {actions.map((action) => {
          const IconComponent = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="group bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-6 border border-[#444444]/50 hover:border-[#FF8C42]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#FF8C42]/10 hover:scale-[1.02] active:scale-[0.98]"
            >
              {/* Icon */}
              <div className={`w-12 h-12 bg-gradient-to-r ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>

              {/* Content */}
              <div className="text-left">
                <h3 className="text-white font-semibold text-lg mb-2 group-hover:text-[#FF8C42] transition-colors">
                  {action.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {action.description}
                </p>
              </div>

              {/* Hover indicator */}
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-full h-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-full"></div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default QuickActions