import React, { useState, useEffect } from 'react'
import { Scissors, Calendar, Star, ArrowRight, CheckCircle, ChevronLeft } from 'lucide-react'
import { useBranding } from '../../context/BrandingContext'

const PremiumOnboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const { branding } = useBranding()
// okay
  const steps = [
    {
        id: 'welcome',
        title: 'Welcome to' + branding?.display_name,
        subtitle: 'Premium Barbershop Experience',
        content: (
          <div className="text-center space-y-8">
            <div className="flex justify-center mb-6">
              <img 
                src={branding?.logo_light_url}
                alt="Logo" 
                className="w-40 h-40 object-contain drop-shadow-2xl"
              />
            </div>
            <div className="space-y-4 max-w-lg mx-auto">
              <p className="text-gray-300 text-lg leading-relaxed">
                Book appointments with expert barbers, earn rewards, and enjoy premium service.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
              <div className="bg-[var(--color-primary)]/10 p-4 rounded-xl border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/15 transition-all">
                <Scissors className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Expert</p>
              </div>
              <div className="bg-[var(--color-primary)]/10 p-4 rounded-xl border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/15 transition-all">
                <Calendar className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Booking</p>
              </div>
              <div className="bg-[var(--color-primary)]/10 p-4 rounded-xl border border-[var(--color-primary)]/30 hover:bg-[var(--color-primary)]/15 transition-all">
                <Star className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-2" />
                <p className="text-white font-semibold text-sm">Rewards</p>
              </div>
            </div>
          </div>
        )
      },
    {
        id: 'booking',
        title: 'Easy Booking',
        subtitle: 'Schedule at your convenience',
        content: (
          <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="flex items-center justify-center h-48">
              <img 
                src={branding?.logo_light_url}
                alt="Logo" 
                className="w-40 h-40 object-contain drop-shadow-2xl"
              />
            </div>
            <p className="text-gray-300 text-lg leading-relaxed">
              Browse available time slots, choose your favorite barber, and confirm your appointment in seconds.
            </p>
            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-sm text-[var(--color-primary)] font-semibold">💡 Tip</p>
              <p className="text-xs text-gray-400 mt-1">Get reminders before your appointment</p>
            </div>
          </div>
        )
      },
    {
        id: 'rewards',
        title: 'Earn Rewards',
        subtitle: 'Unlock exclusive benefits',
        content: (
          <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="bg-[var(--color-primary)]/10 rounded-3xl p-12 border border-[var(--color-primary)]/30 flex items-center justify-center h-48">
              <Star className="w-24 h-24 text-[var(--color-primary)]" />
            </div>
            <p className="text-gray-300 text-base leading-relaxed">
              Earn points with every visit and redeem them for discounts, free services, and exclusive offers.
            </p>
            <div className="bg-[#1A1A1A] rounded-lg p-4 border border-[#2A2A2A]">
              <p className="text-sm text-[var(--color-primary)] font-semibold">✨ Bonus</p>
              <p className="text-xs text-gray-400 mt-1">Limited-time vouchers just for you</p>
            </div>
          </div>
        )
      },
    {
        id: 'ready',
        title: 'You\'re All Set!',
        subtitle: 'Ready to get started',
        content: (
          <div className="text-center space-y-8 max-w-lg mx-auto">
            <div className="bg-[var(--color-primary)]/10 rounded-3xl p-12 border border-[var(--color-primary)]/30 flex items-center justify-center h-48">
              <CheckCircle className="w-24 h-24 text-[var(--color-primary)]" />
            </div>
            <p className="text-gray-300 text-base leading-relaxed">
              Everything is ready. Start booking your appointments and experience premium barbershop service.
            </p>
            <div className="bg-gradient-to-r from-[var(--color-primary)]/20 to-[var(--color-accent)]/20 rounded-lg p-4 border border-[var(--color-primary)]/30">
              <p className="text-xs text-gray-300">Your profile is ready and you're all set to book!</p>
            </div>
          </div>
        )
      }
  ]

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    sessionStorage.setItem('onboarding_completed', 'true')
    setIsVisible(false)
    setTimeout(() => {
      onComplete()
    }, 300)
  }

  const handleSkip = () => {
    handleComplete()
  }

  if (!isVisible) return null

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isFirstStep = currentStep === 0

  return (
    <div className="fixed inset-0 bg-[#0A0A0A] z-50 overflow-hidden">
      {/* Minimal background gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl opacity-50"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Minimal */}
        <div className="flex justify-between items-center px-6 py-4 md:px-8 md:py-6">
          <div>
            <img 
              src={branding?.logo_light_url}
              alt="TipunoX Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-gray-200 transition-colors text-sm font-medium"
          >
            Skip
          </button>
        </div>

        {/* Progress Bar - Minimal */}
        <div className="px-6 md:px-8">
          <div className="max-w-sm mx-auto">
            <div className="flex space-x-2">
              {steps.map((_, index) => (
                <div
                   key={index}
                   className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                     index <= currentStep 
                       ? 'bg-[var(--color-primary)]' 
                       : 'bg-[#2A2A2A]'
                   }`}
                 />
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-8 py-8">
          <div className="w-full max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {currentStepData.title}
              </h1>
              <p className="text-sm md:text-base text-gray-400">
                {currentStepData.subtitle}
              </p>
            </div>
            <div className="transition-all duration-500 ease-in-out">
              {currentStepData.content}
            </div>
          </div>
        </div>

        {/* Footer Navigation - Minimal */}
        <div className="px-6 md:px-8 pb-6">
          <div className="max-w-sm mx-auto flex justify-between items-center gap-4">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
                isFirstStep
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleNext}
              className="flex-1 bg-[var(--color-primary)] hover:bg-[var(--color-accent)] text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-all duration-200"
            >
              <span>{isLastStep ? 'Get Started' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumOnboarding