import { useState, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { X, ChevronLeft, Sparkles } from 'lucide-react'
import StyleSwipeStep from './StyleSwipeStep'
import VibeSelector from './VibeSelector'
import PracticalNeeds from './PracticalNeeds'
import MatchResult from './MatchResult'

/**
 * MatcherQuiz - Main component for "Help Me Choose" barber recommendation quiz
 * 4-step flow: Swipe → Vibe → Practical Needs → Result
 */
const MatcherQuiz = ({ userId, branchId, onClose, onBookBarber }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [quizData, setQuizData] = useState({
    likedImages: [],      // Images swiped right
    vibes: [],            // Selected style vibes
    conversation: null,   // Conversation preference
    speed: null,          // Speed preference
    budget: 'any',        // Budget preference
    timePreference: 'flexible'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const savePreferences = useMutation(api.services.barberMatcher.saveUserPreferences)
  const recordSwipe = useMutation(api.services.barberMatcher.recordSwipe)
  const recordMatchResult = useMutation(api.services.barberMatcher.recordMatchResult)

  // Get showcase images for swipe step
  const showcaseImages = useQuery(
    api.services.barberMatcher.getShowcaseImages,
    { branchId, limit: 10 }
  )

  // Get matched barbers based on quiz data
  const matchedBarbers = useQuery(
    api.services.barberMatcher.getMatchedBarbers,
    currentStep === 3 ? {
      userId,
      branchId,
      vibes: quizData.vibes.length > 0 ? quizData.vibes : undefined,
      conversation: quizData.conversation || undefined,
      speed: quizData.speed || undefined,
      budget: quizData.budget || undefined,
      limit: 3
    } : 'skip'
  )

  const steps = [
    { id: 'swipe', title: 'Style Preferences', subtitle: 'Swipe right on cuts you like' },
    { id: 'vibe', title: "What's Your Style?", subtitle: 'Select vibes that match you' },
    { id: 'practical', title: 'Your Preferences', subtitle: 'What matters most?' },
    { id: 'result', title: 'Your Perfect Match!', subtitle: "We found your barber" }
  ]

  // Handle swipe completion
  const handleSwipeComplete = async (likedImages, allSwipes) => {
    setQuizData(prev => ({ ...prev, likedImages }))

    // Record swipes in background
    if (userId) {
      for (const swipe of allSwipes) {
        try {
          await recordSwipe({
            userId,
            imageUrl: swipe.imageUrl,
            barberId: swipe.barberId,
            liked: swipe.liked,
            styleTags: swipe.styleTags
          })
        } catch (e) {
          console.error('Failed to record swipe:', e)
        }
      }
    }

    setCurrentStep(1)
  }

  // Handle vibe selection
  const handleVibeSelect = (vibes) => {
    setQuizData(prev => ({ ...prev, vibes }))
    setCurrentStep(2)
  }

  // Handle practical needs completion
  const handlePracticalComplete = async (data) => {
    const updatedData = { ...quizData, ...data }
    setQuizData(updatedData)

    // Save preferences
    if (userId) {
      setIsSubmitting(true)
      try {
        await savePreferences({
          userId,
          vibes: updatedData.vibes.length > 0 ? updatedData.vibes : undefined,
          conversation: updatedData.conversation || undefined,
          speed: updatedData.speed || undefined,
          budget: updatedData.budget || undefined,
          timePreference: updatedData.timePreference || undefined
        })
      } catch (e) {
        console.error('Failed to save preferences:', e)
      }
      setIsSubmitting(false)
    }

    setCurrentStep(3)
  }

  // Handle booking from match result
  const handleBook = async (barber) => {
    // Record the match result
    if (userId) {
      try {
        await recordMatchResult({
          userId,
          barberId: barber.barberId,
          matchScore: barber.matchScore,
          matchReasons: barber.matchReasons,
          resultedInBooking: true
        })
      } catch (e) {
        console.error('Failed to record match:', e)
      }
    }

    // Navigate to booking
    onBookBarber(barber)
    onClose()
  }

  // Go back
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    } else {
      onClose()
    }
  }

  // Progress indicator
  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-4 pt-safe">
        <div className="flex items-center justify-between py-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            {currentStep === 0 ? (
              <X className="w-5 h-5 text-white" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-white" />
            )}
          </button>

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
              <h2 className="text-lg font-bold text-white">{steps[currentStep].title}</h2>
            </div>
            <p className="text-xs text-gray-400">{steps[currentStep].subtitle}</p>
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {currentStep === 0 && (
          <StyleSwipeStep
            images={showcaseImages || []}
            onComplete={handleSwipeComplete}
            onSkip={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 1 && (
          <VibeSelector
            selectedVibes={quizData.vibes}
            onSelect={handleVibeSelect}
            onSkip={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <PracticalNeeds
            initialData={{
              conversation: quizData.conversation,
              speed: quizData.speed,
              budget: quizData.budget,
              timePreference: quizData.timePreference
            }}
            onComplete={handlePracticalComplete}
            isSubmitting={isSubmitting}
          />
        )}

        {currentStep === 3 && (
          <MatchResult
            matchedBarbers={matchedBarbers || []}
            isLoading={!matchedBarbers}
            onBook={handleBook}
            onRetake={() => {
              setCurrentStep(0)
              setQuizData({
                likedImages: [],
                vibes: [],
                conversation: null,
                speed: null,
                budget: 'any',
                timePreference: 'flexible'
              })
            }}
          />
        )}
      </div>
    </div>
  )
}

export default MatcherQuiz
