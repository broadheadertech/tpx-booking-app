import { useState, useRef, useEffect } from 'react'
import { Heart, X, SkipForward, Loader2 } from 'lucide-react'

/**
 * StyleSwipeStep - Tinder-style swipe interface for haircut preferences
 * Users swipe right on styles they like, left on styles they don't
 */
const StyleSwipeStep = ({ images, onComplete, onSkip }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [swipes, setSwipes] = useState([])
  const [swipeDirection, setSwipeDirection] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const cardRef = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })

  const currentImage = images[currentIndex]
  const isComplete = currentIndex >= images.length
  const minSwipes = 5

  // Complete when all images are swiped
  useEffect(() => {
    if (isComplete && swipes.length >= minSwipes) {
      const likedImages = swipes.filter(s => s.liked).map(s => s.imageUrl)
      onComplete(likedImages, swipes)
    }
  }, [isComplete, swipes])

  // Handle swipe action
  const handleSwipe = (liked) => {
    if (!currentImage) return

    setSwipeDirection(liked ? 'right' : 'left')

    // Record the swipe
    const swipeData = {
      imageUrl: currentImage.imageUrl,
      barberId: currentImage.barberId,
      barberName: currentImage.barberName,
      styleTags: currentImage.styleTags,
      liked
    }

    setTimeout(() => {
      setSwipes(prev => [...prev, swipeData])
      setCurrentIndex(prev => prev + 1)
      setSwipeDirection(null)
      setDragOffset({ x: 0, y: 0 })
    }, 300)
  }

  // Touch/Mouse handlers for drag
  const handleDragStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    startPos.current = { x: clientX, y: clientY }
    setIsDragging(true)
  }

  const handleDragMove = (e) => {
    if (!isDragging) return
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const deltaX = clientX - startPos.current.x
    const deltaY = clientY - startPos.current.y
    setDragOffset({ x: deltaX, y: deltaY })
  }

  const handleDragEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const threshold = 100
    if (dragOffset.x > threshold) {
      handleSwipe(true)
    } else if (dragOffset.x < -threshold) {
      handleSwipe(false)
    } else {
      setDragOffset({ x: 0, y: 0 })
    }
  }

  // Loading state
  if (!images || images.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <Loader2 className="w-10 h-10 text-[var(--color-primary)] animate-spin mb-4" />
        <p className="text-gray-400 text-center">Loading style samples...</p>
        <button
          onClick={onSkip}
          className="mt-6 text-sm text-gray-500 hover:text-white"
        >
          Skip this step
        </button>
      </div>
    )
  }

  // Complete state - not enough images
  if (isComplete && swipes.length < minSwipes) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <p className="text-gray-400 text-center mb-4">
          Great job! Let's continue to the next step.
        </p>
        <button
          onClick={() => {
            const likedImages = swipes.filter(s => s.liked).map(s => s.imageUrl)
            onComplete(likedImages, swipes)
          }}
          className="px-6 py-3 bg-[var(--color-primary)] text-white font-bold rounded-xl"
        >
          Continue
        </button>
      </div>
    )
  }

  // Calculate card transform
  const rotation = dragOffset.x * 0.1
  const opacity = 1 - Math.abs(dragOffset.x) / 300
  const likeOpacity = Math.max(0, dragOffset.x / 150)
  const nopeOpacity = Math.max(0, -dragOffset.x / 150)

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4">
      {/* Progress indicator */}
      <div className="flex gap-1.5 mb-6">
        {images.map((_, idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-colors ${
              idx < currentIndex
                ? swipes[idx]?.liked
                  ? 'bg-green-500'
                  : 'bg-red-500'
                : idx === currentIndex
                ? 'bg-white'
                : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Card Stack */}
      <div className="relative w-full max-w-[300px] aspect-[3/4]">
        {/* Next card preview */}
        {images[currentIndex + 1] && (
          <div className="absolute inset-0 rounded-3xl overflow-hidden scale-95 opacity-50">
            <img
              src={images[currentIndex + 1].imageUrl}
              alt="Next"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Current card */}
        {currentImage && (
          <div
            ref={cardRef}
            className={`absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab active:cursor-grabbing transition-transform ${
              !isDragging ? 'duration-300' : 'duration-0'
            } ${swipeDirection === 'right' ? 'translate-x-[150%] rotate-12' : ''} ${
              swipeDirection === 'left' ? '-translate-x-[150%] -rotate-12' : ''
            }`}
            style={{
              transform: isDragging
                ? `translateX(${dragOffset.x}px) translateY(${dragOffset.y}px) rotate(${rotation}deg)`
                : undefined,
            }}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={() => isDragging && handleDragEnd()}
          >
            <img
              src={currentImage.imageUrl}
              alt="Haircut style"
              className="w-full h-full object-cover pointer-events-none"
              draggable={false}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

            {/* Barber info */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold">{currentImage.barberName}</p>
              {currentImage.styleTags && currentImage.styleTags.length > 0 && (
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {currentImage.styleTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white capitalize"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* LIKE overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-green-500/30 transition-opacity"
              style={{ opacity: likeOpacity }}
            >
              <div className="px-6 py-2 border-4 border-green-500 rounded-lg rotate-[-20deg]">
                <span className="text-3xl font-black text-green-500">LIKE</span>
              </div>
            </div>

            {/* NOPE overlay */}
            <div
              className="absolute inset-0 flex items-center justify-center bg-red-500/30 transition-opacity"
              style={{ opacity: nopeOpacity }}
            >
              <div className="px-6 py-2 border-4 border-red-500 rounded-lg rotate-[20deg]">
                <span className="text-3xl font-black text-red-500">NOPE</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-6 mt-8">
        <button
          onClick={() => handleSwipe(false)}
          className="w-16 h-16 rounded-full bg-white/10 border-2 border-red-500/50 flex items-center justify-center hover:bg-red-500/20 active:scale-95 transition-all"
        >
          <X className="w-8 h-8 text-red-500" />
        </button>

        <button
          onClick={onSkip}
          className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
        >
          <SkipForward className="w-5 h-5 text-gray-400" />
        </button>

        <button
          onClick={() => handleSwipe(true)}
          className="w-16 h-16 rounded-full bg-white/10 border-2 border-green-500/50 flex items-center justify-center hover:bg-green-500/20 active:scale-95 transition-all"
        >
          <Heart className="w-8 h-8 text-green-500" />
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-500 mt-4">
        Swipe or tap to choose • {images.length - currentIndex} remaining
      </p>
    </div>
  )
}

export default StyleSwipeStep
