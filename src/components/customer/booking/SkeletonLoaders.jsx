import { useEffect, useState } from 'react'

/**
 * Phase 3: Premium Experience - Skeleton Loaders
 *
 * Beautiful shimmer loading placeholders that match the actual content:
 * - ServiceCardSkeleton
 * - BarberCardSkeleton
 * - TimeSlotSkeleton
 * - CalendarSkeleton
 * - BookingSummarySkeleton
 */

// Base shimmer animation component
const Shimmer = ({ className = '', children }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
)

// Add shimmer keyframes to document if not exists
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-shimmer-styles'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
      @keyframes pulse-subtle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    `
    document.head.appendChild(style)
  }
}

/**
 * ServiceCardSkeleton - Matches ServiceCard layout
 */
export const ServiceCardSkeleton = ({ count = 1 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
          <div className="flex items-start gap-4">
            {/* Emoji placeholder */}
            <div className="w-12 h-12 rounded-xl bg-[#2A2A2A]" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Title */}
              <div className="h-4 w-32 rounded bg-[#2A2A2A]" />
              {/* Description */}
              <div className="h-3 w-48 rounded bg-[#2A2A2A]" />
              {/* Tags */}
              <div className="flex gap-2 pt-1">
                <div className="h-5 w-16 rounded-full bg-[#2A2A2A]" />
                <div className="h-5 w-20 rounded-full bg-[#2A2A2A]" />
              </div>
            </div>

            {/* Price */}
            <div className="text-right space-y-1">
              <div className="h-5 w-16 rounded bg-[#2A2A2A]" />
              <div className="h-3 w-12 rounded bg-[#2A2A2A]" />
            </div>
          </div>
        </Shimmer>
      ))}
    </div>
  )
}

/**
 * BarberCardSkeleton - Matches BarberCard layout
 */
export const BarberCardSkeleton = ({ count = 1, compact = false }) => {
  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <Shimmer key={i} className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-3">
            <div className="flex flex-col items-center">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#2A2A2A] mb-2" />
              {/* Name */}
              <div className="h-4 w-20 rounded bg-[#2A2A2A] mb-1" />
              {/* Rating */}
              <div className="h-3 w-12 rounded bg-[#2A2A2A]" />
            </div>
          </Shimmer>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-4">
          <div className="flex gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-[#2A2A2A]" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              {/* Name */}
              <div className="h-5 w-28 rounded bg-[#2A2A2A]" />
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="h-4 w-10 rounded bg-[#2A2A2A]" />
                <div className="h-3 w-20 rounded bg-[#2A2A2A]" />
              </div>
              {/* Specialty tags */}
              <div className="flex gap-1.5 pt-1">
                <div className="h-5 w-14 rounded-full bg-[#2A2A2A]" />
                <div className="h-5 w-18 rounded-full bg-[#2A2A2A]" />
                <div className="h-5 w-16 rounded-full bg-[#2A2A2A]" />
              </div>
            </div>
          </div>
        </Shimmer>
      ))}
    </div>
  )
}

/**
 * TimeSlotSkeleton - Matches TimeSlotPills layout
 */
export const TimeSlotSkeleton = ({ count = 8 }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Shimmer
          key={i}
          className="h-10 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]"
          style={{ width: `${60 + Math.random() * 20}px` }}
        >
          <div className="w-full h-full" />
        </Shimmer>
      ))}
    </div>
  )
}

/**
 * CalendarSkeleton - Matches CalendarStrip layout
 */
export const CalendarSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Month selector */}
      <Shimmer className="flex items-center justify-between">
        <div className="h-8 w-32 rounded-lg bg-[#2A2A2A]" />
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A]" />
          <div className="w-8 h-8 rounded-lg bg-[#2A2A2A]" />
        </div>
      </Shimmer>

      {/* Date pills */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={i} className="flex-shrink-0 w-14 h-20 rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A]">
            <div className="flex flex-col items-center justify-center h-full space-y-2 p-2">
              <div className="h-3 w-8 rounded bg-[#2A2A2A]" />
              <div className="h-6 w-6 rounded-full bg-[#2A2A2A]" />
            </div>
          </Shimmer>
        ))}
      </div>
    </div>
  )
}

/**
 * BookingSummarySkeleton - For confirmation/summary screens
 */
export const BookingSummarySkeleton = () => {
  return (
    <Shimmer className="rounded-2xl bg-[#1A1A1A] border border-[#2A2A2A] p-6 space-y-4">
      {/* Service info */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#2A2A2A]" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-40 rounded bg-[#2A2A2A]" />
          <div className="h-4 w-24 rounded bg-[#2A2A2A]" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#2A2A2A]" />

      {/* Details */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-4 w-20 rounded bg-[#2A2A2A]" />
          <div className="h-4 w-32 rounded bg-[#2A2A2A]" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-16 rounded bg-[#2A2A2A]" />
          <div className="h-4 w-24 rounded bg-[#2A2A2A]" />
        </div>
        <div className="flex justify-between">
          <div className="h-4 w-24 rounded bg-[#2A2A2A]" />
          <div className="h-4 w-28 rounded bg-[#2A2A2A]" />
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-[#2A2A2A]" />

      {/* Total */}
      <div className="flex justify-between items-center">
        <div className="h-5 w-16 rounded bg-[#2A2A2A]" />
        <div className="h-7 w-24 rounded bg-[#2A2A2A]" />
      </div>
    </Shimmer>
  )
}

/**
 * RecommendationSkeleton - For SmartRecommendations
 */
export const RecommendationSkeleton = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {/* Title */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-4 h-4 rounded bg-[#2A2A2A]" />
        <div className="h-4 w-36 rounded bg-[#2A2A2A]" />
      </div>

      {Array.from({ length: count }).map((_, i) => (
        <Shimmer key={i} className="rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#151515] border border-[#2A2A2A] p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-[#2A2A2A]" />

            {/* Content */}
            <div className="flex-1 space-y-2">
              <div className="h-3 w-20 rounded bg-[#2A2A2A]" />
              <div className="h-4 w-32 rounded bg-[#2A2A2A]" />
              <div className="h-3 w-24 rounded bg-[#2A2A2A]" />
            </div>

            {/* Arrow */}
            <div className="w-5 h-5 rounded bg-[#2A2A2A]" />
          </div>
        </Shimmer>
      ))}
    </div>
  )
}

/**
 * GenericSkeleton - Flexible skeleton for custom layouts
 */
export const GenericSkeleton = ({
  width = '100%',
  height = '20px',
  rounded = 'rounded',
  className = ''
}) => {
  return (
    <Shimmer
      className={`bg-[#2A2A2A] ${rounded} ${className}`}
      style={{ width, height }}
    />
  )
}

/**
 * SkeletonGroup - Wrapper with staggered fade-in
 */
export const SkeletonGroup = ({ children, stagger = true }) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  return (
    <div className={`transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  )
}

export default {
  ServiceCardSkeleton,
  BarberCardSkeleton,
  TimeSlotSkeleton,
  CalendarSkeleton,
  BookingSummarySkeleton,
  RecommendationSkeleton,
  GenericSkeleton,
  SkeletonGroup
}
