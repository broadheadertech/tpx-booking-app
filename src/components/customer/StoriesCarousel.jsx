import { useState, useEffect, useCallback } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { X, Flame, Clock } from 'lucide-react'

const STORY_DURATION = 5000 // 5 seconds per story

/**
 * StoriesCarousel - Instagram-style stories showing branch posts
 * Displays circular avatars with gradient rings for branches with recent posts (last 24 hours)
 * Only shows posts from branch admins and super admins (barbers post to their portfolio instead)
 */
const StoriesCarousel = ({ onStoryOpen, onStoryClose }) => {
  const [selectedStory, setSelectedStory] = useState(null)
  const [currentPostIndex, setCurrentPostIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Get barbers with their recent posts
  const barbersWithPosts = useQuery(api.services.feed.getBarbersWithRecentPosts)

  const closeStory = useCallback(() => {
    setSelectedStory(null)
    setCurrentPostIndex(0)
    setProgress(0)
    if (onStoryClose) onStoryClose()
  }, [onStoryClose])

  const nextPost = useCallback(() => {
    if (!barbersWithPosts) return

    if (selectedStory && currentPostIndex < selectedStory.recentPosts.length - 1) {
      setCurrentPostIndex(prev => prev + 1)
      setProgress(0)
    } else {
      // Move to next barber's story
      const currentIndex = barbersWithPosts.findIndex(b => b._id === selectedStory?._id)
      if (currentIndex < barbersWithPosts.length - 1) {
        setSelectedStory(barbersWithPosts[currentIndex + 1])
        setCurrentPostIndex(0)
        setProgress(0)
      } else {
        closeStory()
      }
    }
  }, [selectedStory, currentPostIndex, barbersWithPosts, closeStory])

  const prevPost = useCallback(() => {
    if (!barbersWithPosts) return

    if (currentPostIndex > 0) {
      setCurrentPostIndex(prev => prev - 1)
      setProgress(0)
    } else {
      // Move to previous barber's story
      const currentIndex = barbersWithPosts.findIndex(b => b._id === selectedStory?._id)
      if (currentIndex > 0) {
        const prevBarber = barbersWithPosts[currentIndex - 1]
        setSelectedStory(prevBarber)
        setCurrentPostIndex(prevBarber.recentPosts.length - 1)
        setProgress(0)
      }
    }
  }, [currentPostIndex, barbersWithPosts, selectedStory])

  // Auto-advance timer
  useEffect(() => {
    if (!selectedStory || isPaused) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          nextPost()
          return 0
        }
        return prev + (100 / (STORY_DURATION / 50))
      })
    }, 50)

    return () => clearInterval(interval)
  }, [selectedStory, isPaused, nextPost])

  // Pause on touch/hold
  const handleTouchStart = useCallback(() => setIsPaused(true), [])
  const handleTouchEnd = useCallback(() => setIsPaused(false), [])

  const handleStoryClick = useCallback((barber) => {
    setSelectedStory(barber)
    setCurrentPostIndex(0)
    setProgress(0)
    if (onStoryOpen) onStoryOpen()
  }, [onStoryOpen])

  // Format time ago
  const formatTimeAgo = useCallback((timestamp) => {
    const now = Date.now()
    const diff = now - timestamp
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }, [])

  // Early return AFTER all hooks
  if (!barbersWithPosts || barbersWithPosts.length === 0) {
    return null
  }

  return (
    <>
      {/* Stories Row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {barbersWithPosts.map((barber) => (
          <button
            key={barber._id}
            onClick={() => handleStoryClick(barber)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            {/* Avatar with gradient ring */}
            <div className="relative">
              <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-[var(--color-primary)] via-[var(--color-primary)] to-[var(--color-accent)]">
                <div className="w-full h-full rounded-full p-[2px] bg-[var(--color-bg)]">
                  <img
                    src={barber.avatar || '/img/avatar_default.jpg'}
                    alt={barber.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
              </div>
              {/* Post count badge */}
              {barber.recentPosts.length > 1 && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[var(--color-bg)]">
                  {barber.recentPosts.length}
                </div>
              )}
            </div>
            {/* Name */}
            <span className="text-xs text-gray-400 max-w-[64px] truncate">
              {barber.name || 'Branch'}
            </span>
          </button>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && selectedStory.recentPosts.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col"
          onMouseDown={handleTouchStart}
          onMouseUp={handleTouchEnd}
          onMouseLeave={handleTouchEnd}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2 pt-3">
            {selectedStory.recentPosts.map((_, index) => (
              <div
                key={index}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width: index < currentPostIndex ? '100%' :
                           index === currentPostIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-10 flex items-center justify-between px-4 pt-4">
            <div className="flex items-center gap-3">
              <img
                src={selectedStory.avatar || '/img/avatar_default.jpg'}
                alt={selectedStory.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
              />
              <div>
                <p className="text-white font-semibold text-sm">{selectedStory.name}</p>
                <p className="text-white/60 text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(selectedStory.recentPosts[currentPostIndex]?.createdAt)}
                </p>
              </div>
            </div>
            <button
              onClick={closeStory}
              className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex items-center justify-center p-4 pt-20 pb-24">
            {selectedStory.recentPosts[currentPostIndex]?.images?.[0] ? (
              <img
                src={selectedStory.recentPosts[currentPostIndex].images[0]}
                alt="Story"
                className="max-w-full max-h-full object-contain rounded-2xl"
              />
            ) : (
              <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] rounded-2xl p-8 max-w-sm">
                <p className="text-white text-lg font-medium leading-relaxed">
                  {selectedStory.recentPosts[currentPostIndex]?.content}
                </p>
              </div>
            )}
          </div>

          {/* Caption (if has image) */}
          {selectedStory.recentPosts[currentPostIndex]?.images?.[0] &&
           selectedStory.recentPosts[currentPostIndex]?.content && (
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <p className="text-white text-sm">
                {selectedStory.recentPosts[currentPostIndex].content}
              </p>
              <div className="flex items-center gap-2 mt-2 text-white/60 text-xs">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>{selectedStory.recentPosts[currentPostIndex].likes_count || 0}</span>
              </div>
            </div>
          )}

          {/* Navigation zones */}
          <button
            onClick={prevPost}
            className="absolute left-0 top-20 bottom-24 w-1/3"
            aria-label="Previous"
          />
          <button
            onClick={nextPost}
            className="absolute right-0 top-20 bottom-24 w-2/3"
            aria-label="Next"
          />
        </div>
      )}
    </>
  )
}

export default StoriesCarousel
