import React, { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useAppModal } from '../../context/AppModalContext'
import {
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Link,
  ShoppingBag,
  ExternalLink,
  X,
  Upload,
  Calendar,
  BarChart3,
  MousePointer,
  Zap,
  Tag,
  Megaphone,
  ChevronUp,
  ChevronDown,
  HelpCircle,
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { shopBannerSteps } from '../../config/walkthroughSteps'

const BANNER_TYPES = [
  { value: 'product_promo', label: 'Product Promo', icon: ShoppingBag, description: 'Feature a product from your catalog' },
  { value: 'custom_ad', label: 'Custom Ad', icon: Megaphone, description: 'Upload your own promotional image' },
  { value: 'external_link', label: 'External Link', icon: ExternalLink, description: 'Promote partner websites or external pages' },
]

const LINK_TYPES = [
  { value: 'product', label: 'Product', description: 'Link to a product' },
  { value: 'category', label: 'Category', description: 'Filter by category' },
  { value: 'external', label: 'External URL', description: 'Open external website' },
  { value: 'none', label: 'None', description: 'Display only (no action)' },
]

const GRADIENT_PRESETS = [
  { value: 'from-[var(--color-primary)] to-orange-600', label: 'Primary Orange' },
  { value: 'from-purple-600 to-pink-500', label: 'Purple Pink' },
  { value: 'from-red-600 to-rose-500', label: 'Red Rose' },
  { value: 'from-emerald-600 to-teal-500', label: 'Emerald Teal' },
  { value: 'from-blue-600 to-cyan-500', label: 'Blue Cyan' },
  { value: 'from-amber-500 to-orange-500', label: 'Amber Orange' },
  { value: 'from-indigo-600 to-purple-600', label: 'Indigo Purple' },
  { value: 'from-pink-500 to-rose-500', label: 'Pink Rose' },
]

function ShopBannerManagement() {
  const { user } = useCurrentUser()
  const { showConfirm } = useAppModal()
  const [showModal, setShowModal] = useState(false)
  const [editingBanner, setEditingBanner] = useState(null)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])

  const banners = useQuery(api.services.shopBanners.getAllBanners) || []
  const analytics = useQuery(api.services.shopBanners.getBannerAnalytics)
  const products = useQuery(api.services.productCatalog.getCatalogProducts) || []

  const createBanner = useMutation(api.services.shopBanners.createBanner)
  const updateBanner = useMutation(api.services.shopBanners.updateBanner)
  const deleteBanner = useMutation(api.services.shopBanners.deleteBanner)
  const toggleActive = useMutation(api.services.shopBanners.toggleBannerActive)
  const reorderBanners = useMutation(api.services.shopBanners.reorderBanners)
  const generateUploadUrl = useMutation(api.services.branding.generateUploadUrl)

  const handleAddNew = () => {
    setEditingBanner(null)
    setShowModal(true)
  }

  const handleEdit = (banner) => {
    setEditingBanner(banner)
    setShowModal(true)
  }

  const handleDelete = async (bannerId) => {
    const confirmed = await showConfirm({ title: 'Delete Banner', message: 'Are you sure you want to delete this banner?', type: 'warning' })
    if (confirmed) {
      await deleteBanner({ banner_id: bannerId })
    }
  }

  const handleToggleActive = async (bannerId) => {
    await toggleActive({ banner_id: bannerId })
  }

  const handleMoveUp = async (index) => {
    if (index === 0) return
    const newOrder = [...banners.map(b => b._id)]
    ;[newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]]
    await reorderBanners({ banner_ids: newOrder })
  }

  const handleMoveDown = async (index) => {
    if (index === banners.length - 1) return
    const newOrder = [...banners.map(b => b._id)]
    ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
    await reorderBanners({ banner_ids: newOrder })
  }

  const activeBanners = banners.filter(b => b.is_active)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="banner-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Shop Banners</h2>
            <p className="text-gray-400 mt-1">Manage promotional carousel banners for the customer shop</p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3">
          <button
            data-tour="banner-analytics-btn"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-gray-300 transition-colors"
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <button
            data-tour="banner-add-btn"
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 rounded-xl text-white font-medium transition-colors"
          >
            <Plus size={18} />
            Add Banner
          </button>
        </div>
      </div>

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{analytics.totalBanners}</p>
            <p className="text-xs text-gray-400">Total Banners</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{analytics.activeBanners}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-400">{analytics.totalImpressions.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Impressions</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-400">{analytics.totalClicks.toLocaleString()}</p>
            <p className="text-xs text-gray-400">Clicks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">{analytics.overallCTR}%</p>
            <p className="text-xs text-gray-400">CTR</p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <span>{activeBanners.length} active banner{activeBanners.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-600">•</span>
        <span>{banners.length} total</span>
      </div>

      {/* Banners List */}
      <div data-tour="banner-list" className="space-y-3">
        {banners.length === 0 ? (
          <div className="text-center py-16 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
            <ImageIcon size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 font-medium">No banners yet</p>
            <p className="text-gray-500 text-sm mt-1">Create your first promotional banner</p>
            <button
              onClick={handleAddNew}
              className="mt-4 px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 rounded-xl text-white font-medium transition-colors"
            >
              Create Banner
            </button>
          </div>
        ) : (
          banners.map((banner, index) => {
            const TypeIcon = BANNER_TYPES.find(t => t.value === banner.type)?.icon || ImageIcon
            return (
              <div
                key={banner._id}
                className={`flex items-center gap-4 p-4 bg-[#1A1A1A] rounded-2xl border transition-all ${
                  banner.is_active ? 'border-[#2A2A2A]' : 'border-[#2A2A2A] opacity-60'
                }`}
              >
                {/* Reorder Controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1 hover:bg-[#2A2A2A] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronUp size={14} className="text-gray-400" />
                  </button>
                  <GripVertical size={16} className="text-gray-600" />
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === banners.length - 1}
                    className="p-1 hover:bg-[#2A2A2A] rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronDown size={14} className="text-gray-400" />
                  </button>
                </div>

                {/* Preview */}
                <div
                  className={`w-32 h-20 rounded-xl overflow-hidden bg-gradient-to-r ${banner.gradient || 'from-gray-700 to-gray-800'} flex items-center justify-center flex-shrink-0`}
                >
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <TypeIcon size={24} className="text-white/60" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white truncate">{banner.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      banner.type === 'product_promo' ? 'bg-green-500/20 text-green-400' :
                      banner.type === 'custom_ad' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-purple-500/20 text-purple-400'
                    }`}>
                      {BANNER_TYPES.find(t => t.value === banner.type)?.label}
                    </span>
                    {banner.badge && (
                      <span className="px-2 py-0.5 bg-[#2A2A2A] rounded text-[10px] text-gray-400">
                        {banner.badge}
                      </span>
                    )}
                  </div>
                  {banner.subtitle && (
                    <p className="text-sm text-gray-400 truncate mt-0.5">{banner.subtitle}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    {banner.link_type !== 'none' && (
                      <span className="flex items-center gap-1">
                        <Link size={12} />
                        {banner.link_type === 'external' ? 'External' : banner.link_type === 'product' ? 'Product' : 'Category'}
                      </span>
                    )}
                    {(banner.start_date || banner.end_date) && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Scheduled
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MousePointer size={12} />
                      {banner.click_count || 0} clicks
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(banner._id)}
                    className={`p-2 rounded-lg transition-colors ${
                      banner.is_active
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-[#2A2A2A] text-gray-400 hover:bg-[#3A3A3A]'
                    }`}
                    title={banner.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {banner.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button
                    onClick={() => handleEdit(banner)}
                    className="p-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-lg text-gray-400 transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(banner._id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <BannerModal
          banner={editingBanner}
          products={products}
          userId={user?._id}
          onClose={() => setShowModal(false)}
          onCreate={createBanner}
          onUpdate={updateBanner}
          generateUploadUrl={generateUploadUrl}
        />
      )}

      <WalkthroughOverlay steps={shopBannerSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
    </div>
  )
}

function BannerModal({ banner, products, userId, onClose, onCreate, onUpdate, generateUploadUrl }) {
  const [formData, setFormData] = useState({
    type: banner?.type || 'custom_ad',
    title: banner?.title || '',
    subtitle: banner?.subtitle || '',
    badge: banner?.badge || '',
    link_type: banner?.link_type || 'none',
    link_url: banner?.link_url || '',
    product_id: banner?.product_id || '',
    gradient: banner?.gradient || GRADIENT_PRESETS[0].value,
    is_active: banner?.is_active ?? true,
    start_date: banner?.start_date ? new Date(banner.start_date).toISOString().slice(0, 16) : '',
    end_date: banner?.end_date ? new Date(banner.end_date).toISOString().slice(0, 16) : '',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(banner?.imageUrl || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      let imageStorageId = banner?.image_storage_id

      // Upload new image if selected
      if (imageFile) {
        setUploadingImage(true)
        const uploadUrl = await generateUploadUrl()
        const result = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': imageFile.type },
          body: imageFile,
        })
        const { storageId } = await result.json()
        imageStorageId = storageId
        setUploadingImage(false)
      }

      const payload = {
        type: formData.type,
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        badge: formData.badge || undefined,
        image_storage_id: imageStorageId,
        link_type: formData.link_type,
        link_url: formData.link_type === 'external' || formData.link_type === 'category' ? formData.link_url : undefined,
        product_id: formData.link_type === 'product' && formData.product_id ? formData.product_id : undefined,
        gradient: formData.gradient,
        is_active: formData.is_active,
        start_date: formData.start_date ? new Date(formData.start_date).getTime() : undefined,
        end_date: formData.end_date ? new Date(formData.end_date).getTime() : undefined,
      }

      if (banner) {
        await onUpdate({ banner_id: banner._id, ...payload })
      } else {
        await onCreate({ ...payload, created_by: userId })
      }

      onClose()
    } catch (error) {
      console.error('Error saving banner:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] rounded-2xl border border-[#2A2A2A]">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between p-6 bg-[#0A0A0A] border-b border-[#2A2A2A]">
          <h3 className="text-xl font-bold text-white">
            {banner ? 'Edit Banner' : 'Create Banner'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A2A] rounded-lg transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Banner Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">Banner Type</label>
            <div className="grid grid-cols-3 gap-3">
              {BANNER_TYPES.map((type) => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type.value })}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      formData.type === type.value
                        ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-white'
                        : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400 hover:border-[#3A3A3A]'
                    }`}
                  >
                    <Icon size={20} className="mb-2" />
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{type.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Banner Image</label>
            <div className="flex items-start gap-4">
              <div
                className={`w-40 h-24 rounded-xl overflow-hidden bg-gradient-to-r ${formData.gradient} flex items-center justify-center border border-[#2A2A2A]`}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={32} className="text-white/40" />
                )}
              </div>
              <div className="flex-1">
                <label className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl cursor-pointer transition-colors">
                  <Upload size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-300">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">Recommended: 800x400px, PNG or JPG</p>
              </div>
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., MEGA SALE"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-primary)] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Subtitle</label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="e.g., Up to 50% OFF"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          </div>

          {/* Badge & Gradient */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Badge Text</label>
              <input
                type="text"
                value={formData.badge}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="e.g., Sale, New, Hot"
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Background Gradient</label>
              <select
                value={formData.gradient}
                onChange={(e) => setFormData({ ...formData, gradient: e.target.value })}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                {GRADIENT_PRESETS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Link Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Link Action</label>
            <div className="grid grid-cols-4 gap-2">
              {LINK_TYPES.map((lt) => (
                <button
                  key={lt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, link_type: lt.value })}
                  className={`px-3 py-2 rounded-xl text-sm transition-all ${
                    formData.link_type === lt.value
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[#1A1A1A] text-gray-400 hover:bg-[#2A2A2A]'
                  }`}
                >
                  {lt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Link Fields */}
          {formData.link_type === 'product' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Select Product</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-[var(--color-primary)] focus:outline-none"
              >
                <option value="">Select a product...</option>
                {products.filter(p => p.is_active).map((p) => (
                  <option key={p._id} value={p._id}>{p.name} - ₱{p.price}</option>
                ))}
              </select>
            </div>
          )}

          {(formData.link_type === 'external' || formData.link_type === 'category') && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {formData.link_type === 'external' ? 'External URL' : 'Category Slug'}
              </label>
              <input
                type={formData.link_type === 'external' ? 'url' : 'text'}
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder={formData.link_type === 'external' ? 'https://example.com' : 'e.g., hair-products'}
                className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>
          )}

          {/* Schedule */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Schedule (Optional)</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white focus:border-[var(--color-primary)] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-4 bg-[#1A1A1A] rounded-xl">
            <div className="flex-1">
              <p className="font-medium text-white">Active</p>
              <p className="text-xs text-gray-500">Show this banner in the shop carousel</p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-colors ${
                formData.is_active ? 'bg-green-500' : 'bg-[#3A3A3A]'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  formData.is_active ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-gray-300 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title.trim()}
              className="flex-1 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 rounded-xl text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? (uploadingImage ? 'Uploading...' : 'Saving...') : banner ? 'Update Banner' : 'Create Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ShopBannerManagement
