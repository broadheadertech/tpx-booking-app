import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  FileText, Users, Clock, CheckCircle, XCircle, AlertCircle,
  Search, Filter, Plus, Edit, Trash2, Eye, Phone, Mail,
  Calendar, MessageSquare, MoreVertical, ChevronDown, ChevronUp,
  Settings, Copy, ToggleLeft, ToggleRight, GripVertical,
  PlusCircle, MinusCircle, Save, X, ArrowRight, User
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../context/AuthContext'

const CustomBookingsManagement = ({ onRefresh, user }) => {
  const { sessionToken } = useAuth()
  const [activeTab, setActiveTab] = useState('submissions') // 'submissions' | 'forms'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedBarber, setSelectedBarber] = useState('all')
  const [showFormBuilder, setShowFormBuilder] = useState(false)
  const [editingForm, setEditingForm] = useState(null)
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [showSubmissionDetail, setShowSubmissionDetail] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showNotesModal, setShowNotesModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form builder state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    barber_id: '',
    fields: []
  })

  // Queries
  const submissions = user?.role === 'super_admin'
    ? useQuery(api.services.customBookingSubmissions.getAllSubmissions)
    : user?.branch_id
      ? useQuery(api.services.customBookingSubmissions.getSubmissionsByBranch, { branch_id: user.branch_id })
      : undefined

  const forms = user?.role === 'super_admin'
    ? useQuery(api.services.customBookingForms.getAllForms)
    : user?.branch_id
      ? useQuery(api.services.customBookingForms.getFormsByBranch, { branch_id: user.branch_id })
      : undefined

  const barbers = user?.role === 'super_admin'
    ? useQuery(api.services.barbers.getAllBarbers)
    : user?.branch_id
      ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
      : undefined

  const pendingCount = useQuery(
    api.services.customBookingSubmissions.getPendingCount,
    user?.branch_id && user?.role !== 'super_admin' ? { branch_id: user.branch_id } : {}
  )

  const statistics = useQuery(
    api.services.customBookingSubmissions.getStatistics,
    user?.branch_id && user?.role !== 'super_admin' ? { branch_id: user.branch_id } : {}
  )

  // Mutations
  const createForm = useMutation(api.services.customBookingForms.createForm)
  const updateForm = useMutation(api.services.customBookingForms.updateForm)
  const deleteForm = useMutation(api.services.customBookingForms.deleteForm)
  const toggleFormStatus = useMutation(api.services.customBookingForms.toggleFormStatus)
  const updateSubmissionStatus = useMutation(api.services.customBookingSubmissions.updateStatus)
  const addNotes = useMutation(api.services.customBookingSubmissions.addNotes)
  const deleteSubmission = useMutation(api.services.customBookingSubmissions.deleteSubmission)

  // Field types for form builder
  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Dropdown' },
    { value: 'multiselect', label: 'Multi-Select' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'date', label: 'Date Picker' },
    { value: 'date_range', label: 'Date Range' },
    { value: 'number', label: 'Number' }
  ]

  // Status configuration
  const statusConfig = {
    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertCircle },
    contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Phone },
    confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
    completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
    cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
  }

  // Filter submissions
  const filteredSubmissions = (submissions || []).filter(sub => {
    const matchesSearch =
      sub.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.customer_phone?.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus
    const matchesBarber = selectedBarber === 'all' || sub.barber_id === selectedBarber
    return matchesSearch && matchesStatus && matchesBarber
  })

  // Add new field to form
  const addField = () => {
    const newField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      placeholder: '',
      required: false,
      options: [],
      helpText: '',
      order: formData.fields.length
    }
    setFormData(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
  }

  // Update field
  const updateField = (fieldId, updates) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
    }))
  }

  // Remove field
  const removeField = (fieldId) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId)
    }))
  }

  // Move field up/down
  const moveField = (index, direction) => {
    const newFields = [...formData.fields]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= newFields.length) return

    [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]]
    newFields.forEach((f, i) => f.order = i)
    setFormData(prev => ({ ...prev, fields: newFields }))
  }

  // Save form
  const handleSaveForm = async () => {
    if (!formData.title.trim()) {
      setError('Form title is required')
      return
    }
    if (!formData.barber_id) {
      setError('Please select a barber')
      return
    }
    if (formData.fields.length === 0) {
      setError('Please add at least one field')
      return
    }

    // Validate all fields have labels
    const invalidFields = formData.fields.filter(f => !f.label.trim())
    if (invalidFields.length > 0) {
      setError('All fields must have a label')
      return
    }

    setLoading(true)
    setError('')

    try {
      if (editingForm) {
        await updateForm({
          sessionToken,
          id: editingForm._id,
          title: formData.title,
          description: formData.description,
          fields: formData.fields
        })
        setSuccess('Form updated successfully!')
      } else {
        await createForm({
          sessionToken,
          barber_id: formData.barber_id,
          branch_id: user.branch_id,
          title: formData.title,
          description: formData.description,
          fields: formData.fields
        })
        setSuccess('Form created successfully!')
      }

      setShowFormBuilder(false)
      setEditingForm(null)
      resetFormData()
    } catch (err) {
      setError(err.message || 'Failed to save form')
    } finally {
      setLoading(false)
    }
  }

  // Reset form data
  const resetFormData = () => {
    setFormData({
      title: '',
      description: '',
      barber_id: '',
      fields: []
    })
  }

  // Edit form
  const handleEditForm = (form) => {
    setFormData({
      title: form.title,
      description: form.description || '',
      barber_id: form.barber_id,
      fields: form.fields || []
    })
    setEditingForm(form)
    setShowFormBuilder(true)
  }

  // Delete form
  const handleDeleteForm = async (form) => {
    if (!confirm('Are you sure you want to delete this form? This cannot be undone.')) return

    setLoading(true)
    try {
      await deleteForm({ sessionToken, id: form._id })
      setSuccess('Form deleted successfully!')
    } catch (err) {
      setError(err.message || 'Failed to delete form')
    } finally {
      setLoading(false)
    }
  }

  // Toggle form status
  const handleToggleFormStatus = async (form) => {
    try {
      await toggleFormStatus({ sessionToken, id: form._id })
    } catch (err) {
      setError(err.message || 'Failed to toggle form status')
    }
  }

  // Update submission status
  const handleUpdateStatus = async () => {
    if (!selectedSubmission || !newStatus) return

    setLoading(true)
    try {
      await updateSubmissionStatus({
        sessionToken,
        id: selectedSubmission._id,
        status: newStatus
      })
      setSuccess('Status updated successfully!')
      setShowStatusModal(false)
      setNewStatus('')
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  // Add notes to submission
  const handleAddNotes = async () => {
    if (!selectedSubmission || !newNote.trim()) return

    setLoading(true)
    try {
      await addNotes({
        sessionToken,
        id: selectedSubmission._id,
        notes: newNote.trim()
      })
      setSuccess('Note added successfully!')
      setShowNotesModal(false)
      setNewNote('')
    } catch (err) {
      setError(err.message || 'Failed to add note')
    } finally {
      setLoading(false)
    }
  }

  // Delete submission
  const handleDeleteSubmission = async (submission) => {
    if (!confirm('Are you sure you want to delete this submission?')) return

    setLoading(true)
    try {
      await deleteSubmission({ sessionToken, id: submission._id })
      setSuccess('Submission deleted successfully!')
    } catch (err) {
      setError(err.message || 'Failed to delete submission')
    } finally {
      setLoading(false)
    }
  }

  // Clear messages
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  // Get barbers without custom booking form (for form builder)
  const availableBarbers = (barbers || []).filter(b =>
    !forms?.some(f => f.barber_id === b._id) || editingForm?.barber_id === b._id
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Custom Bookings</h2>
          <p className="text-gray-400 text-sm mt-1">
            Manage custom booking forms and submissions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-white mt-1">{statistics.total}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-yellow-400 text-xs uppercase tracking-wide">Pending</p>
            <p className="text-2xl font-bold text-yellow-400 mt-1">{statistics.pending}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-blue-400 text-xs uppercase tracking-wide">Contacted</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">{statistics.contacted}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-green-400 text-xs uppercase tracking-wide">Confirmed</p>
            <p className="text-2xl font-bold text-green-400 mt-1">{statistics.confirmed}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-emerald-400 text-xs uppercase tracking-wide">Completed</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{statistics.completed}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
            <p className="text-gray-400 text-xs uppercase tracking-wide">Conversion</p>
            <p className="text-2xl font-bold text-white mt-1">{statistics.conversionRate?.toFixed(1)}%</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-[#1A1A1A] p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'submissions'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Submissions ({filteredSubmissions.length})
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'forms'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Form Builder ({forms?.length || 0})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'submissions' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="contacted">Contacted</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={selectedBarber}
              onChange={(e) => setSelectedBarber(e.target.value)}
              className="px-4 py-2.5 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="all">All Barbers</option>
              {(barbers || []).map(barber => (
                <option key={barber._id} value={barber._id}>{barber.full_name}</option>
              ))}
            </select>
          </div>

          {/* Submissions List */}
          <div className="space-y-3">
            {filteredSubmissions.length === 0 ? (
              <div className="bg-[#1A1A1A] rounded-xl p-12 text-center border border-[#2A2A2A]">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No submissions found</p>
              </div>
            ) : (
              filteredSubmissions.map(submission => {
                const status = statusConfig[submission.status] || statusConfig.pending
                const StatusIcon = status.icon

                return (
                  <div
                    key={submission._id}
                    className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white truncate">
                            {submission.customer_name}
                          </h3>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
                          {submission.customer_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              {submission.customer_email}
                            </span>
                          )}
                          {submission.customer_phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5" />
                              {submission.customer_phone}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {submission.barber_name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(submission.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Form: {submission.form_title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedSubmission(submission)
                            setShowSubmissionDetail(true)
                          }}
                          className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubmission(submission)
                            setNewStatus(submission.status)
                            setShowStatusModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-all"
                          title="Update Status"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSubmission(submission)
                            setShowNotesModal(true)
                          }}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                          title="Add Notes"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteSubmission(submission)}
                          className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Form Builder Header */}
          <div className="flex justify-between items-center">
            <p className="text-gray-400 text-sm">
              Create custom booking forms for barbers with unique requirements
            </p>
            <button
              onClick={() => {
                resetFormData()
                setEditingForm(null)
                setShowFormBuilder(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Form
            </button>
          </div>

          {/* Forms List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(forms || []).length === 0 ? (
              <div className="col-span-full bg-[#1A1A1A] rounded-xl p-12 text-center border border-[#2A2A2A]">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">No custom booking forms created yet</p>
                <button
                  onClick={() => {
                    resetFormData()
                    setShowFormBuilder(true)
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Form
                </button>
              </div>
            ) : (
              forms.map(form => (
                <div
                  key={form._id}
                  className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A] hover:border-[#3A3A3A] transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{form.title}</h3>
                      <p className="text-sm text-gray-400">{form.barber_name}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      form.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {form.status}
                    </span>
                  </div>

                  {form.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {form.description}
                    </p>
                  )}

                  <div className="text-xs text-gray-500 mb-4">
                    {form.fields?.length || 0} fields
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-[#2A2A2A]">
                    <button
                      onClick={() => handleEditForm(form)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleFormStatus(form)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm rounded-lg transition-all ${
                        form.status === 'active'
                          ? 'text-yellow-400 hover:bg-yellow-400/10'
                          : 'text-green-400 hover:bg-green-400/10'
                      }`}
                    >
                      {form.status === 'active' ? (
                        <>
                          <ToggleRight className="w-3.5 h-3.5" />
                          Disable
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-3.5 h-3.5" />
                          Enable
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Form Builder Modal */}
      {showFormBuilder && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col border border-[#2A2A2A]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <h2 className="text-xl font-bold text-white">
                {editingForm ? 'Edit Custom Booking Form' : 'Create Custom Booking Form'}
              </h2>
              <button
                onClick={() => {
                  setShowFormBuilder(false)
                  setEditingForm(null)
                  resetFormData()
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Form Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Form Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g., Custom Haircut Booking"
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what this form is for..."
                    rows={2}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                  />
                </div>

                {!editingForm && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Select Barber *
                    </label>
                    <select
                      value={formData.barber_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, barber_id: e.target.value }))}
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:outline-none focus:border-[var(--color-primary)]"
                    >
                      <option value="">Choose a barber...</option>
                      {availableBarbers.map(barber => (
                        <option key={barber._id} value={barber._id}>
                          {barber.full_name}
                        </option>
                      ))}
                    </select>
                    {availableBarbers.length === 0 && (
                      <p className="text-sm text-yellow-400 mt-2">
                        All barbers already have custom booking forms
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Form Fields</h3>
                  <button
                    onClick={addField}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-lg transition-all"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Field
                  </button>
                </div>

                {formData.fields.length === 0 ? (
                  <div className="bg-[#1A1A1A] rounded-xl p-8 text-center border border-dashed border-[#3A3A3A]">
                    <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm mb-3">No fields added yet</p>
                    <button
                      onClick={addField}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] text-white rounded-lg hover:bg-[#3A3A3A] transition-all text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Your First Field
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col gap-1 pt-2">
                            <button
                              onClick={() => moveField(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveField(index, 'down')}
                              disabled={index === formData.fields.length - 1}
                              className="p-1 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="flex-1 grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Field Label *</label>
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => updateField(field.id, { label: e.target.value })}
                                placeholder="e.g., Mobile Number"
                                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Field Type</label>
                              <select
                                value={field.type}
                                onChange={(e) => updateField(field.id, { type: e.target.value })}
                                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                              >
                                {fieldTypes.map(ft => (
                                  <option key={ft.value} value={ft.value}>{ft.label}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Placeholder</label>
                              <input
                                type="text"
                                value={field.placeholder || ''}
                                onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                placeholder="Enter placeholder text..."
                                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>
                            <div className="flex items-center gap-4 pt-5">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={field.required}
                                  onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                  className="w-4 h-4 rounded border-gray-600 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                                />
                                <span className="text-sm text-gray-300">Required</span>
                              </label>
                            </div>

                            {/* Options for select/multiselect/radio/checkbox */}
                            {['select', 'multiselect', 'radio', 'checkbox'].includes(field.type) && (
                              <div className="col-span-2">
                                <label className="block text-xs text-gray-500 mb-1">
                                  Options (one per line)
                                </label>
                                <textarea
                                  value={(field.options || []).join('\n')}
                                  onChange={(e) => updateField(field.id, {
                                    options: e.target.value.split('\n')
                                  })}
                                  onBlur={(e) => updateField(field.id, {
                                    options: e.target.value.split('\n').filter(o => o.trim())
                                  })}
                                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                                  rows={3}
                                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
                                />
                              </div>
                            )}

                            <div className="col-span-2">
                              <label className="block text-xs text-gray-500 mb-1">Help Text (optional)</label>
                              <input
                                type="text"
                                value={field.helpText || ''}
                                onChange={(e) => updateField(field.id, { helpText: e.target.value })}
                                placeholder="Additional instructions for this field..."
                                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)]"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => removeField(field.id)}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  setShowFormBuilder(false)
                  setEditingForm(null)
                  resetFormData()
                }}
                className="px-6 py-2.5 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingForm ? 'Update Form' : 'Create Form'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Submission Detail Modal */}
      {showSubmissionDetail && selectedSubmission && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-[#2A2A2A]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <h2 className="text-xl font-bold text-white">Submission Details</h2>
              <button
                onClick={() => {
                  setShowSubmissionDetail(false)
                  setSelectedSubmission(null)
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Customer Info */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Customer Information</h3>
                <div className="space-y-2">
                  <p className="text-white font-medium">{selectedSubmission.customer_name}</p>
                  {selectedSubmission.customer_email && (
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {selectedSubmission.customer_email}
                    </p>
                  )}
                  {selectedSubmission.customer_phone && (
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {selectedSubmission.customer_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Submission Info */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Submission Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Barber</p>
                    <p className="text-white">{selectedSubmission.barber_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Form</p>
                    <p className="text-white">{selectedSubmission.form_title}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Submitted</p>
                    <p className="text-white">
                      {new Date(selectedSubmission.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${statusConfig[selectedSubmission.status]?.color}`}>
                      {statusConfig[selectedSubmission.status]?.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Responses */}
              <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Form Responses</h3>
                <div className="space-y-3">
                  {selectedSubmission.form_fields?.map(field => {
                    const response = selectedSubmission.responses?.[field.id]
                    return (
                      <div key={field.id} className="border-b border-[#2A2A2A] pb-3 last:border-0 last:pb-0">
                        <p className="text-xs text-gray-500 mb-1">{field.label}</p>
                        <p className="text-white text-sm">
                          {Array.isArray(response)
                            ? response.join(', ')
                            : response || <span className="text-gray-500 italic">Not provided</span>
                          }
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedSubmission.notes && (
                <div className="bg-[#1A1A1A] rounded-xl p-4 border border-[#2A2A2A]">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Notes</h3>
                  <pre className="text-sm text-white whitespace-pre-wrap font-sans">
                    {selectedSubmission.notes}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  setShowSubmissionDetail(false)
                  setNewStatus(selectedSubmission.status)
                  setShowStatusModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4" />
                Update Status
              </button>
              <button
                onClick={() => {
                  setShowSubmissionDetail(false)
                  setShowNotesModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                Add Note
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Update Modal */}
      {showStatusModal && selectedSubmission && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-md border border-[#2A2A2A]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <h2 className="text-lg font-bold text-white">Update Status</h2>
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setNewStatus('')
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Update status for <span className="text-white font-medium">{selectedSubmission.customer_name}</span>
              </p>

              <div className="space-y-2">
                {Object.entries(statusConfig).map(([value, config]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      newStatus === value
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[#2A2A2A] hover:border-[#3A3A3A]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={value}
                      checked={newStatus === value}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="hidden"
                    />
                    <config.icon className={`w-5 h-5 ${newStatus === value ? 'text-[var(--color-primary)]' : 'text-gray-500'}`} />
                    <span className={`font-medium ${newStatus === value ? 'text-white' : 'text-gray-400'}`}>
                      {config.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  setShowStatusModal(false)
                  setNewStatus('')
                }}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={loading || newStatus === selectedSubmission.status}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Update Status
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add Notes Modal */}
      {showNotesModal && selectedSubmission && createPortal(
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-[#0A0A0A] rounded-2xl w-full max-w-md border border-[#2A2A2A]">
            <div className="flex items-center justify-between p-6 border-b border-[#2A2A2A]">
              <h2 className="text-lg font-bold text-white">Add Note</h2>
              <button
                onClick={() => {
                  setShowNotesModal(false)
                  setNewNote('')
                }}
                className="p-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-400 text-sm">
                Add a note for <span className="text-white font-medium">{selectedSubmission.customer_name}</span>
              </p>

              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note here..."
                rows={4}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-[#2A2A2A]">
              <button
                onClick={() => {
                  setShowNotesModal(false)
                  setNewNote('')
                }}
                className="px-4 py-2 text-gray-400 hover:text-white hover:bg-[#2A2A2A] rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNotes}
                disabled={loading || !newNote.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl hover:bg-[var(--color-primary)]/90 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <MessageSquare className="w-4 h-4" />
                )}
                Add Note
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default CustomBookingsManagement
