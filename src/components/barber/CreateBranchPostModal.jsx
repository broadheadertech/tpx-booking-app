import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  X,
  Camera,
  Image as ImageIcon,
  Tag,
  Calendar,
  Megaphone,
  Lightbulb,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  Palmtree
} from 'lucide-react'

/**
 * Create Branch Post Modal
 * Allows barbers to create posts for the branch's public profile
 */
const CreateBranchPostModal = ({ isOpen, onClose, barber, branchId }) => {
  const [postType, setPostType] = useState('showcase')
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  // Vacation date states
  const [vacationStart, setVacationStart] = useState('')
  const [vacationEnd, setVacationEnd] = useState('')

  const createPost = useMutation(api.services.branchPosts.createPost)
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)

  const postTypes = [
    { id: 'showcase', label: 'Showcase', icon: ImageIcon, color: 'text-blue-400', desc: 'Show off your work' },
    { id: 'promo', label: 'Promo', icon: Tag, color: 'text-green-400', desc: 'Announce a deal' },
    { id: 'availability', label: 'Available', icon: Calendar, color: 'text-yellow-400', desc: 'Open slots' },
    { id: 'vacation', label: 'Away', icon: Palmtree, color: 'text-red-400', desc: 'Vacation/closure' },
    { id: 'announcement', label: 'News', icon: Megaphone, color: 'text-purple-400', desc: 'General update' },
    { id: 'tip', label: 'Tip', icon: Lightbulb, color: 'text-orange-400', desc: 'Share advice' },
  ]

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setFilePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async () => {
    if (!content.trim() || !branchId) return

    setIsSubmitting(true)
    setResult(null)

    try {
      let imageUrls = []

      // Upload image if selected
      if (selectedFile) {
        const uploadUrl = await generateUploadUrl()
        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        })
        const { storageId } = await uploadResult.json()

        // Get the URL for the uploaded file
        // Note: You may need to adjust this based on your file storage setup
        imageUrls = [storageId] // Store the storage ID, convert to URL when displaying
      }

      const response = await createPost({
        branch_id: branchId,
        post_type: postType,
        content: content.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
        // Include vacation dates if vacation type
        vacation_start: postType === 'vacation' && vacationStart
          ? new Date(vacationStart).getTime()
          : undefined,
        vacation_end: postType === 'vacation' && vacationEnd
          ? new Date(vacationEnd).getTime()
          : undefined,
      })

      setResult({
        success: true,
        message: response.message,
        status: response.status
      })

      // Reset form after short delay
      setTimeout(() => {
        resetForm()
        onClose()
      }, 2000)
    } catch (error) {
      console.error('Failed to create post:', error)
      setResult({
        success: false,
        message: error.message || 'Failed to create post'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setPostType('showcase')
    setContent('')
    setSelectedFile(null)
    setFilePreview(null)
    setResult(null)
    setVacationStart('')
    setVacationEnd('')
  }

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm()
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-[#1A1A1A] rounded-t-3xl sm:rounded-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2A2A2A] bg-[#1A1A1A]">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <h3 className="text-base font-semibold text-white">Create Post</h3>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !content.trim()}
            className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-all ${
              isSubmitting || !content.trim()
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-[var(--color-primary)] text-white hover:opacity-90'
            }`}
          >
            {isSubmitting ? 'Posting...' : 'Post'}
          </button>
        </div>

        {/* Result Message */}
        {result && (
          <div className={`mx-4 mt-4 p-3 rounded-xl flex items-center gap-3 ${
            result.success
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-red-500/10 border border-red-500/30'
          }`}>
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </p>
              {result.status === 'pending' && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Your post will appear after admin approval.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Post Type Selection */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Post Type</label>
            <div className="flex flex-wrap gap-2">
              {postTypes.map((type) => {
                const Icon = type.icon
                const isSelected = postType === type.id
                return (
                  <button
                    key={type.id}
                    onClick={() => setPostType(type.id)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[#0D0D0D] text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : type.color}`} />
                    {type.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {postTypes.find(t => t.id === postType)?.desc}
            </p>
          </div>

          {/* Vacation Date Range - Only show for vacation type */}
          {postType === 'vacation' && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <Palmtree className="w-4 h-4" />
                <span className="text-sm font-medium">Vacation Period</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">From</label>
                  <input
                    type="date"
                    value={vacationStart}
                    onChange={(e) => setVacationStart(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">To</label>
                  <input
                    type="date"
                    value={vacationEnd}
                    onChange={(e) => setVacationEnd(e.target.value)}
                    min={vacationStart || new Date().toISOString().split('T')[0]}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Let customers know when you'll be unavailable
              </p>
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Photo (Optional)</label>
            <div className={`aspect-video rounded-xl overflow-hidden ${
              filePreview ? '' : 'border-2 border-dashed border-[#3A3A3A]'
            } bg-[#0D0D0D] transition-all`}>
              {filePreview ? (
                <div className="relative w-full h-full">
                  <img
                    src={filePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setFilePreview(null)
                    }}
                    disabled={isSubmitting}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-full cursor-pointer hover:bg-[#1A1A1A] transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <Camera className="w-10 h-10 text-gray-600 mb-2" />
                  <span className="text-sm text-gray-500">Add a photo</span>
                </label>
              )}
            </div>
          </div>

          {/* Content Input */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">
              {postType === 'tip' ? 'Share your tip' :
               postType === 'promo' ? 'Describe your offer' :
               postType === 'availability' ? 'Share your availability' :
               postType === 'vacation' ? 'Leave a message' :
               'Write your post'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'showcase' ? "Describe this haircut or style..." :
                postType === 'promo' ? "What's the deal? Include details..." :
                postType === 'availability' ? "When are you available? E.g., 'Open slots this Saturday!'" :
                postType === 'vacation' ? "E.g., 'Taking a break! Book ahead for when I return.'" :
                postType === 'announcement' ? "Share your news..." :
                "Share a grooming tip with customers..."
              }
              className="w-full h-32 px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-transparent text-sm resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${content.length > 450 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="flex items-start gap-3 p-3 bg-[#0D0D0D] rounded-xl">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 leading-relaxed">
                {postType === 'showcase'
                  ? "High-quality photos of your work help attract new clients!"
                  : postType === 'promo'
                  ? "Clear offers with deadlines perform best. E.g., '20% off this week only!'"
                  : postType === 'availability'
                  ? "Let customers know when you have open slots for last-minute bookings."
                  : postType === 'vacation'
                  ? "Vacation notices help customers plan ahead and book with another barber."
                  : postType === 'tip'
                  ? "Share grooming advice to build trust and showcase your expertise."
                  : "Keep announcements clear and engaging."}
              </p>
              {barber && (
                <p className="text-xs text-gray-500 mt-2">
                  Posting as: <span className="text-white">{barber.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateBranchPostModal
