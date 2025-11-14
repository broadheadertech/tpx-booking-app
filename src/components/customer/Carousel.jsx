import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const Carousel = ({ images = [], autoPlay = true, interval = 5000 }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Use default images if none provided
  const displayImages = images && images.length > 0 ? images : [
    '/carousel/IMG_0154-min.JPG',
    '/carousel/IMG_0155-min.JPG',
    '/carousel/IMG_0164-min.JPG',
    '/carousel/IMG_0165-min.JPG',
    '/carousel/IMG_0166-min.JPG',
  ]

  useEffect(() => {
    if (!autoPlay || displayImages.length <= 1) return

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayImages.length)
    }, interval)

    return () => clearInterval(timer)
  }, [autoPlay, interval, displayImages.length])

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % displayImages.length)
  }

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  return (
    <div className="h-56 relative">
      {displayImages.map((img, index) => (
        <div
          key={index}
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundImage: `url(${img})`
          }}
        />
      ))}
      
      {/* Navigation arrows */}
      {displayImages.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/30 hover:bg-black/50 rounded-full flex items-center justify-center transition-all z-10"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}
    </div>
  )
}

export default Carousel

