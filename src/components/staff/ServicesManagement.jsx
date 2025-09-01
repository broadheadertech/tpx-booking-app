import React, { useState } from 'react'
import { Scissors, Clock, DollarSign, Search, Filter, Plus, Edit, Trash2, RotateCcw, Grid, List } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import CreateServiceModal from './CreateServiceModal'

const ServicesManagement = ({ services = [], onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState('card') // 'card' or 'table'

  // Convex mutations
  const deleteService = useMutation(api.services.services.deleteService)

  const filteredServices = services
    .filter(service => 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'price') return parseFloat(b.price) - parseFloat(a.price)
      if (sortBy === 'duration') return b.duration_minutes - a.duration_minutes
      return a.id - b.id
    })

  const stats = {
    total: services.length,
    totalRevenue: services.reduce((sum, s) => sum + parseFloat(s.price), 0),
    avgPrice: services.length ? services.reduce((sum, s) => sum + parseFloat(s.price), 0) / services.length : 0,
    avgDuration: services.length ? services.reduce((sum, s) => sum + s.duration_minutes, 0) / services.length : 0
  }

  const handleCreate = () => {
    setEditingService(null)
    setShowCreateModal(true)
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingService(null)
  }

  const handleModalSubmit = () => {
    setShowCreateModal(false)
    setEditingService(null)
    onRefresh()
  }

  const handleDelete = async (service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return

    setLoading(true)
    try {
      await deleteService({ id: service._id })
      onRefresh()
    } catch (err) {
      console.error('Failed to delete service:', err)
      alert('Failed to delete service. Please try again.')
    } finally {
      setLoading(false)
    }
  }



  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Services</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{stats.total}</p>
            </div>
            <Scissors className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Avg. Price</p>
              <p className="text-2xl font-bold text-[#FF8C42]">₱{stats.avgPrice.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Avg. Duration</p>
              <p className="text-2xl font-bold text-[#FF8C42]">{Math.round(stats.avgDuration)}m</p>
            </div>
            <Clock className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Value</p>
              <p className="text-2xl font-bold text-[#FF8C42]">₱{stats.totalRevenue.toFixed(0)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[#FF8C42] opacity-30" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] p-4 rounded-lg border border-[#444444]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="duration">Sort by Duration</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#1A1A1A] rounded-lg border border-[#444444] p-1">
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'card'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-orange-500 text-white'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
            
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Service Modal */}
      <CreateServiceModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingService={editingService}
      />

      {/* Services Display */}
      {viewMode === 'card' ? (
        /* Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service._id}
              className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm hover:shadow-lg transition-all duration-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg">
                    <Scissors className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{service.name}</h3>
                    <p className="text-sm text-gray-400">{service.category}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 text-gray-400 hover:text-[#FF8C42] hover:bg-[#444444] rounded-lg transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-gray-300">{service.description}</p>
                
                <div className="flex items-center justify-between py-2 px-3 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-[#FF8C42]" />
                    <span className="text-sm font-medium text-gray-300">Price</span>
                  </div>
                  <span className="text-lg font-bold text-[#FF8C42]">₱{parseFloat(service.price).toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-[#FF8C42]" />
                    <span className="text-sm font-medium text-gray-300">Duration</span>
                  </div>
                  <span className="text-sm font-medium text-white">{service.duration_minutes} mins</span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-[#1A1A1A] rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-300">Status</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    service.is_active 
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {service.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#444444]/30">
                <button 
                  onClick={() => handleEdit(service)}
                  className="w-full px-3 py-2 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white rounded-lg hover:from-[#FF7A2B] hover:to-[#FF6B1A] transition-colors text-sm font-medium"
                >
                  Edit Service
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-gradient-to-br from-[#2A2A2A] to-[#333333] rounded-lg border border-[#444444]/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#444444]/30">
              <thead className="bg-gradient-to-r from-[#1A1A1A] to-[#2A2A2A]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#444444]/30">
                {filteredServices.map((service) => (
                  <tr key={service._id} className="hover:bg-[#333333]/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="p-2 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-lg mr-3">
                          <Scissors className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{service.name}</div>
                          <div className="text-sm text-gray-400 truncate max-w-xs">{service.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{service.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#FF8C42]">₱{parseFloat(service.price).toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{service.duration_minutes} mins</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        service.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 text-gray-400 hover:text-[#FF8C42] hover:bg-[#444444] rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-[#444444] rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredServices.length === 0 && (
        <div className="text-center py-12">
          <Scissors className="mx-auto h-12 w-12 text-gray-500" />
          <h3 className="mt-2 text-sm font-medium text-white">No services found</h3>
          <p className="mt-1 text-sm text-gray-400">
            {searchTerm 
              ? 'Try adjusting your search criteria.'
              : 'Get started by creating your first service.'
            }
          </p>
          {!searchTerm && (
            <div className="mt-6">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A]"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                New Service
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ServicesManagement