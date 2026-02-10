import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { User, Star, Clock, Calendar, DollarSign, Search, Filter, UserCheck, UserX, Phone, Mail, Scissors, Plus, Edit, Trash2, RotateCcw, Eye, BookOpen, X, Save, Camera, Upload } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import CreateBarberModal from './CreateBarberModal'
import BarberModal from './BarberModal'
import { useAppModal } from '../../context/AppModalContext'

// Separate component to handle barber avatar display
const BarberAvatar = ({ barber, className = "w-12 h-12" }) => {
  const [imageError, setImageError] = useState(false)

  // Get image URL from Convex storage if available (pass undefined if no storageId)
  const imageUrlFromStorage = useQuery(api.services.barbers.getImageUrl, {
    storageId: barber.avatarStorageId
  })

  // Use storage URL if available, otherwise fallback to regular avatar or default
  const imageSrc = imageUrlFromStorage || barber.avatarUrl || '/img/avatar_default.jpg'

  if (imageError || !imageSrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 rounded-full ${className}`}>
        <User className="w-6 h-6 text-gray-500" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={`${barber.full_name} avatar`}
      className={`${className} rounded-full object-cover`}
      onError={() => setImageError(true)}
    />
  )
}

const BarbersManagement = ({ barbers = [], onRefresh, user }) => {
  const { showAlert } = useAppModal()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [selectedBarber, setSelectedBarber] = useState(null)
  const [initialView, setInitialView] = useState('details')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingBarber, setEditingBarber] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  // Convex queries - with pagination limits to avoid byte limit errors
  // Get services filtered by branch to avoid showing duplicates from other branches
  const services = user?.role === 'super_admin'
    ? useQuery(api.services.services.getAllServices)
    : user?.branch_id
      ? useQuery(api.services.services.getServicesByBranch, { branch_id: user.branch_id })
      : undefined
  const allBookingsData = useQuery(api.services.bookings.getAllBookings, { limit: 100 })
  const allBookings = allBookingsData?.bookings || []

  // Convex mutations
  const createBarber = useMutation(api.services.barbers.createBarber)
  const updateBarber = useMutation(api.services.barbers.updateBarber)
  const deleteBarber = useMutation(api.services.barbers.deleteBarber)
  const generateUploadUrl = useMutation(api.services.barbers.generateUploadUrl)

  // Image upload function using Convex storage
  const handleImageUpload = async (file) => {
    setUploadingImage(true)
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()

      // Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!result.ok) {
        throw new Error('Failed to upload image')
      }

      const { storageId } = await result.json()
      return storageId
    } catch (error) {
      console.error('Image upload failed:', error)
      throw error
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageSelect = async (event, barberId) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showAlert({ title: 'Invalid File', message: 'Please select an image file', type: 'warning' })
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showAlert({ title: 'File Too Large', message: 'File size must be less than 5MB', type: 'warning' })
      return
    }

    try {
      const storageId = await handleImageUpload(file)
      await updateBarber({
        id: barberId,
        avatarStorageId: storageId
      })
      onRefresh()
    } catch (error) {
      showAlert({ title: 'Upload Failed', message: 'Failed to upload image. Please try again.', type: 'error' })
    }
  }

  const getStatusConfig = (isActive) => {
    if (isActive) {
      return {
        label: 'Active',
        icon: UserCheck,
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200',
        iconColor: 'text-green-500'
      }
    } else {
      return {
        label: 'Inactive',
        icon: UserX,
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        iconColor: 'text-red-500'
      }
    }
  }

  const filteredBarbers = barbers
    .filter(barber => {
      const matchesSearch =
        barber.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        barber.specialties?.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesFilter = true
      if (filterStatus === 'active') {
        matchesFilter = barber.is_active === true
      } else if (filterStatus === 'inactive') {
        matchesFilter = barber.is_active === false
      }

      return matchesSearch && matchesFilter
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '')
      if (sortBy === 'rating') return parseFloat(b.rating || 0) - parseFloat(a.rating || 0)
      if (sortBy === 'bookings') return (b.totalBookings || 0) - (a.totalBookings || 0)
      return (a._id || '').localeCompare(b._id || '')
    })

  const stats = {
    total: barbers.length,
    active: barbers.filter(b => b.is_active === true).length,
    inactive: barbers.filter(b => b.is_active === false).length,
    avgRating: barbers.length ? barbers.reduce((sum, b) => sum + (b.rating || 0), 0) / barbers.length : 0
  }

  const getWorkingDays = (schedule) => {
    return Object.values(schedule || {}).filter(day => day.available).length
  }


  const handleCreate = () => {
    setEditingBarber(null)
    setShowCreateModal(true)
  }

  const handleEdit = (barber) => {
    setEditingBarber(barber)
    setShowCreateModal(true)
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingBarber(null)
  }

  const handleModalSubmit = () => {
    setShowCreateModal(false)
    setEditingBarber(null)
    onRefresh()
  }

  const handleDelete = async (barber) => {
    setLoading(true)
    try {
      await deleteBarber({ id: barber._id })
      setShowDeleteConfirm(null)
      onRefresh()
    } catch (err) {
      setError(err.message || 'Failed to delete barber')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (barber) => {
    setSelectedBarber(barber)
    setInitialView('details')
  }

  const handleViewBookings = (barber) => {
    setSelectedBarber(barber)
    setInitialView('bookings')
  }





  const DeleteConfirmModal = ({ barber, onClose, onConfirm }) => (
    <div
      className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-[99997] p-2 sm:p-4 transition-all duration-300 ease-in-out animate-in fade-in-0"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-xl max-w-md w-full p-4 sm:p-6 shadow-2xl transform transition-all duration-300 ease-out animate-in slide-in-from-bottom-4 fade-in-0 zoom-in-95 mx-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Barber</h3>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{barber.full_name}</strong>? This will permanently remove the barber from the system.
        </p>
        <div className="flex flex-col-reverse sm:flex-row justify-end space-y-reverse space-y-3 sm:space-y-0 sm:space-x-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <User className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Active</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.active}</p>
            </div>
            <UserCheck className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Inactive</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.inactive}</p>
            </div>
            <UserX className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Avg Rating</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.avgRating.toFixed(1)}</p>
            </div>
            <Star className="h-8 w-8 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search barbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="rating">Sort by Rating</option>
              <option value="bookings">Sort by Bookings</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Barber</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Barber Modal */}
      <CreateBarberModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        editingBarber={editingBarber}
        services={services} // Pass services prop here
      />

      {/* Barbers Table */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Barber</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Schedule</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#444444]/30">
              {filteredBarbers.map((barber) => {
                const statusConfig = getStatusConfig(barber.is_active)
                const StatusIcon = statusConfig.icon
                const scheduleType = barber.schedule_type || 'weekly'
                let scheduleDisplay = ''
                let scheduleLabel = ''

                if (scheduleType === 'specific_dates') {
                  const dateCount = barber.specific_dates?.length || 0
                  scheduleDisplay = `${dateCount} Dates`
                  scheduleLabel = 'Scheduled'
                } else {
                  const workingDays = getWorkingDays(barber.schedule || {})
                  scheduleDisplay = `${workingDays}/week`
                  scheduleLabel = 'Working days'
                }

                return (
                  <tr key={barber._id} className="hover:bg-[#333333]/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="relative flex-shrink-0 h-10 w-10">
                          <BarberAvatar
                            barber={barber}
                            className="h-10 w-10 border-2 border-[var(--color-primary)]/50"
                          />
                          {/* Image upload overlay */}
                          <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer group">
                            <label className="cursor-pointer">
                              <Camera className="h-4 w-4 text-white" />
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageSelect(e, barber._id)}
                                className="hidden"
                                disabled={uploadingImage}
                              />
                            </label>
                          </div>
                          {uploadingImage && (
                            <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{barber.full_name}</div>
                          <div className="text-sm text-gray-400">{barber.experience}</div>
                          <div className="flex items-center space-x-1 mt-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            <span className="text-xs text-gray-400">{barber.rating || 0}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{barber.email}</div>
                      <div className="text-sm text-gray-400">{barber.phone || 'N/A'}</div>
                      <div className="text-xs text-gray-500 mt-1">{barber.specialties?.length || 0} specialties</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">{scheduleDisplay}</div>
                      <div className="text-sm text-gray-400">{scheduleLabel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                        <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.iconColor}`} />
                        {statusConfig.label}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(barber)}
                          className="text-[var(--color-primary)] hover:text-[var(--color-accent)] p-1 rounded"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewBookings(barber)}
                          className="text-blue-400 hover:text-blue-300 p-1 rounded"
                          title="View Bookings"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(barber)}
                          className="text-gray-400 hover:text-gray-300 p-1 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {(user?.role === 'branch_admin' || user?.role === 'super_admin') && (
                          <button
                            onClick={() => setShowDeleteConfirm(barber)}
                            className="text-red-400 hover:text-red-300 p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredBarbers.length === 0 && (
        <div className="text-center py-12">
          <Scissors className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No barbers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by creating a new barber profile.'
            }
          </p>
        </div>
      )}

      {/* Barber Modal */}
      {selectedBarber && (
        <BarberModal
          isOpen={!!selectedBarber}
          onClose={() => {
            setSelectedBarber(null)
            setInitialView('details')
          }}
          barber={selectedBarber}
          services={services}
          onRefresh={onRefresh}
          initialView={initialView}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <DeleteConfirmModal
          barber={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
        />
      )}
    </div>
  )
}

export default BarbersManagement