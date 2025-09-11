import React, { useState } from 'react'
import { ArrowLeft, User, Edit3, Save, X, Phone, Mail, Calendar, MapPin, Camera } from 'lucide-react'

const CustomerProfile = ({ onBack, customerData }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@email.com',
    phone: '+63 912 345 6789',
    dateOfBirth: '1990-05-15',
    address: '123 Main Street, Quezon City',
    preferences: {
      favoriteBarber: 'Alex Rodriguez',
      preferredTime: 'Morning (9AM-12PM)',
      notifications: true,
      smsReminders: true,
      emailUpdates: true
    },
    stats: {
      totalVisits: 12,
      memberSince: '2023-06-15',
      lastVisit: '2024-01-15',
      favoriteService: 'Premium Haircut'
    }
  })

  const [editForm, setEditForm] = useState({ ...profileData })

  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setEditForm(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setEditForm(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  const handleSave = () => {
    setProfileData(editForm)
    setIsEditing(false)
    // Here you would typically make an API call to save the data
    alert('Profile updated successfully!')
  }

  const handleCancel = () => {
    setEditForm({ ...profileData })
    setIsEditing(false)
  }

  const visitHistory = [
    {
      id: 1,
      date: '2024-01-15',
      service: 'Premium Haircut',
      barber: 'Alex Rodriguez',
      amount: 1750,
      rating: 5
    },
    {
      id: 2,
      date: '2023-12-20',
      service: 'Beard Trim & Style',
      barber: 'Mike Johnson',
      amount: 1250,
      rating: 5
    },
    {
      id: 3,
      date: '2023-12-05',
      service: 'Classic Cut',
      barber: 'Alex Rodriguez',
      amount: 1000,
      rating: 4
    },
    {
      id: 4,
      date: '2023-11-18',
      service: 'Hot Towel Shave',
      barber: 'Sarah Wilson',
      amount: 1500,
      rating: 5
    }
  ]

  const achievements = [
    {
      id: 1,
      title: 'Loyal Customer',
      description: '10+ visits completed',
      icon: '🏆',
      unlocked: true,
      date: '2023-12-01'
    },
    {
      id: 2,
      title: 'Gold Member',
      description: 'Reached Gold tier',
      icon: '🥇',
      unlocked: true,
      date: '2023-11-15'
    },
    {
      id: 3,
      title: 'Service Explorer',
      description: 'Tried 5 different services',
      icon: '🌟',
      unlocked: true,
      date: '2023-10-20'
    },
    {
      id: 4,
      title: 'Platinum Member',
      description: 'Reach Platinum tier',
      icon: '💎',
      unlocked: false,
      date: null
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] py-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 font-medium rounded-xl transition-all duration-200 text-gray-400 bg-[#333333] hover:text-[#FF8C42] hover:bg-[#444444]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-black text-white">My Profile</h1>
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 text-white font-medium rounded-xl transition-all duration-200 bg-[#FF8C42] hover:bg-[#FF7A2B]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 font-medium rounded-xl transition-all duration-200 text-gray-400 bg-[#333333] border border-[#444444] hover:bg-[#444444]"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 text-white font-medium rounded-xl transition-all duration-200 bg-green-600 hover:bg-green-700"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-4 mb-6">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm hover:shadow-lg transition-all duration-200 p-4">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Picture */}
            <div className="relative">
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[#444444]">
                  <User className="w-10 h-10 text-gray-400" />
                </div>
                {isEditing && (
                  <button 
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-colors duration-200 bg-[#FF8C42] hover:bg-[#FF7A2B]"
                  >
                    <Camera className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-2xl font-black mb-1 text-white">
                  {profileData.firstName} {profileData.lastName}
                </h2>
                <p className="text-sm font-medium mb-4 text-[#FF8C42]">Gold Member</p>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-bold text-lg text-white">{profileData.stats.totalVisits}</div>
                    <div className="text-xs text-gray-400">Total Visits</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-white">1,250</div>
                    <div className="text-xs text-gray-400">Loyalty Points</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg text-white">Jun 2023</div>
                    <div className="text-xs text-gray-400">Member Since</div>
                  </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4">
        {/* Personal Information */}
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm hover:shadow-lg transition-all duration-200 p-4">
          <h2 className="text-lg font-black mb-4 flex items-center text-white">
            <User className="w-5 h-5 mr-2 text-[#FF8C42]" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  {profileData.firstName}
                </div>
              )}
            </div>
            
            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  {profileData.lastName}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium flex items-center" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  <Mail className="w-4 h-4 mr-2" style={{ color: '#8B8B8B' }} />
                  {profileData.email}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium flex items-center" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  <Phone className="w-4 h-4 mr-2" style={{ color: '#8B8B8B' }} />
                  {profileData.phone}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium flex items-center" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  <Calendar className="w-4 h-4 mr-2" style={{ color: '#8B8B8B' }} />
                  {new Date(profileData.dateOfBirth).toLocaleDateString()}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                />
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium flex items-center" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  <MapPin className="w-4 h-4 mr-2" style={{ color: '#8B8B8B' }} />
                  {profileData.address}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#E0E0E0' }}>
          <h2 className="text-lg font-black mb-4" style={{ color: '#36454F' }}>Preferences</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Favorite Barber</label>
              {isEditing ? (
                <select
                  value={editForm.preferences.favoriteBarber}
                  onChange={(e) => handleInputChange('preferences.favoriteBarber', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                >
                  <option value="Alex Rodriguez">Alex Rodriguez</option>
                  <option value="Mike Johnson">Mike Johnson</option>
                  <option value="Sarah Wilson">Sarah Wilson</option>
                  <option value="No Preference">No Preference</option>
                </select>
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  {profileData.preferences.favoriteBarber}
                </div>
              )}
            </div>

            <div>
              <label className="block font-medium text-sm mb-2" style={{ color: '#36454F' }}>Preferred Time</label>
              {isEditing ? (
                <select
                  value={editForm.preferences.preferredTime}
                  onChange={(e) => handleInputChange('preferences.preferredTime', e.target.value)}
                  className="w-full p-3 border rounded-xl text-sm focus:outline-none transition-colors duration-200"
                  style={{ borderColor: '#E0E0E0' }}
                  onFocus={(e) => e.target.style.borderColor = '#F68B24'}
                  onBlur={(e) => e.target.style.borderColor = '#E0E0E0'}
                >
                  <option value="Morning (9AM-12PM)">Morning (9AM-12PM)</option>
                  <option value="Afternoon (12PM-5PM)">Afternoon (12PM-5PM)</option>
                  <option value="Evening (5PM-8PM)">Evening (5PM-8PM)</option>
                  <option value="No Preference">No Preference</option>
                </select>
              ) : (
                <div className="p-3 rounded-xl text-sm font-medium" style={{ backgroundColor: '#F5F5F5', color: '#36454F' }}>
                  {profileData.preferences.preferredTime}
                </div>
              )}
            </div>

            {/* Notification Preferences */}
            {isEditing && (
              <div className="space-y-3">
                <h3 className="text-base font-bold" style={{ color: '#36454F' }}>Notification Settings</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.preferences.smsReminders}
                      onChange={(e) => handleInputChange('preferences.smsReminders', e.target.checked)}
                      className="w-4 h-4 rounded focus:ring-2"
                      style={{ accentColor: '#F68B24' }}
                    />
                    <span className="font-medium text-sm" style={{ color: '#36454F' }}>SMS Appointment Reminders</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.preferences.emailUpdates}
                      onChange={(e) => handleInputChange('preferences.emailUpdates', e.target.checked)}
                      className="w-4 h-4 rounded focus:ring-2"
                      style={{ accentColor: '#F68B24' }}
                    />
                    <span className="font-medium text-sm" style={{ color: '#36454F' }}>Email Updates & Promotions</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2" style={{ borderColor: '#E0E0E0' }}>
          <h2 className="text-2xl font-black mb-6" style={{ color: '#36454F' }}>Achievements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                  key={achievement.id}
                  className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-orange-50 to-orange-100'
                      : 'opacity-50'
                  }`}
                  style={{
                    borderColor: achievement.unlocked ? '#F68B24' : '#E0E0E0',
                    backgroundColor: achievement.unlocked ? 'rgba(246, 139, 36, 0.1)' : '#F5F5F5'
                  }}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-4xl">{achievement.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-black mb-1" style={{ color: '#36454F' }}>
                        {achievement.title}
                      </h3>
                      <p className="text-sm font-medium mb-2" style={{ color: '#8B8B8B' }}>
                        {achievement.description}
                      </p>
                      {achievement.unlocked && achievement.date && (
                        <p className="text-xs font-semibold" style={{ color: '#F68B24' }}>
                          Unlocked: {new Date(achievement.date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
            ))}
          </div>
        </div>

        {/* Visit History */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2" style={{ borderColor: '#E0E0E0' }}>
          <h2 className="text-2xl font-black mb-6" style={{ color: '#36454F' }}>Recent Visits</h2>
          
          <div className="space-y-4">
            {visitHistory.map((visit) => (
              <div
                key={visit.id}
                className="p-6 rounded-2xl transition-colors duration-200"
                style={{ backgroundColor: '#F5F5F5' }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(246, 139, 36, 0.05)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#F5F5F5'}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold mb-1" style={{ color: '#36454F' }}>{visit.service}</h4>
                    <div className="text-sm font-medium space-y-1" style={{ color: '#8B8B8B' }}>
                      <p>Barber: {visit.barber}</p>
                      <p>Date: {new Date(visit.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black mb-2" style={{ color: '#F68B24' }}>
                      ₱{visit.amount.toLocaleString()}
                    </div>
                    <div className="flex" style={{ color: '#F68B24' }}>
                      {'★'.repeat(visit.rating)}{'☆'.repeat(5 - visit.rating)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerProfile