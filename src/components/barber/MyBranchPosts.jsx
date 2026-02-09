import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Plus,
  Image as ImageIcon,
  Tag,
  Calendar,
  Megaphone,
  Lightbulb,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  MoreVertical,
  Loader2,
  Pin
} from 'lucide-react'
import CreateBranchPostModal from './CreateBranchPostModal'

/**
 * My Branch Posts Component
 * Shows barber's posts with status and ability to create new ones
 */
const MyBranchPosts = ({ barber }) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [deletingPostId, setDeletingPostId] = useState(null)

  // Get barber's posts
  const myPosts = useQuery(
    api.services.branchPosts.getMyPosts,
    selectedStatus === 'all' ? {} : { status: selectedStatus }
  )

  const deletePost = useMutation(api.services.branchPosts.deletePost)

  const handleDelete = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    setDeletingPostId(postId)
    try {
      await deletePost({ postId })
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('Failed to delete post: ' + error.message)
    } finally {
      setDeletingPostId(null)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-full text-xs font-medium">
            <CheckCircle className="w-3 h-3" />
            Published
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded-full text-xs font-medium">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        )
      case 'rejected':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full text-xs font-medium">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      case 'archived':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-xs font-medium">
            <AlertCircle className="w-3 h-3" />
            Archived
          </span>
        )
      default:
        return null
    }
  }

  const getPostTypeIcon = (type) => {
    switch (type) {
      case 'showcase': return <ImageIcon className="w-4 h-4 text-blue-400" />
      case 'promo': return <Tag className="w-4 h-4 text-green-400" />
      case 'availability': return <Calendar className="w-4 h-4 text-yellow-400" />
      case 'announcement': return <Megaphone className="w-4 h-4 text-purple-400" />
      case 'tip': return <Lightbulb className="w-4 h-4 text-orange-400" />
      default: return <ImageIcon className="w-4 h-4 text-gray-400" />
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const statusFilters = [
    { id: 'all', label: 'All' },
    { id: 'published', label: 'Published' },
    { id: 'pending', label: 'Pending' },
    { id: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">My Branch Posts</h2>
            <p className="text-sm text-gray-500">
              Posts visible on your branch's public profile
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Post
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedStatus(filter.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedStatus === filter.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Posts List */}
      <div className="px-4 space-y-4">
        {myPosts === undefined ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[var(--color-primary)] animate-spin" />
          </div>
        ) : myPosts.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] rounded-xl">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 mb-1">No posts yet</p>
            <p className="text-gray-500 text-sm mb-4">
              Create your first post to appear on the branch profile
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Create Post
            </button>
          </div>
        ) : (
          myPosts.map((post) => (
            <div
              key={post._id}
              className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden"
            >
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
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {getPostTypeIcon(post.post_type)}
                    <span className="text-xs text-gray-400 capitalize">{post.post_type}</span>
                    {post.pinned && (
                      <Pin className="w-3 h-3 text-[var(--color-primary)]" />
                    )}
                  </div>
                  {getStatusBadge(post.status)}
                </div>

                {/* Content */}
                <p className="text-white text-sm leading-relaxed mb-3 line-clamp-3">
                  {post.content}
                </p>

                {/* Rejection Reason */}
                {post.status === 'rejected' && post.rejection_reason && (
                  <div className="p-3 bg-red-500/10 rounded-lg mb-3">
                    <p className="text-xs text-red-400">
                      <strong>Reason:</strong> {post.rejection_reason}
                    </p>
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(post.createdAt)}
                    </span>
                    {post.status === 'published' && post.view_count > 0 && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {post.view_count} views
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDelete(post._id)}
                    disabled={deletingPostId === post._id}
                    className="p-2 text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    {deletingPostId === post._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Post Modal */}
      <CreateBranchPostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        barber={barber}
        branchId={barber?.branch_id}
      />
    </div>
  )
}

export default MyBranchPosts
