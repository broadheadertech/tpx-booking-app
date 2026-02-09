// Modern Booking Components
// Phase 1: Quick Wins - Calendar, Time Slots, Progress, Confetti
// Phase 2: Core Upgrades - Service Cards, Barber Cards, Smart Recommendations
// Phase 3: Premium Experience - Skeletons, Animations, Haptics, Pull-to-Refresh

// Phase 1: Quick Wins
export { default as CalendarStrip } from './CalendarStrip'
export { default as TimeSlotPills } from './TimeSlotPills'
export { default as StepProgressDots, StepProgressBar } from './StepProgressDots'
export { default as SuccessConfetti, SuccessCheckmark } from './SuccessConfetti'

// Phase 2: Core Upgrades
export { default as ServiceCard, ServiceCardGrid, ServiceCategoryTabs } from './ServiceCard'
export { default as BarberCard, BarberCardCompact, BarberCardGrid } from './BarberCard'
export { default as SmartRecommendations, QuickBookBanner } from './SmartRecommendations'

// Phase 3: Premium Experience - Skeleton Loaders
export {
  ServiceCardSkeleton,
  BarberCardSkeleton,
  TimeSlotSkeleton,
  CalendarSkeleton,
  BookingSummarySkeleton,
  RecommendationSkeleton,
  GenericSkeleton,
  SkeletonGroup
} from './SkeletonLoaders'

// Phase 3: Premium Experience - Micro-Animations
export {
  AnimatedCard,
  FadeIn,
  PopIn,
  Stagger,
  AnimatedCounter,
  PulseOnChange,
  FloatingAnimation,
  GlowEffect,
  ShakeOnError,
  SlideInPanel,
  AnimatedCheckmark,
  useInView
} from './MicroAnimations'

// Phase 3: Premium Experience - Haptic Feedback
export {
  useHaptic,
  HapticButton,
  HapticTouchable,
  HapticToggle,
  HapticSlider,
  withHaptic,
  HapticProvider,
  useHapticContext
} from './HapticFeedback'

// Phase 3: Premium Experience - Pull to Refresh
export { default as PullToRefresh, SimplePullToRefresh, useRefreshControl } from './PullToRefresh'
