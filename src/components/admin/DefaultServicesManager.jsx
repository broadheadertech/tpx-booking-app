import React, { useState, useEffect } from 'react'
import { Scissors, Clock, DollarSign, Search, Plus, Edit, Trash2, RotateCcw, Save, X, Sparkles } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const CATEGORIES = [
  { value: 'haircut', label: 'Haircut' },
  { value: 'beard-care', label: 'Beard Care' },
  { value: 'hair-treatment', label: 'Hair Treatment' },
  { value: 'hair-styling', label: 'Hair Styling' },
  { value: 'premium-package', label: 'Premium Package' },
  { value: 'other', label: 'Other' },
]

export default function DefaultServicesManager() {
  const services = useQuery(api.services.defaultServices.getAllDefaultServices) || []
  const createService = useMutation(api.services.defaultServices.createDefaultService)
  const updateService = useMutation(api.services.defaultServices.updateDefaultService)
  const deleteService = useMutation(api.services.defaultServices.deleteDefaultService)
  const seedDefaults = useMutation(api.services.defaultServices.seedDefaultServices)

  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_minutes: '',
    category: 'haircut',
    is_active: true,
    hide_price: false,
  })

  const filteredServices = services
    .filter(s =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))

  const stats = {
    total: services.length,
    active: services.filter(s => s.is_active).length,
    avgPrice: services.length ? services.reduce((sum, s) => sum + s.price, 0) / services.length : 0,
    avgDuration: services.length ? services.reduce((sum, s) => sum + s.duration_minutes, 0) / services.length : 0,
  }

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', duration_minutes: '', category: 'haircut', is_active: true, hide_price: false })
    setEditingService(null)
    setShowForm(false)
    setError('')
  }

  const handleEdit = (service) => {
    setEditingService(service)
    setFormData({
      name: service.name,
      description: service.description,
      price: service.price.toString(),
      duration_minutes: service.duration_minutes.toString(),
      category: service.category,
      is_active: service.is_active,
      hide_price: service.hide_price || false,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.price || !formData.duration_minutes) {
      setError('Name, price, and duration are required')
      return
    }

    setLoading(true)
    setError('')
    try {
      if (editingService) {
        await updateService({
          id: editingService._id,
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          category: formData.category,
          is_active: formData.is_active,
          hide_price: formData.hide_price,
        })
        setSuccess('Service updated')
      } else {
        await createService({
          name: formData.name.trim(),
          description: formData.description.trim() || 'No description yet.',
          price: parseFloat(formData.price),
          duration_minutes: parseInt(formData.duration_minutes),
          category: formData.category,
          is_active: formData.is_active,
          hide_price: formData.hide_price,
          sort_order: services.length,
        })
        setSuccess('Service added')
      }
      resetForm()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (service) => {
    if (!confirm(`Delete "${service.name}" from default services?`)) return
    try {
      await deleteService({ id: service._id })
      setSuccess('Service deleted')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err.message || 'Failed to delete')
    }
  }

  const handleSeedDefaults = async () => {
    setLoading(true)
    try {
      const result = await seedDefaults()
      if (result.success) {
        setSuccess(result.message)
      } else {
        setError(result.message)
      }
      setTimeout(() => { setSuccess(''); setError('') }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to seed defaults')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Default Services</h2>
          <p className="text-sm text-gray-400">Template services auto-added when creating new branches</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-sm">{success}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50">
          <p className="text-xs font-medium text-gray-400">Total</p>
          <p className="text-xl font-bold text-[var(--color-primary)]">{stats.total}</p>
        </div>
        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50">
          <p className="text-xs font-medium text-gray-400">Active</p>
          <p className="text-xl font-bold text-green-400">{stats.active}</p>
        </div>
        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50">
          <p className="text-xs font-medium text-gray-400">Avg Price</p>
          <p className="text-xl font-bold text-[var(--color-primary)]">₱{stats.avgPrice.toFixed(0)}</p>
        </div>
        <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50">
          <p className="text-xs font-medium text-gray-400">Avg Duration</p>
          <p className="text-xl font-bold text-[var(--color-primary)]">{Math.round(stats.avgDuration)}m</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-3.5 rounded-lg border border-[#2A2A2A]/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white placeholder-gray-500 rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm w-full sm:w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            {services.length === 0 && (
              <button
                onClick={handleSeedDefaults}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md hover:bg-purple-500/30 transition-colors text-sm"
              >
                <Sparkles className="h-4 w-4" />
                <span>Load Defaults</span>
              </button>
            )}
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-md hover:brightness-110 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-[#1A1A1A] rounded-lg border border-[var(--color-primary)]/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{editingService ? 'Edit Service' : 'Add Default Service'}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Service Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  placeholder="e.g. Classic Haircut"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Price (₱) *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Duration (mins) *</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                  placeholder="30"
                  min="0"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 bg-[#2A2A2A] border border-[#3A3A3A] text-white rounded-md focus:ring-2 focus:ring-[var(--color-primary)] text-sm"
                rows={2}
                placeholder="Service description..."
              />
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded border-[#3A3A3A] bg-[#2A2A2A] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-gray-300">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hide_price}
                  onChange={(e) => setFormData({ ...formData, hide_price: e.target.checked })}
                  className="rounded border-[#3A3A3A] bg-[#2A2A2A] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-gray-300">Hide Price</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-[#2A2A2A] text-gray-300 rounded-md hover:bg-[#333333] text-sm border border-[#3A3A3A]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-md hover:brightness-110 text-sm disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {loading ? 'Saving...' : editingService ? 'Update' : 'Add Service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Services Table */}
      {filteredServices.length > 0 ? (
        <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#2A2A2A]">
              <thead className="bg-[#0A0A0A]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Service</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Duration</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2A2A2A]">
                {filteredServices.map((service) => (
                  <tr key={service._id} className="hover:bg-[#2A2A2A]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-md">
                          <Scissors className="h-3.5 w-3.5 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{service.name}</div>
                          <div className="text-xs text-gray-500 truncate max-w-xs">{service.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-300 bg-[#2A2A2A] px-2 py-1 rounded">{service.category}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${service.hide_price ? 'text-gray-500' : 'text-[var(--color-primary)]'}`}>
                        {service.hide_price ? 'Hidden' : `₱${service.price.toFixed(0)}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{service.duration_minutes}m</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        service.is_active
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {service.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-1.5 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[#333333] rounded-md transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#333333] rounded-md transition-colors"
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
      ) : (
        <div className="text-center py-12 bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50">
          <Scissors className="mx-auto h-12 w-12 text-gray-600" />
          <h3 className="mt-2 text-sm font-medium text-white">No default services</h3>
          <p className="mt-1 text-sm text-gray-400">
            {searchTerm ? 'No services match your search.' : 'Add services or load the default template.'}
          </p>
          {!searchTerm && (
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={handleSeedDefaults}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-md hover:bg-purple-500/30 text-sm"
              >
                <Sparkles className="h-4 w-4" />
                Load Defaults
              </button>
              <button
                onClick={() => { resetForm(); setShowForm(true) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-md hover:brightness-110 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Manually
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
