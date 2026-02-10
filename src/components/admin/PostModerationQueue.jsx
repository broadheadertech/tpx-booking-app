import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAppModal } from '../../context/AppModalContext'
import {
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Tag,
  Calendar,
  Megaphone,
  Lightbulb,
  User,
  Building2,
  Eye,
  Loader2,
  AlertCircle,
  Pin,
  Plus,
  X,
  Camera,
  Sparkles,
  Palmtree,
  Trash2
} from 'lucide-react'

/**
 * Post Moderation Queue
 * Admin component to review/approve/reject pending posts + create new posts
 */
const PostModerationQueue = ({ branchId, user }) => {
  const { showAlert, showConfirm } = useAppModal()
  const [rejectingPostId, setRejectingPostId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processingPostId, setProcessingPostId] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeView, setActiveView] = useState('pending') // 'pending' | 'published'

  // Get pending posts
  const pendingPosts = useQuery(
    api.services.branchPosts.getPendingPosts,
    branchId ? { branchId } : {}
  )

  // Get published posts
  const publishedPosts = useQuery(
    api.services.branchPosts.getBranchPublishedPosts,
    branchId ? { branchId, limit: 20 } : 'skip'
  )

  const moderatePost = useMutation(api.services.branchPosts.moderatePost)
  const togglePinPost = useMutation(api.services.branchPosts.togglePinPost)
  const deletePost = useMutation(api.services.branchPosts.deletePost)

  const handleApprove = async (postId) => {
    setProcessingPostId(postId)
    try {
      await moderatePost({
        postId,
        action: 'approve'
      })
    } catch (error) {
      console.error('Failed to approve post:', error)
      showAlert({ title: 'Error', message: 'Failed to approve post: ' + error.message, type: 'error' })
    } finally {
      setProcessingPostId(null)
    }
  }

  const handleReject = async (postId) => {
    if (!rejectReason.trim()) {
      showAlert({ title: 'Missing Reason', message: 'Please provide a reason for rejection', type: 'warning' })
      return
    }

    setProcessingPostId(postId)
    try {
      await moderatePost({
        postId,
        action: 'reject',
        reason: rejectReason.trim()
      })
      setRejectingPostId(null)
      setRejectReason('')
    } catch (error) {
      console.error('Failed to reject post:', error)
      showAlert({ title: 'Error', message: 'Failed to reject post: ' + error.message, type: 'error' })
    } finally {
      setProcessingPostId(null)
    }
  }

  const handleDelete = async (postId) => {
    const confirmed = await showConfirm({ title: 'Delete Post', message: 'Are you sure you want to delete this post?', type: 'warning' })
    if (!confirmed) return
    setProcessingPostId(postId)
    try {
      await deletePost({ postId })
    } catch (error) {
      console.error('Failed to delete post:', error)
      showAlert({ title: 'Error', message: 'Failed to delete post: ' + error.message, type: 'error' })
    } finally {
      setProcessingPostId(null)
    }
  }

  const handlePin = async (postId) => {
    try {
      await togglePinPost({ postId })
    } catch (error) {
      console.error('Failed to toggle pin:', error)
    }
  }

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'showcase': return <ImageIcon className="w-4 h-4 text-blue-400" />
      case 'promo': return <Tag className="w-4 h-4 text-green-400" />
      case 'availability': return <Calendar className="w-4 h-4 text-yellow-400" />
      case 'announcement': return <Megaphone className="w-4 h-4 text-purple-400" />
      case 'tip': return <Lightbulb className="w-4 h-4 text-orange-400" />
      case 'vacation': return <Palmtree className="w-4 h-4 text-red-400" />
      default: return <ImageIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const pendingCount = pendingPosts?.length || 0
  const publishedCount = publishedPosts?.length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Posts</h2>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your branch posts
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Create Post
        </button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-[#1A1A1A] rounded-lg border border-[#333] w-fit">
        <button
          onClick={() => setActiveView('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'pending'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveView('published')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeView === 'published'
              ? 'bg-[var(--color-primary)] text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Published
          {publishedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
              {publishedCount}
            </span>
          )}
        </button>
      </div>

      {/* Pending Posts */}
      {activeView === 'pending' && (
        <>
          {pendingPosts === undefined ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : pendingPosts.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1A] rounded-xl border border-[#333]">
              <CheckCircle className="w-16 h-16 text-green-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No posts waiting for approval</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  mode="pending"
                  getPostTypeIcon={getPostTypeIcon}
                  formatDate={formatDate}
                  processingPostId={processingPostId}
                  rejectingPostId={rejectingPostId}
                  rejectReason={rejectReason}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onRejectStart={setRejectingPostId}
                  onRejectCancel={() => { setRejectingPostId(null); setRejectReason('') }}
                  onRejectReasonChange={setRejectReason}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Published Posts */}
      {activeView === 'published' && (
        <>
          {publishedPosts === undefined ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[var(--color-primary)] animate-spin" />
            </div>
          ) : publishedPosts.length === 0 ? (
            <div className="text-center py-16 bg-[#1A1A1A] rounded-xl border border-[#333]">
              <Megaphone className="w-16 h-16 text-gray-500/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Published Posts</h3>
              <p className="text-gray-500 mb-4">Create your first post to engage with customers</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                Create Post
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {publishedPosts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  mode="published"
                  getPostTypeIcon={getPostTypeIcon}
                  formatDate={formatDate}
                  processingPostId={processingPostId}
                  onDelete={handleDelete}
                  onPin={handlePin}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Post Modal - Portal to body to escape tab overflow */}
      {showCreateModal && createPortal(
        <CreatePostModal
          branchId={branchId}
          user={user}
          onClose={() => setShowCreateModal(false)}
        />,
        document.body
      )}
    </div>
  )
}

// ============================================================================
// POST CARD COMPONENT
// ============================================================================

const PostCard = ({
  post,
  mode,
  getPostTypeIcon,
  formatDate,
  processingPostId,
  rejectingPostId,
  rejectReason,
  onApprove,
  onReject,
  onRejectStart,
  onRejectCancel,
  onRejectReasonChange,
  onDelete,
  onPin,
}) => {
  return (
    <div className="bg-[#1A1A1A] rounded-xl border border-[#333] overflow-hidden">
      {/* Post Header */}
      <div className="p-4 border-b border-[#2A2A2A]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/20 flex items-center justify-center">
              {post.author_avatar ? (
                <img
                  src={post.author_avatar}
                  alt={post.author_name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-[var(--color-primary)]" />
              )}
            </div>
            <div>
              <p className="text-white font-medium">{post.author_name}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDate(post.createdAt)}</span>
                {post.pinned && (
                  <>
                    <span>•</span>
                    <Pin className="w-3 h-3 text-[var(--color-primary)]" />
                    <span className="text-[var(--color-primary)]">Pinned</span>
                  </>
                )}
                {post.view_count > 0 && (
                  <>
                    <span>•</span>
                    <Eye className="w-3 h-3" />
                    <span>{post.view_count}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 bg-[#0D0D0D] rounded-lg">
              {getPostTypeIcon(post.post_type)}
              <span className="text-xs text-gray-400 capitalize">{post.post_type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Post Image */}
      {post.images && post.images.length > 0 && (
        <div className="aspect-video bg-[#0D0D0D]">
          <img
            src={post.images[0]}
            alt="Post"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Post Content */}
      <div className="p-4">
        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Pending Actions */}
      {mode === 'pending' && (
        <>
          {rejectingPostId === post._id && (
            <div className="px-4 pb-4">
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <label className="text-sm text-red-400 font-medium mb-2 block">
                  Reason for rejection
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => onRejectReasonChange(e.target.value)}
                  placeholder="Explain why this post is being rejected..."
                  className="w-full h-20 px-3 py-2 bg-[#0D0D0D] border border-red-500/30 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={onRejectCancel}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onReject(post._id)}
                    disabled={processingPostId === post._id || !rejectReason?.trim()}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingPostId === post._id ? 'Rejecting...' : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {rejectingPostId !== post._id && (
            <div className="px-4 pb-4 flex gap-3">
              <button
                onClick={() => onApprove(post._id)}
                disabled={processingPostId === post._id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
              >
                {processingPostId === post._id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </button>
              <button
                onClick={() => onRejectStart(post._id)}
                disabled={processingPostId === post._id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2A2A2A] text-white rounded-lg font-medium hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}
        </>
      )}

      {/* Published Actions */}
      {mode === 'published' && (
        <div className="px-4 pb-4 flex gap-3">
          <button
            onClick={() => onPin(post._id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              post.pinned
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'bg-[#2A2A2A] text-gray-400 hover:text-white'
            }`}
          >
            <Pin className="w-4 h-4" />
            {post.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button
            onClick={() => onDelete(post._id)}
            disabled={processingPostId === post._id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-[#2A2A2A] text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// CREATE POST MODAL
// ============================================================================

const CreatePostModal = ({ branchId, user, onClose }) => {
  const [postType, setPostType] = useState('announcement')
  const [content, setContent] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [vacationStart, setVacationStart] = useState('')
  const [vacationEnd, setVacationEnd] = useState('')

  const createAdminPost = useMutation(api.services.branchPosts.createAdminPost)
  const generateUploadUrl = useMutation(api.services.barbers.generateUploadUrl)

  const postTypes = [
    { id: 'announcement', label: 'News', icon: Megaphone, color: 'text-purple-400', desc: 'General announcement' },
    { id: 'showcase', label: 'Showcase', icon: ImageIcon, color: 'text-blue-400', desc: 'Show off work' },
    { id: 'promo', label: 'Promo', icon: Tag, color: 'text-green-400', desc: 'Announce a deal' },
    { id: 'availability', label: 'Available', icon: Calendar, color: 'text-yellow-400', desc: 'Open slots' },
    { id: 'vacation', label: 'Away', icon: Palmtree, color: 'text-red-400', desc: 'Vacation/closure' },
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
    if (!content.trim() || !branchId || !user?._id) return

    setIsSubmitting(true)
    setResult(null)

    try {
      let imageUrls = []

      if (selectedFile) {
        const uploadUrl = await generateUploadUrl()
        const uploadResult = await fetch(uploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        })
        const { storageId } = await uploadResult.json()
        imageUrls = [storageId]
      }

      const response = await createAdminPost({
        author_id: user._id,
        branch_id: branchId,
        post_type: postType,
        content: content.trim(),
        images: imageUrls.length > 0 ? imageUrls : undefined,
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
      })

      setTimeout(() => onClose(), 1500)
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

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
      />

      <div className="relative w-full max-w-lg mx-4 bg-[#1A1A1A] rounded-t-3xl sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2A2A2A] bg-[#1A1A1A]">
          <button
            onClick={() => !isSubmitting && onClose()}
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
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </button>
        </div>

        {/* Result */}
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
            <p className={`text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
              {result.message}
            </p>
          </div>
        )}

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Post Type */}
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

          {/* Vacation Dates */}
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
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
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
                    className="w-full px-3 py-2 bg-[#0D0D0D] border border-[#2A2A2A] rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                </div>
              </div>
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
               postType === 'availability' ? 'Share availability' :
               postType === 'vacation' ? 'Leave a message' :
               'Write your post'}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                postType === 'showcase' ? "Describe this style or work..." :
                postType === 'promo' ? "What's the deal? Include details..." :
                postType === 'availability' ? "When are slots available?" :
                postType === 'vacation' ? "E.g., 'Branch closed for renovation!'" :
                postType === 'announcement' ? "Share your news with customers..." :
                "Share a grooming tip..."
              }
              className="w-full h-32 px-4 py-3 bg-[#0D0D0D] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 text-sm resize-none"
              disabled={isSubmitting}
              maxLength={500}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-gray-500">
                Will be published immediately
              </span>
              <span className={`text-xs ${content.length > 450 ? 'text-yellow-400' : 'text-gray-500'}`}>
                {content.length}/500
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="flex items-start gap-3 p-3 bg-[#0D0D0D] rounded-xl">
            <Sparkles className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              As a branch admin, your posts are published immediately without needing approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostModerationQueue
