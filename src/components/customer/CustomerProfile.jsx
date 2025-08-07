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
    <div className="min-h-screen bg-gray-50 py-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-orange-500 font-medium rounded-xl hover:bg-white transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <h1 className="text-xl font-black text-black">My Profile</h1>
        <div className="flex items-center space-x-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl transition-all duration-200"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-600 hover:bg-gray-100 font-medium rounded-xl transition-all duration-200"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all duration-200"
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Profile Picture */}
            <div className="relative">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-gray-400" />
              </div>
              {isEditing && (
                <button className="absolute bottom-0 right-0 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg hover:bg-orange-600 transition-colors duration-200">
                  <Camera className="w-3 h-3 text-white" />
                </button>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-black text-black mb-1">
                {profileData.firstName} {profileData.lastName}
              </h2>
              <p className="text-sm text-orange-500 font-medium mb-4">Gold Member</p>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-black">{profileData.stats.totalVisits}</div>
                  <div className="text-gray-500 text-xs">Total Visits</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-black">1,250</div>
                  <div className="text-gray-500 text-xs">Loyalty Points</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-black">Jun 2023</div>
                  <div className="text-gray-500 text-xs">Member Since</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4">
        {/* Personal Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-black text-black mb-4 flex items-center">
            <User className="w-5 h-5 text-orange-500 mr-2" />
            Personal Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-black font-medium text-sm mb-2">First Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black">
                  {profileData.firstName}
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-black font-medium text-sm mb-2">Last Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black">
                  {profileData.lastName}
                </div>
              )}
            </div>

            <div>
              <label className="block text-black font-medium text-sm mb-2">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black flex items-center">
                  <Mail className="w-4 h-4 text-gray-500 mr-2" />
                  {profileData.email}
                </div>
              )}
            </div>

            <div>
              <label className="block text-black font-medium text-sm mb-2">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black flex items-center">
                  <Phone className="w-4 h-4 text-gray-500 mr-2" />
                  {profileData.phone}
                </div>
              )}
            </div>

            <div>
              <label className="block text-black font-medium text-sm mb-2">Date of Birth</label>
              {isEditing ? (
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black flex items-center">
                  <Calendar className="w-4 h-4 text-gray-500 mr-2" />
                  {new Date(profileData.dateOfBirth).toLocaleDateString()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-black font-medium text-sm mb-2">Address</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                />
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black flex items-center">
                  <MapPin className="w-4 h-4 text-gray-500 mr-2" />
                  {profileData.address}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-black text-black mb-4">Preferences</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-black font-medium text-sm mb-2">Favorite Barber</label>
              {isEditing ? (
                <select
                  value={editForm.preferences.favoriteBarber}
                  onChange={(e) => handleInputChange('preferences.favoriteBarber', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                >
                  <option value="Alex Rodriguez">Alex Rodriguez</option>
                  <option value="Mike Johnson">Mike Johnson</option>
                  <option value="Sarah Wilson">Sarah Wilson</option>
                  <option value="No Preference">No Preference</option>
                </select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black">
                  {profileData.preferences.favoriteBarber}
                </div>
              )}
            </div>

            <div>
              <label className="block text-black font-medium text-sm mb-2">Preferred Time</label>
              {isEditing ? (
                <select
                  value={editForm.preferences.preferredTime}
                  onChange={(e) => handleInputChange('preferences.preferredTime', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:border-orange-500 transition-colors duration-200"
                >
                  <option value="Morning (9AM-12PM)">Morning (9AM-12PM)</option>
                  <option value="Afternoon (12PM-5PM)">Afternoon (12PM-5PM)</option>
                  <option value="Evening (5PM-8PM)">Evening (5PM-8PM)</option>
                  <option value="No Preference">No Preference</option>
                </select>
              ) : (
                <div className="p-3 bg-gray-50 rounded-xl text-sm font-medium text-black">
                  {profileData.preferences.preferredTime}
                </div>
              )}
            </div>

            {/* Notification Preferences */}
            {isEditing && (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-black">Notification Settings</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.preferences.smsReminders}
                      onChange={(e) => handleInputChange('preferences.smsReminders', e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium text-black text-sm">SMS Appointment Reminders</span>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={editForm.preferences.emailUpdates}
                      onChange={(e) => handleInputChange('preferences.emailUpdates', e.target.checked)}
                      className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                    />
                    <span className="font-medium text-black text-sm">Email Updates & Promotions</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-[#F5F5F5]">
          <h2 className="text-2xl font-black text-[#1A1A1A] mb-6">Achievements</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
                  achievement.unlocked
                    ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200 opacity-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-black text-[#1A1A1A] mb-1">
                      {achievement.title}
                    </h3>
                    <p className="text-sm text-[#6B6B6B] font-medium mb-2">
                      {achievement.description}
                    </p>
                    {achievement.unlocked && achievement.date && (
                      <p className="text-xs text-yellow-600 font-semibold">
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
        <div className="bg-white rounded-3xl p-8 shadow-xl border-2 border-[#F5F5F5]">
          <h2 className="text-2xl font-black text-[#1A1A1A] mb-6">Recent Visits</h2>
          
          <div className="space-y-4">
            {visitHistory.map((visit) => (
              <div
                key={visit.id}
                className="p-6 bg-[#F5F5F5] rounded-2xl hover:bg-[#FF8C42]/5 transition-colors duration-200"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-bold text-[#1A1A1A] mb-1">{visit.service}</h4>
                    <div className="text-sm text-[#6B6B6B] font-medium space-y-1">
                      <p>Barber: {visit.barber}</p>
                      <p>Date: {new Date(visit.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-[#FF8C42] mb-2">
                      ₱{visit.amount.toLocaleString()}
                    </div>
                    <div className="flex text-yellow-400">
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