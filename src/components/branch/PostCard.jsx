import { useState, useEffect, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Image as ImageIcon,
  Tag,
  Megaphone,
  Lightbulb,
  Calendar,
  Eye,
  Pin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

/**
 * Post Card Component
 * Social feed style card for branch posts
 */
const PostCard = ({ post }) => {
  const [imageError, setImageError] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const postRef = useRef(null)

  const trackView = useMutation(api.services.branchPosts.trackPostView)

  // Track view when post becomes visible
  useEffect(() => {
    if (hasTrackedView || !postRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView) {
            // Post is visible, track the view
            trackView({ postId: post._id }).catch(() => {
              // Silently fail - view tracking is not critical
            })
            setHasTrackedView(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.5 } // Track when 50% of post is visible
    )

    observer.observe(postRef.current)

    return () => observer.disconnect()
  }, [post._id, hasTrackedView, trackView])

  // Format date
  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`
      }
      return `${diffHours}h ago`
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  // Get post type icon and color
  const getPostTypeStyle = (type) => {
    switch (type) {
      case 'showcase':
        return { icon: ImageIcon, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Showcase' }
      case 'promo':
        return { icon: Tag, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Promo' }
      case 'availability':
        return { icon: Calendar, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Available' }
      case 'announcement':
        return { icon: Megaphone, color: 'text-purple-400', bg: 'bg-purple-500/10', label: 'News' }
      case 'tip':
        return { icon: Lightbulb, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Tip' }
      default:
        return { icon: ImageIcon, color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Post' }
    }
  }

  const typeStyle = getPostTypeStyle(post.post_type)
  const TypeIcon = typeStyle.icon
  const hasImages = post.images && post.images.length > 0 && !imageError

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % post.images.length)
  }

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + post.images.length) % post.images.length)
  }

  return (
    <div
      ref={postRef}
      className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden hover:border-[#3A3A3A] transition-colors"
    >
      {/* Header - Author Info */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Author avatar */}
          <div className="w-10 h-10 rounded-full overflow-hidden bg-[var(--color-primary)]/20 ring-2 ring-[#333]">
            {post.author.avatar ? (
              <img
                src={post.author.avatar}
                alt={post.author.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--color-primary)] font-semibold">
                {post.author.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div>
            <p className="text-white font-medium text-sm">
              {post.author.name}
            </p>
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span>{formatDate(post.createdAt)}</span>
              <span>•</span>
              <div className={`flex items-center gap-1 ${typeStyle.color}`}>
                <TypeIcon className="w-3 h-3" />
                <span>{typeStyle.label}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned badge */}
        {post.pinned && (
          <div className="px-2.5 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-medium rounded-full flex items-center gap-1">
            <Pin className="w-3 h-3" />
            Pinned
          </div>
        )}
      </div>

      {/* Post content - before image */}
      <div className="px-4 pb-3">
        <p className="text-gray-200 text-[15px] leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Images */}
      {hasImages && (
        <div className="relative bg-[#0D0D0D]">
          <div className="aspect-[4/3]">
            <img
              src={post.images[selectedImage]}
              alt="Post"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>

          {/* Navigation arrows for multiple images */}
          {post.images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Image counter */}
              <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 rounded-full text-white text-xs font-medium">
                {selectedImage + 1} / {post.images.length}
              </div>

              {/* Dots indicator */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === selectedImage
                        ? 'bg-white w-4'
                        : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Footer - View count */}
      {post.view_count > 0 && (
        <div className="px-4 py-3 border-t border-[#2A2A2A]">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm">
            <Eye className="w-4 h-4" />
            <span>{post.view_count.toLocaleString()} views</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostCard
