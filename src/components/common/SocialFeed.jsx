import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, Megaphone, Scissors, Gift, Calendar, Trophy, Lightbulb, Pin } from 'lucide-react'

/**
 * SocialFeed - Instagram-style social feed for branch posts
 * Shows announcements, showcases, promotions, events, achievements, and tips
 */

// Post type icons and colors
const POST_TYPE_CONFIG = {
  announcement: {
    icon: Megaphone,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'Announcement'
  },
  showcase: {
    icon: Scissors,
    color: 'text-[var(--color-primary)]',
    bgColor: 'bg-[var(--color-primary)]/20',
    label: 'Showcase'
  },
  promotion: {
    icon: Gift,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    label: 'Promo'
  },
  event: {
    icon: Calendar,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Event'
  },
  achievement: {
    icon: Trophy,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Achievement'
  },
  tip: {
    icon: Lightbulb,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    label: 'Pro Tip'
  }
}

// Single Post Card Component
const PostCard = ({ post, userId, onLike }) => {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)

  const toggleLike = useMutation(api.services.feed.toggleLike)

  // Check if user has liked this post
  const userLiked = useQuery(
    api.services.feed.hasUserLikedPost,
    userId ? { postId: post._id, userId } : 'skip'
  )

  React.useEffect(() => {
    if (userLiked !== undefined) {
      setIsLiked(userLiked)
    }
  }, [userLiked])

  const handleLike = async () => {
    if (!userId) return

    // Optimistic update
    const newLiked = !isLiked
    setIsLiked(newLiked)
    setLikesCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1))

    try {
      await toggleLike({ postId: post._id, userId })
    } catch (error) {
      // Revert on error
      setIsLiked(!newLiked)
      setLikesCount(prev => newLiked ? Math.max(0, prev - 1) : prev + 1)
    }
  }

  const typeConfig = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.announcement
  const TypeIcon = typeConfig.icon

  // Format relative time
  const getRelativeTime = (timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return new Date(timestamp).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  const contentIsLong = post.content.length > 150
  const displayContent = showFullContent ? post.content : post.content.slice(0, 150)

  return (
    <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden">
      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Post Type Badge or Barber Avatar */}
          {post.barber ? (
            <div className="relative">
              <img
                src={post.barber.avatar_url || '/img/avatar_default.jpg'}
                alt={`${post.barber.first_name} ${post.barber.last_name}`}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--color-primary)]/30"
              />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
                <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
              </div>
            </div>
          ) : (
            <div className={`w-10 h-10 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {post.barber
                  ? `${post.barber.first_name} ${post.barber.last_name}`
                  : typeConfig.label}
              </span>
              {post.is_pinned && (
                <Pin className="w-3 h-3 text-[var(--color-primary)]" />
              )}
            </div>
            <span className="text-xs text-gray-500">{getRelativeTime(post.created_at)}</span>
          </div>
        </div>

        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Post Image */}
      {post.imageUrl && (
        <div className="relative aspect-square bg-[#0A0A0A]">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
          )}
          <img
            src={post.imageUrl}
            alt={post.title || 'Post image'}
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 group"
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                isLiked
                  ? 'text-red-500 fill-red-500 scale-110'
                  : 'text-white group-hover:text-red-400'
              }`}
            />
          </button>
          <button className="group">
            <MessageCircle className="w-6 h-6 text-white group-hover:text-[var(--color-primary)] transition-colors" />
          </button>
          <button className="group">
            <Share2 className="w-6 h-6 text-white group-hover:text-[var(--color-primary)] transition-colors" />
          </button>
        </div>
        <button className="group">
          <Bookmark className="w-6 h-6 text-white group-hover:text-[var(--color-primary)] transition-colors" />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-4 pt-2">
        <span className="text-sm font-bold text-white">
          {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 pt-2">
        {post.title && (
          <h3 className="text-sm font-bold text-white mb-1">{post.title}</h3>
        )}
        <p className="text-sm text-gray-300 leading-relaxed">
          {displayContent}
          {contentIsLong && !showFullContent && (
            <>
              ...{' '}
              <button
                onClick={() => setShowFullContent(true)}
                className="text-gray-500 hover:text-white"
              >
                more
              </button>
            </>
          )}
        </p>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map((tag, idx) => (
              <span key={idx} className="text-xs text-[var(--color-primary)]">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Main SocialFeed Component
const SocialFeed = ({ branchId, userId, limit = 10, showFilters = true }) => {
  const [activeFilter, setActiveFilter] = useState('all')

  const posts = useQuery(
    api.services.feed.getFeedPosts,
    branchId
      ? {
          branchId,
          limit,
          postType: activeFilter === 'all' ? undefined : activeFilter
        }
      : 'skip'
  )

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'announcement', label: 'News' },
    { id: 'promotion', label: 'Promos' },
    { id: 'event', label: 'Events' }
  ]

  // Loading state
  if (posts === undefined) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] overflow-hidden animate-pulse">
            <div className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-[#2A2A2A]" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-[#2A2A2A] rounded mb-2" />
                <div className="h-3 w-16 bg-[#2A2A2A] rounded" />
              </div>
            </div>
            <div className="aspect-square bg-[#2A2A2A]" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-20 bg-[#2A2A2A] rounded" />
              <div className="h-3 w-full bg-[#2A2A2A] rounded" />
              <div className="h-3 w-3/4 bg-[#2A2A2A] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
          <Scissors className="w-8 h-8 text-gray-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No posts yet</h3>
        <p className="text-sm text-gray-500">
          Check back soon for updates, showcases, and announcements!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      {showFilters && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                activeFilter === filter.id
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard key={post._id} post={post} userId={userId} />
        ))}
      </div>
    </div>
  )
}

export default SocialFeed
