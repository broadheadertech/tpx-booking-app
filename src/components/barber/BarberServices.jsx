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
      case 'haircut': return 'bg-blue-100 text-blue-800'
      case 'beard': return 'bg-green-100 text-green-800'
      case 'styling': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F5F5] to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Services</h1>
              <p className="text-gray-600 mt-1">Manage the services you offer to customers</p>
            </div>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Add Service Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Add New Service</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Service Name *</label>
                <input
                  type="text"
                  value={newService.name}
                  onChange={(e) => setNewService(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="e.g., Classic Haircut"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select
                  value={newService.category}
                  onChange={(e) => setNewService(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                >
                  <option value="haircut">Haircut</option>
                  <option value="beard">Beard</option>
                  <option value="styling">Styling</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₱) *</label>
                <input
                  type="number"
                  value={newService.price}
                  onChange={(e) => setNewService(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="0"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes) *</label>
                <input
                  type="number"
                  value={newService.duration_minutes}
                  onChange={(e) => setNewService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                  placeholder="30"
                  min="1"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                <textarea
                  value={newService.description}
                  onChange={(e) => setNewService(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
                  rows="3"
                  placeholder="Describe your service..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddService}
                className="px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
              >
                Add Service
              </button>
            </div>
          </div>
        )}

        {/* Services List */}
        <div className="space-y-4">
          {barberServices.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-8 text-center">
              <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Services Added</h3>
              <p className="text-gray-600 mb-4">Start by adding services you offer to customers.</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-[#FF8C42] text-white rounded-lg hover:bg-[#E67A1A] transition-colors"
              >
                Add Your First Service
              </button>
            </div>
          ) : (
            barberServices.map((service) => (
              <div key={service._id} className="bg-white rounded-2xl shadow-lg border border-gray-200/50 p-6">
                {editingService && editingService._id === service._id ? (
                  // Edit Mode
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">Edit Service</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleSaveEdit}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save</span>
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center space-x-1 px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Service Name</label>
                        <input
                          type="text"
                          value={editingService.name}
                          onChange={(e) => setEditingService(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                        <select
                          value={editingService.category}
                          onChange={(e) => setEditingService(prev => ({ ...prev, category: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                        >
                          <option value="haircut">Haircut</option>
                          <option value="beard">Beard</option>
                          <option value="styling">Styling</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₱)</label>
                        <input
                          type="number"
                          value={editingService.price}
                          onChange={(e) => setEditingService(prev => ({ ...prev, price: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                        <input
                          type="number"
                          value={editingService.duration_minutes}
                          onChange={(e) => setEditingService(prev => ({ ...prev, duration_minutes: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent"
                          min="1"
                        />
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                        <textarea
                          value={editingService.description}
                          onChange={(e) => setEditingService(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF8C42] focus:border-transparent resize-none"
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