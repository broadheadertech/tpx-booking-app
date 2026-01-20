import React, { useState } from 'react'
import { UserPlus, Search, Filter, Plus, Clock, User, Phone, Calendar } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import AddWalkInModal from './AddWalkInModal'

export default function WalkInSection() {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  // Get walk-ins data from API
  const walkIns = useQuery(api.services.walkIn.getAllWalkIns) || []

  const filteredWalkIns = walkIns
    .filter(walkIn => {
      const matchesSearch =
        walkIn.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        walkIn.number?.includes(searchTerm) ||
        walkIn.assignedBarber?.toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const stats = {
    total: walkIns.length,
    today: walkIns.filter(w => {
      const today = new Date().toDateString()
      return new Date(w.createdAt).toDateString() === today
    }).length
  }

  const formatDateTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex items-center space-x-3">
          <UserPlus className="h-6 w-6 text-[var(--color-primary)]" />
          <div>
            <h3 className="text-lg font-semibold text-white">Walk-ins</h3>
            <p className="text-sm text-gray-400">Manage walk-in customers</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Total Walk-ins</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <UserPlus className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-300">Today</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.today}</p>
            </div>
            <Clock className="h-6 w-6 text-[var(--color-primary)] opacity-30" />
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
                placeholder="Search walk-ins..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Walk-in</span>
          </button>
        </div>
      </div>

      {/* Walk-ins Table */}
      <div className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#444444]/30">
            <thead className="bg-[#0A0A0A]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Phone Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Assigned Barber
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-[#1A1A1A] divide-y divide-[#444444]/30">
              {filteredWalkIns.map((walkIn) => (
                <tr key={walkIn._id} className="hover:bg-[#333333]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center">
                          <User className="h-5 w-5 text-[var(--color-primary)]" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {walkIn.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-white">
                      <Phone className="h-4 w-4 mr-2 text-gray-500" />
                      {walkIn.number}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">
                      {walkIn.assignedBarber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-white">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {formatDateTime(walkIn.createdAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      className="text-blue-400 hover:text-blue-300 transition-colors"
                      title="Edit walk-in"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredWalkIns.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="mx-auto h-12 w-12 text-gray-500" />
            <h3 className="mt-2 text-sm font-medium text-white">No walk-ins found</h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchTerm
                ? 'Try adjusting your search criteria.'
                : 'Get started by adding a walk-in customer.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add Walk-in Modal */}
      <AddWalkInModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}
