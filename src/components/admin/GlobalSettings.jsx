import React, { useState } from 'react'
import { Settings, Save, Database, Shield, Mail, Bell, Globe, Server } from 'lucide-react'

const GlobalSettings = ({ onRefresh }) => {
  const [settings, setSettings] = useState({
    systemName: 'TPX Barbershop Management',
    timezone: 'Asia/Manila',
    currency: 'PHP',
    emailNotifications: true,
    smsNotifications: false,
    autoBackup: true,
    maintenanceMode: false,
    debugMode: false
  })

  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // TODO: Implement save functionality
    setTimeout(() => {
      setSaving(false)
      console.log('Settings saved:', settings)
    }, 2000)
  }

  const handleInputChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const settingSections = [
    {
      title: 'System Configuration',
      icon: Server,
      settings: [
        {
          key: 'systemName',
          label: 'System Name',
          type: 'text',
          description: 'Display name for the application'
        },
        {
          key: 'timezone',
          label: 'Timezone',
          type: 'select',
          options: [
            { value: 'Asia/Manila', label: 'Asia/Manila (GMT+8)' },
            { value: 'UTC', label: 'UTC (GMT+0)' },
            { value: 'America/New_York', label: 'America/New_York (GMT-5)' }
          ],
          description: 'System default timezone'
        },
        {
          key: 'currency',
          label: 'Default Currency',
          type: 'select',
          options: [
            { value: 'PHP', label: 'PHP (Philippine Peso)' },
            { value: 'USD', label: 'USD (US Dollar)' },
            { value: 'EUR', label: 'EUR (Euro)' }
          ],
          description: 'Default currency for pricing'
        }
      ]
    },
    {
      title: 'Notifications',
      icon: Bell,
      settings: [
        {
          key: 'emailNotifications',
          label: 'Email Notifications',
          type: 'toggle',
          description: 'Enable system email notifications'
        },
        {
          key: 'smsNotifications',
          label: 'SMS Notifications',
          type: 'toggle',
          description: 'Enable SMS notifications (requires SMS provider)'
        }
      ]
    },
    {
      title: 'Data & Security',
      icon: Database,
      settings: [
        {
          key: 'autoBackup',
          label: 'Automatic Backups',
          type: 'toggle',
          description: 'Enable daily automatic backups'
        },
        {
          key: 'maintenanceMode',
          label: 'Maintenance Mode',
          type: 'toggle',
          description: 'Enable maintenance mode (blocks user access)'
        },
        {
          key: 'debugMode',
          label: 'Debug Mode',
          type: 'toggle',
          description: 'Enable debug logging (performance impact)'
        }
      ]
    }
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4 text-white" />
            </div>
            <span>Global Settings</span>
          </h2>
          <p className="text-gray-400 mt-1">Configure system-wide settings and preferences</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-8">
        {settingSections.map((section) => {
          const SectionIcon = section.icon
          return (
            <div
              key={section.title}
              className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50"
            >
              {/* Section Header */}
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <SectionIcon className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white">{section.title}</h3>
              </div>

              {/* Settings */}
              <div className="space-y-6">
                {section.settings.map((setting) => (
                  <div
                    key={setting.key}
                    className="bg-[#1A1A1A]/50 rounded-xl p-6 border border-[#444444]/30"
                  >
                    <div className="flex items-start justify-between space-x-4">
                      <div className="flex-1">
                        <label className="block text-white font-medium mb-1">
                          {setting.label}
                        </label>
                        <p className="text-gray-400 text-sm mb-3">
                          {setting.description}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {setting.type === 'text' && (
                          <input
                            type="text"
                            value={settings[setting.key]}
                            onChange={(e) => handleInputChange(setting.key, e.target.value)}
                            className="w-64 px-3 py-2 bg-[#333333] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                          />
                        )}

                        {setting.type === 'select' && (
                          <select
                            value={settings[setting.key]}
                            onChange={(e) => handleInputChange(setting.key, e.target.value)}
                            className="w-64 px-3 py-2 bg-[#333333] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                          >
                            {setting.options.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}

                        {setting.type === 'toggle' && (
                          <button
                            onClick={() => handleInputChange(setting.key, !settings[setting.key])}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              settings[setting.key]
                                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]'
                                : 'bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                settings[setting.key] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* System Information */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-2xl p-8 border border-[#444444]/50">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-white">System Information</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { label: 'Version', value: '1.0.0' },
            { label: 'Environment', value: 'Production' },
            { label: 'Database', value: 'Convex' },
            { label: 'Last Backup', value: '2 hours ago' },
            { label: 'Uptime', value: '7d 12h 34m' },
            { label: 'Active Users', value: '156' }
          ].map((info) => (
            <div key={info.label} className="text-center">
              <div className="text-2xl font-bold text-white mb-1">{info.value}</div>
              <div className="text-gray-400 text-sm">{info.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default GlobalSettings