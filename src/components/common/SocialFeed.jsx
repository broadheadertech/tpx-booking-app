import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../../convex/_generated/api'
import { MoreHorizontal, Megaphone, Scissors, Gift, Calendar, Lightbulb, Pin, Flame, Bookmark, Palmtree, Sparkles, Clock, ShoppingBag } from 'lucide-react'
import ShoppableProducts, { ShoppableBadge, QuickPurchaseModal } from './ShoppableProducts'

/**
 * SocialFeed - Instagram-style social feed for branch posts
 * BT2: Now with personalized "For You" algorithm
 * BT3: Shoppable posts with in-feed product commerce
 * Shows announcements, showcases, promotions, events, achievements, and tips
 */

// Post type icons and colors - matches branch_posts schema
const POST_TYPE_CONFIG = {
  showcase: {
    icon: Scissors,
    color: 'text-[var(--color-primary)]',
    bgColor: 'bg-[var(--color-primary)]/20',
    label: 'Showcase'
  },
  promo: {
    icon: Gift,
    color: 'text-[var(--color-accent)]',
    bgColor: 'bg-[var(--color-accent)]/20',
    label: 'Promo'
  },
  availability: {
    icon: Calendar,
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Available'
  },
  announcement: {
    icon: Megaphone,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    label: 'News'
  },
  tip: {
    icon: Lightbulb,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/20',
    label: 'Pro Tip'
  },
  vacation: {
    icon: Palmtree,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    label: 'Away',
    isAlert: true
  }
}

// View time threshold for "long view" (5 seconds)
const LONG_VIEW_THRESHOLD_MS = 5000

// Single Post Card Component with view tracking
const PostCard = ({ post, userId, onBookWithBarber, onViewTracked }) => {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [showFullContent, setShowFullContent] = useState(false)
  const [isLiking, setIsLiking] = useState(false)
  const [optimisticLiked, setOptimisticLiked] = useState(null)
  const [optimisticCount, setOptimisticCount] = useState(null)
  const [isBookmarking, setIsBookmarking] = useState(false)
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(null)

  // View tracking refs
  const cardRef = useRef(null)
  const viewStartTime = useRef(null)
  const hasTrackedView = useRef(false)
  const hasTrackedLongView = useRef(false)

  const toggleLike = useMutation(api.services.feed.toggleLike)
  const toggleBookmark = useMutation(api.services.feedAlgorithm.toggleBookmark)
  const recordInteraction = useMutation(api.services.feedAlgorithm.recordInteraction)

  // Check if user has liked this post
  const hasLiked = useQuery(
    api.services.feed.hasUserLikedPost,
    userId ? { postId: post._id, userId } : 'skip'
  )

  // Check if user has bookmarked this post
  const hasBookmarked = useQuery(
    api.services.feedAlgorithm.hasUserBookmarkedPost,
    userId ? { postId: post._id, userId } : 'skip'
  )

  // Navigate to barber's portfolio or branch profile
  const handleAuthorClick = () => {
    if (post.author?.slug) {
      if (post.author?.isBranch) {
        navigate(`/b/${post.author.slug}`)
      } else {
        navigate(`/barbers/${post.author.slug}`)
      }
    }
  }

  // View tracking with Intersection Observer
  useEffect(() => {
    if (!userId || !cardRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Post came into view
            viewStartTime.current = Date.now()

            // Track basic view (only once per session)
            if (!hasTrackedView.current) {
              hasTrackedView.current = true
              recordInteraction({
                userId,
                postId: post._id,
                interactionType: 'view',
              }).catch(console.error)
              onViewTracked?.()
            }
          } else if (viewStartTime.current) {
            // Post left view - calculate duration
            const duration = Date.now() - viewStartTime.current

            // Track long view if threshold met
            if (duration >= LONG_VIEW_THRESHOLD_MS && !hasTrackedLongView.current) {
              hasTrackedLongView.current = true
              recordInteraction({
                userId,
                postId: post._id,
                interactionType: 'view_long',
                viewDurationMs: duration,
              }).catch(console.error)
            }

            viewStartTime.current = null
          }
        })
      },
      { threshold: 0.5 } // 50% of post must be visible
    )

    observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [userId, post._id, recordInteraction, onViewTracked])

  const typeConfig = POST_TYPE_CONFIG[post.post_type] || POST_TYPE_CONFIG.announcement
  const TypeIcon = typeConfig.icon

  // Get first image from images array
  const postImage = post.images && post.images.length > 0 ? post.images[0] : null

  // Calculate display values (optimistic or actual)
  const displayLiked = optimisticLiked !== null ? optimisticLiked : hasLiked
  const displayCount = optimisticCount !== null ? optimisticCount : (post.likes_count || 0)
  const displayBookmarked = optimisticBookmarked !== null ? optimisticBookmarked : hasBookmarked

  // Handle fire reaction
  const handleFireReaction = async () => {
    if (!userId || isLiking) return

    setIsLiking(true)
    // Optimistic update
    const newLiked = !displayLiked
    const newCount = newLiked ? displayCount + 1 : Math.max(0, displayCount - 1)
    setOptimisticLiked(newLiked)
    setOptimisticCount(newCount)

    try {
      await toggleLike({ postId: post._id, userId })
      // Also record as interaction for algorithm
      if (newLiked) {
        await recordInteraction({
          userId,
          postId: post._id,
          interactionType: 'like',
        })
      }
    } catch (error) {
      // Revert on error
      setOptimisticLiked(null)
      setOptimisticCount(null)
      console.error('Failed to toggle like:', error)
    } finally {
      setIsLiking(false)
      // Clear optimistic state after a short delay to let query update
      setTimeout(() => {
        setOptimisticLiked(null)
        setOptimisticCount(null)
      }, 500)
    }
  }

  // Handle bookmark
  const handleBookmark = async () => {
    if (!userId || isBookmarking) return

    setIsBookmarking(true)
    const newBookmarked = !displayBookmarked
    setOptimisticBookmarked(newBookmarked)

    try {
      await toggleBookmark({ postId: post._id, userId })
    } catch (error) {
      setOptimisticBookmarked(null)
      console.error('Failed to toggle bookmark:', error)
    } finally {
      setIsBookmarking(false)
      setTimeout(() => {
        setOptimisticBookmarked(null)
      }, 500)
    }
  }

  // Handle book with barber (tracks conversion)
  const handleBookWithBarber = async () => {
    if (!post.author || !onBookWithBarber) return

    // Record high-value interaction
    if (userId) {
      recordInteraction({
        userId,
        postId: post._id,
        interactionType: 'book',
      }).catch(console.error)
    }

    onBookWithBarber({
      ...post.author,
      branchId: post.branch_id
    })
  }

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
  const isVacation = post.post_type === 'vacation'

  // Format vacation date range
  const formatVacationDates = () => {
    if (!post.vacation_start || !post.vacation_end) return null
    const start = new Date(post.vacation_start)
    const end = new Date(post.vacation_end)
    const formatDate = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
    return `${formatDate(start)} - ${formatDate(end)}`
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-[20px] overflow-hidden ${
        isVacation
          ? 'bg-gradient-to-r from-red-900/30 to-orange-900/30 border-2 border-red-500/40'
          : 'bg-[#1A1A1A] border border-[#2A2A2A]'
      }`}
    >
      {/* Vacation Alert Banner */}
      {isVacation && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 flex items-center gap-2">
          <Palmtree className="w-4 h-4 text-red-400" />
          <span className="text-sm font-bold text-red-400">Away Notice</span>
          {formatVacationDates() && (
            <span className="text-xs text-red-300/80 ml-auto">
              {formatVacationDates()}
            </span>
          )}
        </div>
      )}

      {/* Personalized indicator */}
      {post._personalized && (
        <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 px-4 py-1.5 flex items-center gap-2 border-b border-[var(--color-primary)]/20">
          <Sparkles className="w-3 h-3 text-[var(--color-primary)]" />
          <span className="text-[10px] font-medium text-[var(--color-primary)]">For You</span>
        </div>
      )}

      {/* Post Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {/* Post Type Badge or Author Avatar */}
          {post.author ? (
            <button
              onClick={handleAuthorClick}
              className={`relative ${post.author.slug ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : 'cursor-default'}`}
              disabled={!post.author.slug}
            >
              <img
                src={post.author.avatar || '/img/avatar_default.jpg'}
                alt={post.author.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-[var(--color-primary)]/30"
              />
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
                <TypeIcon className={`w-3 h-3 ${typeConfig.color}`} />
              </div>
            </button>
          ) : (
            <div className={`w-10 h-10 rounded-full ${typeConfig.bgColor} flex items-center justify-center`}>
              <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAuthorClick}
                disabled={!post.author?.slug}
                className={`text-sm font-bold text-white ${post.author?.slug ? 'hover:underline cursor-pointer' : 'cursor-default'}`}
              >
                {post.author?.name || typeConfig.label}
              </button>
              {post.pinned && (
                <Pin className="w-3 h-3 text-[var(--color-primary)]" />
              )}
              {/* BT3: Shoppable indicator */}
              {post.is_shoppable && (
                <ShoppableBadge productCount={post.tagged_products?.length} />
              )}
            </div>
            <span className="text-xs text-gray-500">{getRelativeTime(post.createdAt)}</span>
          </div>
        </div>

        <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Post Image */}
      {postImage && (
        <div className="relative aspect-square bg-[#0A0A0A]">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-[var(--color-primary)]/30 border-t-[var(--color-primary)] rounded-full animate-spin" />
            </div>
          )}
          <img
            src={postImage}
            alt="Post image"
            className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      )}

      {/* Content - Details first */}
      <div className="px-4 pt-3">
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
      </div>

      {/* BT3: Shoppable Products - Show tagged products */}
      {post.is_shoppable && post.tagged_products?.length > 0 && (
        <ShoppableProducts
          postId={post._id}
          userId={userId}
          onAddToCart={(item) => {
            // Handle cart addition - could show toast or update cart state
            console.log('Added to cart:', item)
          }}
        />
      )}

      {/* Engagement Actions - Reactions & Book after content */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Fire Reaction Button */}
          <button
            onClick={handleFireReaction}
            disabled={!userId || isLiking}
            className={`flex items-center gap-1.5 group transition-all ${
              !userId ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            <div className={`p-2 rounded-full transition-all ${
              displayLiked
                ? 'bg-orange-500/20'
                : 'bg-transparent group-hover:bg-white/5'
            }`}>
              <Flame
                className={`w-5 h-5 transition-all ${
                  displayLiked
                    ? 'text-orange-500 fill-orange-500'
                    : 'text-gray-400 group-hover:text-orange-400'
                } ${isLiking ? 'animate-pulse' : ''}`}
              />
            </div>
            {displayCount > 0 && (
              <span className={`text-sm font-bold transition-colors ${
                displayLiked ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {displayCount.toLocaleString()}
              </span>
            )}
          </button>

          {/* Save/Bookmark Button - Now functional! */}
          <button
            onClick={handleBookmark}
            disabled={!userId || isBookmarking}
            className={`p-2 rounded-full transition-colors group ${
              !userId ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            }`}
            title={displayBookmarked ? 'Remove from saved' : 'Save for later'}
          >
            <Bookmark
              className={`w-5 h-5 transition-all ${
                displayBookmarked
                  ? 'text-[var(--color-primary)] fill-[var(--color-primary)]'
                  : 'text-gray-400 group-hover:text-white'
              } ${isBookmarking ? 'animate-pulse' : ''}`}
            />
          </button>

          {/* View Count */}
          {post.view_count > 0 && (
            <span className="text-xs text-gray-500">
              {post.view_count.toLocaleString()} views
            </span>
          )}
        </div>

        {/* Quick Book CTA - Show for barber posts (not vacation) */}
        {post.author && !isVacation && onBookWithBarber && (
          <button
            onClick={handleBookWithBarber}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] text-white text-xs font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all"
          >
            <Scissors className="w-3.5 h-3.5" />
            Book
          </button>
        )}
      </div>
    </div>
  )
}

// Main SocialFeed Component with For You algorithm
const SocialFeed = ({ branchId, userId, limit = 10, showFilters = true, onBookWithBarber }) => {
  const [feedMode, setFeedMode] = useState('foryou') // 'foryou' or 'recent'
  const [activeFilter, setActiveFilter] = useState('all')

  // For You personalized feed
  const forYouPosts = useQuery(
    api.services.feedAlgorithm.getForYouFeed,
    feedMode === 'foryou' ? {
      userId: userId || undefined,
      branchId: branchId || undefined,
      limit: limit * 2, // Get more for better personalization
    } : 'skip'
  )

  // Recent (chronological) feed
  const recentPosts = useQuery(
    api.services.feed.getFeedPosts,
    feedMode === 'recent' ? {
      branchId: branchId || undefined,
      limit,
      postType: activeFilter === 'all' ? undefined : activeFilter
    } : 'skip'
  )

  // User's feed profile (for showing personalization status)
  const userProfile = useQuery(
    api.services.feedAlgorithm.getUserFeedProfile,
    userId ? { userId } : 'skip'
  )

  const posts = feedMode === 'foryou' ? forYouPosts : recentPosts

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'showcase', label: 'Showcase' },
    { id: 'announcement', label: 'News' },
    { id: 'promo', label: 'Promos' },
    { id: 'availability', label: 'Available' },
    { id: 'vacation', label: 'Away' },
    { id: 'tip', label: 'Tips' }
  ]

  // Loading state
  if (posts === undefined) {
    return (
      <div className="space-y-4">
        {/* Mode Toggle Skeleton */}
        <div className="flex gap-2 p-1 bg-[#1A1A1A] rounded-xl">
          <div className="flex-1 h-10 bg-[#2A2A2A] rounded-lg animate-pulse" />
          <div className="flex-1 h-10 bg-[#2A2A2A] rounded-lg animate-pulse" />
        </div>
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

  // Mode toggle component
  const ModeToggle = () => (
    <div className="flex gap-1 p-1 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
      <button
        onClick={() => setFeedMode('foryou')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
          feedMode === 'foryou'
            ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <Sparkles className="w-4 h-4" />
        For You
      </button>
      <button
        onClick={() => setFeedMode('recent')}
        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
          feedMode === 'recent'
            ? 'bg-[#2A2A2A] text-white'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        <Clock className="w-4 h-4" />
        Recent
      </button>
    </div>
  )

  // Filter tabs component (only shown in Recent mode)
  const FilterTabs = () => showFilters && feedMode === 'recent' && (
    <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => setActiveFilter(filter.id)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
            activeFilter === filter.id
              ? 'bg-[var(--color-primary)] text-white'
              : 'bg-[#1A1A1A] text-gray-400 hover:text-white border border-[#2A2A2A]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )

  // Personalization status indicator
  const PersonalizationStatus = () => {
    if (feedMode !== 'foryou' || !userId) return null

    const hasProfile = userProfile && userProfile.total_interactions > 0

    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
        hasProfile
          ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
          : 'bg-gray-800 text-gray-500'
      }`}>
        <Sparkles className="w-3 h-3" />
        {hasProfile ? (
          <span>Personalized based on {userProfile.total_interactions} interactions</span>
        ) : (
          <span>Interact with posts to personalize your feed</span>
        )}
      </div>
    )
  }

  // Empty state
  if (!posts || posts.length === 0) {
    return (
      <div className="space-y-4">
        <ModeToggle />
        <FilterTabs />
        <PersonalizationStatus />
        <div className="bg-[#1A1A1A] rounded-[20px] border border-[#2A2A2A] p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
            {feedMode === 'foryou' ? (
              <Sparkles className="w-8 h-8 text-gray-500" />
            ) : (
              <Scissors className="w-8 h-8 text-gray-500" />
            )}
          </div>
          <h3 className="text-lg font-bold text-white mb-2">
            {feedMode === 'foryou'
              ? 'No personalized posts yet'
              : activeFilter === 'all'
                ? 'No posts yet'
                : `No ${filters.find(f => f.id === activeFilter)?.label.toLowerCase()} posts`
            }
          </h3>
          <p className="text-sm text-gray-500">
            {feedMode === 'foryou'
              ? 'Check back soon! As barbers post more content, your personalized feed will grow.'
              : activeFilter === 'all'
                ? 'Check back soon for updates, showcases, and announcements!'
                : 'Try selecting a different filter above.'
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <ModeToggle />
      <FilterTabs />
      <PersonalizationStatus />

      {/* Posts */}
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            userId={userId}
            onBookWithBarber={onBookWithBarber}
          />
        ))}
      </div>
    </div>
  )
}

export default SocialFeed
