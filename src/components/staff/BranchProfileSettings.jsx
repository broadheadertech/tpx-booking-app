import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Save,
  Loader2,
  Image,
  User,
  Globe,
  Link2,
  Facebook,
  Instagram,
  Video,
  Twitter,
  Youtube,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin
} from 'lucide-react'
import ImageUploadInput from '../admin/ImageUploadInput'

/**
 * Branch Profile Settings Component
 * Allows Branch Admins to manage their branch's public profile
 */
const BranchProfileSettings = ({ user }) => {
  const [formData, setFormData] = useState({
    profile_photo: '',
    cover_photo: '',
    slug: '',
    description: '',
    phone: '',
    address: '',
    social_links: {
      facebook: '',
      instagram: '',
      tiktok: '',
      twitter: '',
      youtube: '',
      website: ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  // Get branch data
  const branch = useQuery(
    api.services.branches.getBranchById,
    user?.branch_id ? { id: user.branch_id } : 'skip'
  )

  const updateBranch = useMutation(api.services.branches.updateBranch)

  // Load branch data into form
  useEffect(() => {
    if (branch) {
      setFormData({
        profile_photo: branch.profile_photo || '',
        cover_photo: branch.cover_photo || '',
        slug: branch.slug || '',
        description: branch.description || '',
        phone: branch.phone || '',
        address: branch.address || '',
        social_links: {
          facebook: branch.social_links?.facebook || '',
          instagram: branch.social_links?.instagram || '',
          tiktok: branch.social_links?.tiktok || '',
          twitter: branch.social_links?.twitter || '',
          youtube: branch.social_links?.youtube || '',
          website: branch.social_links?.website || ''
        }
      })
    }
  }, [branch])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [platform]: value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user?.branch_id) return

    setSaving(true)
    setMessage(null)

    try {
      // Clean up empty social links
      const cleanedSocialLinks = {}
      Object.entries(formData.social_links).forEach(([key, value]) => {
        if (value?.trim()) {
          cleanedSocialLinks[key] = value.trim()
        }
      })

      await updateBranch({
        id: user.branch_id,
        profile_photo: formData.profile_photo || undefined,
        cover_photo: formData.cover_photo || undefined,
        slug: formData.slug || undefined,
        description: formData.description || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        social_links: Object.keys(cleanedSocialLinks).length > 0 ? cleanedSocialLinks : undefined
      })

      setMessage({ type: 'success', text: 'Branch profile updated successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error('Failed to update branch profile:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  if (!user?.branch_id) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
        <p className="text-gray-400">No branch assigned to your account.</p>
      </div>
    )
  }

  if (branch === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Branch Profile</h2>
          <p className="text-sm text-gray-500 mt-1">
            Customize your branch's public profile for better advertising
          </p>
        </div>
        {formData.slug && (
          <a
            href={`/b/${formData.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] text-[var(--color-primary)] rounded-lg hover:bg-[#2A2A2A] transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            View Public Profile
          </a>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/30 text-green-400'
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Brand Images Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-[var(--color-primary)]" />
            Brand Images
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Photo */}
            <div>
              <ImageUploadInput
                label="Profile Photo / Logo"
                value={formData.profile_photo}
                onChange={(url) => setFormData(prev => ({ ...prev, profile_photo: url }))}
                disabled={saving}
                placeholder="Click to upload or enter URL"
              />
              <p className="mt-2 text-xs text-gray-500">
                Square image recommended (200x200px)
              </p>
            </div>

            {/* Cover Photo */}
            <div>
              <ImageUploadInput
                label="Cover Photo / Banner"
                value={formData.cover_photo}
                onChange={(url) => setFormData(prev => ({ ...prev, cover_photo: url }))}
                disabled={saving}
                placeholder="Click to upload or enter URL"
              />
              <p className="mt-2 text-xs text-gray-500">
                Wide image recommended (1200x400px)
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[var(--color-primary)]" />
            Profile Details
          </h3>
          <div className="space-y-4">
            {/* URL Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Profile URL Slug
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm bg-[#0D0D0D] px-3 py-3 rounded-l-lg border border-r-0 border-[#333]">/b/</span>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-r-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="your-branch-name"
                  pattern="[a-z0-9-]+"
                />
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Your public profile URL: {window.location.origin}/b/{formData.slug || 'your-slug'}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Branch Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="Tell customers about your branch, services, and what makes you special..."
              />
              <p className="mt-2 text-xs text-gray-500">
                This will appear on your public profile page
              </p>
            </div>

            {/* Contact Number & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="e.g. +63 912 345 6789"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Branch street address, city"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Links Section */}
        <div className="bg-[#1A1A1A] rounded-xl p-6 border border-[#333]">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-[var(--color-primary)]" />
            Social Media Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Facebook className="w-4 h-4" />
                Facebook
              </label>
              <input
                type="url"
                value={formData.social_links.facebook}
                onChange={(e) => handleSocialChange('facebook', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://facebook.com/yourbranch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Instagram className="w-4 h-4" />
                Instagram
              </label>
              <input
                type="url"
                value={formData.social_links.instagram}
                onChange={(e) => handleSocialChange('instagram', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://instagram.com/yourbranch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Video className="w-4 h-4" />
                TikTok
              </label>
              <input
                type="url"
                value={formData.social_links.tiktok}
                onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://tiktok.com/@yourbranch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Twitter className="w-4 h-4" />
                X / Twitter
              </label>
              <input
                type="url"
                value={formData.social_links.twitter}
                onChange={(e) => handleSocialChange('twitter', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://x.com/yourbranch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Youtube className="w-4 h-4" />
                YouTube
              </label>
              <input
                type="url"
                value={formData.social_links.youtube}
                onChange={(e) => handleSocialChange('youtube', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://youtube.com/@yourbranch"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Website
              </label>
              <input
                type="url"
                value={formData.social_links.website}
                onChange={(e) => handleSocialChange('website', e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0D0D] border border-[#333] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="https://yourbranch.com"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default BranchProfileSettings
