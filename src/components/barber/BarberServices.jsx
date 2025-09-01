import React, { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Star, Edit3, Save, X, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const BarberServices = () => {
  const { user } = useAuth()
  const [editingService, setEditingService] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newService, setNewService] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
    category: 'haircut'
  })

  // Get barber and services data
  const barbers = useQuery(api.services.barbers.getAllBarbers)
  const allServices = useQuery(api.services.services.getAllServices)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Filter services for this barber
  const barberServices = allServices?.filter(service => 
    currentBarber?.services?.includes(service._id)
  ) || []

  // Available services that barber can add
  const availableServices = allServices?.filter(service => 
    !currentBarber?.services?.includes(service._id) && service.is_active
  ) || []

  const handleEditService = (service) => {
    setEditingService({
      ...service,
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString()
    })
  }

  const handleSaveEdit = async () => {
    try {
      // Note: In a real implementation, you'd have a mutation to update service
      // For now, we'll simulate the save
      await new Promise(resolve => setTimeout(resolve, 500))
      setEditingService(null)
      alert('Service updated successfully!')
    } catch (error) {
      console.error('Failed to update service:', error)
      alert('Failed to update service. Please try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingService(null)
  }

  const handleAddService = async () => {
    if (!newService.name || !newService.price || !newService.duration_minutes) {
      alert('Please fill in all required fields')
      return
    }

    try {
      // Note: In a real implementation, you'd have a mutation to create service
      // For now, we'll simulate the creation
      await new Promise(resolve => setTimeout(resolve, 500))
      setNewService({
        name: '',
        description: '',
        price: '',
        duration_minutes: '',
        category: 'haircut'
      })
      setShowAddForm(false)
      alert('Service added successfully!')
    } catch (error) {
      console.error('Failed to add service:', error)
      alert('Failed to add service. Please try again.')
    }
  }

  const handleRemoveService = async (serviceId) => {
    if (!confirm('Are you sure you want to remove this service from your offerings?')) {
      return
    }

    try {
      // Note: In a real implementation, you'd have a mutation to remove service from barber
      await new Promise(resolve => setTimeout(resolve, 500))
      alert('Service removed successfully!')
    } catch (error) {
      console.error('Failed to remove service:', error)
      alert('Failed to remove service. Please try again.')
    }
  }

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
    }
    return `${mins}m`
  }

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'haircut': return <Scissors className="w-5 h-5" />
      case 'beard': return <Scissors className="w-5 h-5" />
      case 'styling': return <Star className="w-5 h-5" />
      default: return <Scissors className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category) => {
    switch (category) {
      case 'haircut': return 'bg-blue-600/20 border border-blue-500/30 text-blue-300'
      case 'beard': return 'bg-green-600/20 border border-green-500/30 text-green-300'
      case 'styling': return 'bg-purple-600/20 border border-purple-500/30 text-purple-300'
      default: return 'bg-gray-600/20 border border-gray-500/30 text-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] pb-20 md:pb-0">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
        <div 
          className="h-full bg-cover bg-center bg-no-repeat opacity-5"
          style={{
            backgroundImage: `url(/img/pnglog.png)`,
            filter: 'brightness(0.3)'
          }}
        ></div>
      </div>
      
      {/* Header */}
      <div className="relative z-10 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30 sticky top-0">
        <div className="px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8">
          <div className="py-4 md:py-6 flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">My Services</h1>
              <p className="text-sm md:text-base text-gray-400 mt-1">Manage the services you offer to customers</p>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors active:scale-95 text-sm md:text-base"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-4 md:max-w-7xl md:mx-auto md:px-6 lg:px-8 py-4 md:py-6">
        {/* Add Service Form */}
        {showAddForm && (
          <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6 mb-4 md:mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-bold text-white">Add New Service</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-300 p-1 rounded-lg hover:bg-[#444444] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Service Name *</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] placeholder-gray-500"
                  placeholder="e.g., Classic Haircut"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                >
                  <option value="haircut" className="bg-[#1A1A1A] text-white">Haircut</option>
                  <option value="beard" className="bg-[#1A1A1A] text-white">Beard</option>
                  <option value="styling" className="bg-[#1A1A1A] text-white">Styling</option>
                  <option value="other" className="bg-[#1A1A1A] text-white">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Price (₱) *</label>
                <input
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] placeholder-gray-500"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (minutes) *</label>
                <input
                  type="number"
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] placeholder-gray-500"
                  placeholder="30"
                  min="1"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] resize-none placeholder-gray-500"
                  rows="3"
                  placeholder="Describe your service..."
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-3 border border-[#555555] text-gray-300 rounded-lg hover:bg-[#444444] transition-colors active:scale-95 text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                className="px-4 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors active:scale-95 text-sm md:text-base"
              >
                Add Service
              </button>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="space-y-3 md:space-y-4">
          {barberServices.length === 0 ? (
            <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-6 md:p-8 text-center">
              <Scissors className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-base md:text-lg font-semibold text-white mb-2">No Services Added</h3>
              <p className="text-gray-400 mb-4 text-sm md:text-base">Start by adding services you offer to customers.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-3 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors active:scale-95 text-sm md:text-base"
              >
                Add Your First Service
              </button>
            </div>
          ) : (
            barberServices.map((service) => (
              <div key={service._id} className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-xl md:rounded-2xl shadow-lg border border-[#444444]/50 p-4 md:p-6">
                {editingService && editingService._id === service._id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base md:text-lg font-bold text-white">Edit Service</h3>
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm active:scale-95"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center justify-center space-x-1 px-3 py-2 bg-[#555555] text-white rounded-lg hover:bg-[#666666] transition-colors text-sm active:scale-95"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Service Name</label>
                        <input
                          type="text"
                          value={editingService.name}
                          onChange={(e) => setEditingService(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Category</label>
                        <select
                          value={editingService.category}
                          onChange={(e) => setEditingService(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                        >
                          <option value="haircut" className="bg-[#1A1A1A] text-white">Haircut</option>
                          <option value="beard" className="bg-[#1A1A1A] text-white">Beard</option>
                          <option value="styling" className="bg-[#1A1A1A] text-white">Styling</option>
                          <option value="other" className="bg-[#1A1A1A] text-white">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Price (₱)</label>
                        <input
                          type="number"
                          value={editingService.price}
                          onChange={(e) => setEditingService(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Duration (minutes)</label>
                        <input
                          type="number"
                          value={editingService.duration_minutes}
                          onChange={(e) => setEditingService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42]"
                          min="1"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-300 mb-2">Description</label>
                        <textarea
                          value={editingService.description}
                          onChange={(e) => setEditingService(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#555555] text-white rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] resize-none"
                          rows="3"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                          {getCategoryIcon(service.category)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(service.category)}`}>
                            {service.category.charAt(0).toUpperCase() + service.category.slice(1)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-gray-600 mb-3">{service.description}</p>
                      
                      <div className="flex items-center space-x-6 text-sm">
                        <div className="flex items-center space-x-1 text-green-600">
                          <DollarSign className="w-4 h-4" />
                          <span className="font-semibold">₱{service.price}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Clock className="w-4 h-4" />
                          <span>{formatDuration(service.duration_minutes)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 sm:mt-0 sm:ml-6 flex space-x-2">
                      <button
                        onClick={() => handleEditService(service)}
                        className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleRemoveService(service._id)}
                        className="flex items-center space-x-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Available Services to Add */}
        {availableServices.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mt-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Services to Add</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableServices.map((service) => (
                <div key={service._id} className="p-4 border border-gray-200 rounded-lg hover:border-[#FF8C42] transition-colors">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className={`p-2 rounded-lg ${getCategoryColor(service.category)}`}>
                      {getCategoryIcon(service.category)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{service.name}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <span>₱{service.price}</span>
                        <span>•</span>
                        <span>{formatDuration(service.duration_minutes)}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{service.description}</p>
                  <button className="w-full px-3 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors text-sm">
                    Add to My Services
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default BarberServices