import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { Save, X, AlertCircle, Globe, Link2, Facebook, Instagram, ExternalLink, Image, Twitter, Youtube, Video } from 'lucide-react'
import ImageUploadInput from './ImageUploadInput'

const BranchFormModal = ({
  isOpen,
  onClose,
  title,
  onSubmit,
  formData,
  onInputChange,
  error,
  loading,
  isEdit = false
}) => {
  const [activeSection, setActiveSection] = useState('basic') // 'basic' or 'profile'

  if (!isOpen) return null

  // Generate slug from name
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 48)
  }

  // Handle name change to auto-generate slug
  const handleNameChange = (e) => {
    onInputChange(e)
    // Auto-generate slug if slug is empty or was auto-generated
    if (!formData.slug || formData.slug === generateSlug(formData.name || '')) {
      onInputChange({
        target: {
          name: 'slug',
          value: generateSlug(e.target.value)
        }
      })
    }
  }

  // Handle social link changes
  const handleSocialChange = (platform, value) => {
    const currentLinks = formData.social_links || {}
    onInputChange({
      target: {
        name: 'social_links',
        value: {
          ...currentLinks,
          [platform]: value
        }
      }
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-lg transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] shadow-2xl transition-all z-[10000] border border-[#444444]/50">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#444444]/30">
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#333333] rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Section Tabs */}
          {isEdit && (
            <div className="flex border-b border-[#444444]/30">
              <button
                type="button"
                onClick={() => setActiveSection('basic')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeSection === 'basic'
                    ? 'text-white border-b-2 border-[var(--color-primary)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Basic Info
              </button>
              <button
                type="button"
                onClick={() => setActiveSection('profile')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeSection === 'profile'
                    ? 'text-white border-b-2 border-[var(--color-primary)]'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Public Profile
              </button>
            </div>
          )}

          {/* Modal Body */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-400/20 border border-red-400/30 rounded-lg flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              {/* Basic Info Section */}
              {activeSection === 'basic' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Branch Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={isEdit ? onInputChange : handleNameChange}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Enter branch name"
                      required
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={onInputChange}
                      rows="3"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Enter branch address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={onInputChange}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={onInputChange}
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  <div className="border-t border-[#444444]/30 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3">Booking Hours</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                        <select
                          name="booking_start_hour"
                          value={formData.booking_start_hour ?? 10}
                          onChange={onInputChange}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                        <select
                          name="booking_end_hour"
                          value={formData.booking_end_hour ?? 20}
                          onChange={onInputChange}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>
                              {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      Set the available booking time range for this branch
                    </p>
                  </div>
                </>
              )}

              {/* Public Profile Section */}
              {activeSection === 'profile' && isEdit && (
                <>
                  {/* Profile & Cover Photos */}
                  <div className="border-b border-[#444444]/30 pb-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Brand Images
                    </h4>
                    <div className="space-y-4">
                      {/* Profile Photo */}
                      <div>
                        <ImageUploadInput
                          label="Profile Photo / Logo"
                          value={formData.profile_photo || ''}
                          onChange={(url) => onInputChange({ target: { name: 'profile_photo', value: url } })}
                          disabled={loading}
                          placeholder="Click to upload or enter URL"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Square image recommended (e.g., 200x200px)
                        </p>
                      </div>

                      {/* Cover Photo */}
                      <div>
                        <ImageUploadInput
                          label="Cover Photo / Banner"
                          value={formData.cover_photo || ''}
                          onChange={(url) => onInputChange({ target: { name: 'cover_photo', value: url } })}
                          disabled={loading}
                          placeholder="Click to upload or enter URL"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Wide image recommended (e.g., 1200x400px)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* URL Slug */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <div className="flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Profile URL Slug
                      </div>
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">/b/</span>
                      <input
                        type="text"
                        name="slug"
                        value={formData.slug || ''}
                        onChange={onInputChange}
                        className="flex-1 px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="main-branch"
                        pattern="[a-z0-9-]+"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      Public profile will be available at: /b/{formData.slug || 'your-slug'}
                    </p>
                    {formData.slug && (
                      <a
                        href={`/b/${formData.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Preview Profile
                      </a>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Branch Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description || ''}
                      onChange={onInputChange}
                      rows="3"
                      className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Tell customers about your branch..."
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      This will appear on your public profile page
                    </p>
                  </div>

                  {/* Social Links */}
                  <div className="border-t border-[#444444]/30 pt-4">
                    <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Social Media Links
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Facebook className="w-4 h-4" />
                          Facebook
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.facebook || ''}
                          onChange={(e) => handleSocialChange('facebook', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="facebook.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Instagram className="w-4 h-4" />
                          Instagram
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.instagram || ''}
                          onChange={(e) => handleSocialChange('instagram', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="instagram.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Video className="w-4 h-4" />
                          TikTok
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.tiktok || ''}
                          onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="tiktok.com/@..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Twitter className="w-4 h-4" />
                          X / Twitter
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.twitter || ''}
                          onChange={(e) => handleSocialChange('twitter', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="x.com/..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Youtube className="w-4 h-4" />
                          YouTube
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.youtube || ''}
                          onChange={(e) => handleSocialChange('youtube', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="youtube.com/@..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={formData.social_links?.website || ''}
                          onChange={(e) => handleSocialChange('website', e.target.value)}
                          className="w-full px-3 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                          placeholder="yourbranch.com"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#444444]/30">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-500 text-gray-300 rounded-lg hover:bg-gray-500/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{loading ? 'Saving...' : (isEdit ? 'Update Branch' : 'Create Branch')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default BranchFormModal
