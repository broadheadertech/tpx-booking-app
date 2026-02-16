import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  User, Mail, Phone, Star, Save, X, Camera, Award,
  Clock, LogOut, Briefcase, ChevronRight, Shield,
  AlertCircle, CheckCircle2, Plus, FileText, Users
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'
import { normalizeCerts, certToSchemaFormat } from '../../utils/certifications'
import CertificationTag from '../common/CertificationTag'
import CertificationLightbox from '../common/CertificationLightbox'

const BarberProfile = () => {
  const { showConfirm } = useAppModal()
  const { user, logout } = useCurrentUser()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const fileInputRef = useRef(null)

  // Listen for edit toggle from header
  const handleToggleEdit = useCallback(() => {
    setIsEditing(prev => !prev)
  }, [])

  useEffect(() => {
    window.addEventListener('toggleBarberProfileEdit', handleToggleEdit)
    return () => {
      window.removeEventListener('toggleBarberProfileEdit', handleToggleEdit)
    }
  }, [handleToggleEdit])

  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    experience: '',
    specialties: [],
    bio: '',
    avatar: '',
    years_of_experience: '',
    certifications: [],
  })
  const [newSpecialty, setNewSpecialty] = useState('')
  const [newCertification, setNewCertification] = useState('')
  const [selectedCert, setSelectedCert] = useState(null)
  const certFileInputRef = useRef(null)
  const [uploadingCertIndex, setUploadingCertIndex] = useState(null)

  // Get barber data
  const barbers = user?.branch_id
    ? useQuery(api.services.barbers.getBarbersByBranch, { branch_id: user.branch_id })
    : useQuery(api.services.barbers.getAllBarbers)
  const currentBarber = barbers?.find(barber => barber.user === user?._id)

  // Mutations
  const updateUserProfile = useMutation(api.services.auth.updateUserProfile)
  const updateBarberMutation = useMutation(api.services.barbers.updateBarber)
  const submitBioForReview = useMutation(api.services.barbers.submitBioForReview)
  const createBarberProfile = useMutation(api.services.barbers.createBarberProfile)
  const generateUploadUrl = useMutation(api.services.barbers.generateUploadUrl)
  const getImageUrl = useQuery(
    api.services.barbers.getImageUrl,
    currentBarber?.avatarStorageId ? { storageId: currentBarber.avatarStorageId } : "skip"
  )
  const bioStats = useQuery(
    api.services.barbers.getBarberBioStats,
    currentBarber?._id ? { barber_id: currentBarber._id } : "skip"
  )

  // Auto-create barber profile
  useEffect(() => {
    if (user?.role === 'barber' && barbers && !currentBarber && user._id && user.branch_id) {
      createBarberProfile({ userId: user._id, branch_id: user.branch_id })
        .catch(console.error)
    }
  }, [user, barbers, currentBarber, createBarberProfile])

  // Initialize form when barber data loads
  useEffect(() => {
    if (currentBarber && user) {
      setEditForm({
        full_name: currentBarber.full_name || '',
        email: currentBarber.email || user.email || '',
        phone: currentBarber.phone || user.mobile_number || '',
        experience: currentBarber.experience || '',
        specialties: currentBarber.specialties || [],
        bio: currentBarber.bio || '',
        avatar: getImageUrl || currentBarber.avatar || '',
        years_of_experience: currentBarber.years_of_experience ?? '',
        certifications: normalizeCerts(currentBarber.certifications),
      })
    }
  }, [currentBarber, user, getImageUrl])

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }))
  }

  const addSpecialty = () => {
    if (newSpecialty.trim() && !editForm.specialties.includes(newSpecialty.trim())) {
      setEditForm(prev => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty.trim()]
      }))
      setNewSpecialty('')
    }
  }

  const removeSpecialty = (specialty) => {
    setEditForm(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s !== specialty)
    }))
  }

  const addCertification = () => {
    if (newCertification.trim() && !editForm.certifications.some(c => c.name === newCertification.trim())) {
      setEditForm(prev => ({
        ...prev,
        certifications: [...prev.certifications, { name: newCertification.trim(), imageId: null }]
      }))
      setNewCertification('')
    }
  }

  const removeCertification = (certName) => {
    setEditForm(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c.name !== certName)
    }))
  }

  const handleCertImageUpload = async (e, certIndex) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file')
      setShowErrorModal(true)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be less than 5MB')
      setShowErrorModal(true)
      return
    }
    setUploadingCertIndex(certIndex)
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })
      if (!response.ok) throw new Error('Upload failed')
      const { storageId } = await response.json()
      setEditForm(prev => ({
        ...prev,
        certifications: prev.certifications.map((c, i) =>
          i === certIndex ? { ...c, imageId: storageId } : c
        )
      }))
    } catch (error) {
      console.error('Cert image upload error:', error)
      setErrorMessage('Failed to upload certification image.')
      setShowErrorModal(true)
    } finally {
      setUploadingCertIndex(null)
      if (certFileInputRef.current) certFileInputRef.current.value = ''
    }
  }

  // Handle avatar upload
  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select an image file')
      setShowErrorModal(true)
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be less than 5MB')
      setShowErrorModal(true)
      return
    }

    setIsUploading(true)
    try {
      // Get upload URL from Convex
      const uploadUrl = await generateUploadUrl()

      // Upload to Convex storage
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!response.ok) throw new Error('Upload failed')

      const { storageId } = await response.json()

      // Update barber with new avatar storage ID
      if (currentBarber?._id) {
        await updateBarberMutation({
          id: currentBarber._id,
          avatarStorageId: storageId,
        })
      }

      // Show preview immediately
      const previewUrl = URL.createObjectURL(file)
      setEditForm(prev => ({ ...prev, avatar: previewUrl }))

    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage('Failed to upload image. Please try again.')
      setShowErrorModal(true)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (currentBarber?._id) {
        // Save basic profile fields directly (no approval)
        await updateBarberMutation({
          id: currentBarber._id,
          full_name: editForm.full_name,
          email: editForm.email,
          phone: editForm.phone,
          experience: editForm.experience,
        })

        // Submit bio fields through approval workflow
        const bioChanged = editForm.bio !== (currentBarber.bio || '')
        const currentCertsNormalized = normalizeCerts(currentBarber.certifications).map(certToSchemaFormat)
        const editCertsFormatted = editForm.certifications.map(certToSchemaFormat)
        const certsChanged = JSON.stringify(editCertsFormatted) !== JSON.stringify(currentCertsNormalized)
        const specialtiesChanged = JSON.stringify(editForm.specialties) !== JSON.stringify(currentBarber.specialties || [])
        const yearsChanged = editForm.years_of_experience !== '' &&
          Number(editForm.years_of_experience) !== (currentBarber.years_of_experience ?? undefined)

        if (bioChanged || certsChanged || specialtiesChanged || yearsChanged) {
          const bioArgs = { barber_id: currentBarber._id }
          if (specialtiesChanged) bioArgs.specialties = editForm.specialties
          if (yearsChanged) bioArgs.years_of_experience = Number(editForm.years_of_experience)
          if (bioChanged) bioArgs.bio = editForm.bio
          if (certsChanged) bioArgs.certifications = editCertsFormatted

          const result = await submitBioForReview(bioArgs)
          if (result?.hasPendingChanges) {
            setIsEditing(false)
            setShowSuccessModal(true)
            setTimeout(() => setShowSuccessModal(false), 3000)
            return
          }
        }
      }

      setIsEditing(false)
      setShowSuccessModal(true)
      setTimeout(() => setShowSuccessModal(false), 2000)
    } catch (error) {
      console.error('Failed to update profile:', error)
      setErrorMessage(error.message || 'Failed to update profile')
      setShowErrorModal(true)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (currentBarber && user) {
      setEditForm({
        full_name: currentBarber.full_name || '',
        email: currentBarber.email || user.email || '',
        phone: currentBarber.phone || user.mobile_number || '',
        experience: currentBarber.experience || '',
        specialties: currentBarber.specialties || [],
        bio: currentBarber.bio || '',
        avatar: getImageUrl || currentBarber.avatar || '',
        years_of_experience: currentBarber.years_of_experience ?? '',
        certifications: normalizeCerts(currentBarber.certifications),
      })
    }
    setIsEditing(false)
  }

  const getInitials = (name) => {
    return name?.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2) || 'U'
  }

  const handleLogout = async () => {
    const confirmed = await showConfirm({ title: 'Logout', message: 'Are you sure you want to logout?', type: 'warning', confirmText: 'Logout' })
    if (!confirmed) return
    try {
      await logout()
      window.location.href = '/auth/login'
    } catch (error) {
      window.location.href = '/auth/login'
    }
  }

  // Get the display avatar URL
  const displayAvatar = getImageUrl || currentBarber?.avatar || editForm.avatar

  // Loading state
  if (barbers === undefined) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-primary)] border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!currentBarber) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-[var(--color-primary)] border-t-transparent mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Setting up profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] pb-24">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Profile Content */}
      <div className="px-4 pt-4 space-y-4">
        {/* Avatar and Basic Info */}
        <div className="bg-[#1A1A1A] rounded-2xl p-5 border border-[#2A2A2A]">
          {/* Save/Cancel buttons when editing */}
          {isEditing && (
            <div className="flex items-center justify-end space-x-2 mb-4">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-[#2A2A2A] rounded-lg text-gray-400 text-sm hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-[var(--color-primary)] rounded-lg text-white text-sm font-medium disabled:opacity-50 flex items-center space-x-1"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Avatar and Info Row */}
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                onClick={handleAvatarClick}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 border-[#2A2A2A] ${isEditing ? 'cursor-pointer' : ''}`}
              >
                {isUploading ? (
                  <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-[var(--color-primary)] border-t-transparent"></div>
                  </div>
                ) : displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#2A2A2A] flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-500">
                      {getInitials(editForm.full_name || user?.username)}
                    </span>
                  </div>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={handleAvatarClick}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-[var(--color-primary)] text-white rounded-lg shadow-lg disabled:opacity-50"
                >
                  <Camera className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  className="text-lg font-bold text-white bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-1.5 focus:border-[var(--color-primary)] focus:outline-none w-full mb-2"
                  placeholder="Full Name"
                />
              ) : (
                <h2 className="text-lg font-bold text-white mb-1 truncate">{currentBarber.full_name}</h2>
              )}

              <div className="flex items-center flex-wrap gap-2 text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 text-[var(--color-primary)] fill-[var(--color-primary)]" />
                  <span className="text-white font-medium">{currentBarber.rating || 0}</span>
                  <span className="text-gray-500">/5</span>
                </div>
                <span className="text-gray-600">&bull;</span>
                <span className="text-gray-400">{currentBarber.totalBookings || 0} bookings</span>
                <span className="text-gray-600">&bull;</span>
                <div className="flex items-center space-x-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${currentBarber.is_active ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-400">{currentBarber.is_active ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio Approval Status Banner */}
          {currentBarber.bio_approval_status === 'pending' && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <p className="text-amber-400 text-xs">Your bio changes are pending admin review.</p>
            </div>
          )}
          {currentBarber.bio_approval_status === 'rejected' && (
            <div className="mt-4 flex items-start gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 text-xs font-medium">Bio changes rejected.</p>
                {currentBarber.bio_rejection_reason && (
                  <p className="text-red-400/70 text-xs mt-0.5">Reason: {currentBarber.bio_rejection_reason}</p>
                )}
              </div>
            </div>
          )}

          {/* About Me */}
          <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                About Me
                {currentBarber.bio_approval_status === 'approved' && (
                  <CheckCircle2 className="w-3 h-3 text-green-400" />
                )}
              </label>
              {isEditing && (
                <span className={`text-xs ${(editForm.bio?.length || 0) > 200 ? 'text-red-400' : 'text-gray-500'}`}>
                  {editForm.bio?.length || 0}/200
                </span>
              )}
            </div>
            {isEditing ? (
              <textarea
                value={editForm.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                maxLength={200}
                className="w-full p-3 bg-[#2A2A2A] border border-[#3A3A3A] rounded-xl text-white text-sm resize-none focus:outline-none focus:border-[var(--color-primary)]"
                rows="2"
                placeholder="Write a short bio about yourself..."
              />
            ) : (
              <p className="text-gray-400 text-sm">{currentBarber?.bio || 'No bio added yet'}</p>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] text-center">
            <p className="text-xl font-bold text-white">{currentBarber.totalBookings || 0}</p>
            <p className="text-xs text-gray-500">Total Jobs</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] text-center">
            <p className="text-xl font-bold text-[var(--color-primary)]">{currentBarber.rating || 0}</p>
            <p className="text-xs text-gray-500">Rating</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] text-center">
            <p className="text-xl font-bold text-blue-400">{bioStats?.repeatClientPercentage ?? 0}%</p>
            <p className="text-xs text-gray-500">Repeat</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] text-center">
            <p className="text-xl font-bold text-white">&#8369;{(currentBarber.monthlyRevenue || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-500">This Month</p>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Mail className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Contact Information
            </h3>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            <div className="p-4">
              <label className="text-xs text-gray-500 mb-1 block">Email</label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              ) : (
                <p className="text-white text-sm">{currentBarber.email}</p>
              )}
            </div>
            <div className="p-4">
              <label className="text-xs text-gray-500 mb-1 block">Phone</label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              ) : (
                <p className="text-white text-sm">{currentBarber.phone || 'Not provided'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Professional Details
            </h3>
          </div>
          <div className="divide-y divide-[#2A2A2A]">
            <div className="p-4">
              <label className="text-xs text-gray-500 mb-1 block">Years of Experience</label>
              {isEditing ? (
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={editForm.years_of_experience}
                  onChange={(e) => handleInputChange('years_of_experience', e.target.value)}
                  className="w-full bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  placeholder="e.g., 5"
                />
              ) : (
                <p className="text-white text-sm">
                  {currentBarber.years_of_experience != null
                    ? `${currentBarber.years_of_experience} year${currentBarber.years_of_experience !== 1 ? 's' : ''}`
                    : currentBarber.experience || 'Not specified'}
                </p>
              )}
            </div>
            <div className="p-4">
              <label className="text-xs text-gray-500 mb-2 block">Specialties</label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newSpecialty}
                      onChange={(e) => setNewSpecialty(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSpecialty()}
                      className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      placeholder="Add specialty"
                    />
                    <button
                      onClick={addSpecialty}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editForm.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-[#2A2A2A] text-white rounded-lg text-xs border border-[#3A3A3A]"
                      >
                        {specialty}
                        <button
                          onClick={() => removeSpecialty(specialty)}
                          className="ml-2 text-gray-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {currentBarber.specialties?.length > 0 ? (
                    currentBarber.specialties.map((specialty, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-[#2A2A2A] text-gray-300 rounded-lg text-xs border border-[#3A3A3A]"
                      >
                        {specialty}
                      </span>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No specialties added</p>
                  )}
                </div>
              )}
            </div>
            {/* Certifications */}
            <div className="p-4">
              <label className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                <Award className="w-3 h-3" />
                Certifications & Training
              </label>
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newCertification}
                      onChange={(e) => setNewCertification(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                      className="flex-1 bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
                      placeholder="e.g., Certified in Korean Perm"
                    />
                    <button
                      onClick={addCertification}
                      className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <input
                    ref={certFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCertImageUpload(e, Number(certFileInputRef.current.dataset.certIndex))}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    {editForm.certifications.map((cert, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-amber-500/10 text-amber-300 rounded-lg text-xs border border-amber-500/20"
                      >
                        <Award className="w-3 h-3 mr-1" />
                        {cert.name}
                        <button
                          onClick={() => {
                            certFileInputRef.current.dataset.certIndex = index
                            certFileInputRef.current.click()
                          }}
                          className="ml-1.5 text-amber-400/50 hover:text-amber-300"
                          title={cert.imageId ? 'Change image' : 'Attach image'}
                        >
                          {uploadingCertIndex === index ? (
                            <div className="w-3 h-3 border border-amber-300 border-t-transparent rounded-full animate-spin" />
                          ) : cert.imageId ? (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          ) : (
                            <Camera className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => removeCertification(cert.name)}
                          className="ml-1 text-amber-400 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  {editForm.certifications.length > 0 && (
                    <p className="text-[10px] text-gray-600">Tap <Camera className="w-2.5 h-2.5 inline" /> to attach a certificate image</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizeCerts(currentBarber.certifications).length > 0 ? (
                    normalizeCerts(currentBarber.certifications).map((cert, index) => (
                      <CertificationTag
                        key={index}
                        cert={cert}
                        size="md"
                        onClick={setSelectedCert}
                      />
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No certifications added</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden">
          <div className="p-4 border-b border-[#2A2A2A]">
            <h3 className="text-sm font-medium text-white flex items-center">
              <Shield className="w-4 h-4 mr-2 text-[var(--color-primary)]" />
              Account
            </h3>
          </div>
          <div>
            <button
              onClick={handleLogout}
              className="w-full p-4 flex items-center justify-between text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Logout</span>
              </div>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full border border-[#2A2A2A]">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Profile Updated</h3>
              <p className="text-gray-500 text-sm">
                {currentBarber?.bio_approval_status === 'pending'
                  ? 'Saved! Bio changes submitted for admin review.'
                  : 'Your changes have been saved'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full border border-[#2A2A2A]">
            <div className="text-center">
              <div className="w-14 h-14 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Error</h3>
              <p className="text-gray-500 text-sm mb-4">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-6 py-2 bg-[#2A2A2A] text-white rounded-lg text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certification Lightbox */}
      {selectedCert && (
        <CertificationLightbox cert={selectedCert} onClose={() => setSelectedCert(null)} />
      )}
    </div>
  )
}

export default BarberProfile
