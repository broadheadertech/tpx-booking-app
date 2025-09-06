import React, { useState, useEffect } from 'react'
import { Sparkles, Scissors, Bot, Calendar, Star, ArrowRight, CheckCircle, ChevronLeft, User } from 'lucide-react'

const PremiumOnboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  const steps = [
    {
        id: 'welcome',
        title: 'Welcome to Tipuno X',
        subtitle: 'Your Premium Barbershop Experience',
        content: (
          <div className="text-center space-y-8">
            <div className="relative mx-auto w-32 h-32 mb-8">
              <img 
                src="/img/pnglog.png" 
                alt="Tipuno X Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-white mb-4">Welcome to Tipuno X Barbershop</h1>
              <p className="text-gray-300 text-lg leading-relaxed max-w-lg mx-auto">
                We're excited to have you here! Let us show you what makes our barbershop special and how we can help you look your absolute best.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-8 max-w-sm mx-auto">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <Star className="w-8 h-8 text-[#FF8C42] mx-auto mb-2" />
                <p className="text-white font-medium text-sm">Expert Barbers</p>
              </div>
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <Calendar className="w-8 h-8 text-[#FF8C42] mx-auto mb-2" />
                <p className="text-white font-medium text-sm">Easy Booking</p>
              </div>
            </div>
          </div>
        )
      },
    {
        id: 'ai-assistant',
        title: 'Style Consultation',
        subtitle: 'Get personalized recommendations',
        content: (
          <div className="text-center space-y-8">
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="bg-gray-800 rounded-full flex items-center justify-center shadow-xl w-full h-full border-2 border-[#FF8C42]/30">
                <Scissors className="w-12 h-12 text-[#FF8C42]" />
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">Expert Style Consultation</h2>
              <p className="text-gray-300 text-lg leading-relaxed max-w-lg mx-auto">
                Our experienced barbers will help you find the perfect style that complements your face shape, lifestyle, and personal preferences.
              </p>
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 max-w-md mx-auto">
                <div className="flex items-center space-x-4">
                  <div className="bg-[#FF8C42]/20 p-3 rounded-lg">
                    <User className="w-6 h-6 text-[#FF8C42]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-white">Personalized Service</p>
                    <p className="text-gray-400 text-sm">Tailored to your unique style</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      },
    {
        id: 'features',
        title: 'What We Offer',
        subtitle: 'Services designed with you in mind',
        content: (
          <div className="space-y-6">
            <div className="grid gap-4 max-w-xl mx-auto">
              <div className="flex items-start space-x-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                <div className="bg-[#FF8C42]/20 p-3 rounded-lg">
                  <Calendar className="w-6 h-6 text-[#FF8C42]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Easy Booking</h3>
                  <p className="text-gray-400 text-sm">Schedule appointments with your favorite barber at your convenience.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                <div className="bg-[#FF8C42]/20 p-3 rounded-lg">
                  <Scissors className="w-6 h-6 text-[#FF8C42]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Expert Cuts</h3>
                  <p className="text-gray-400 text-sm">Professional haircuts and styling from experienced barbers.</p>
                </div>
              </div>
              <div className="flex items-start space-x-4 p-4 bg-gray-800/30 rounded-xl border border-gray-700/50">
                <div className="bg-[#FF8C42]/20 p-3 rounded-lg">
                  <Star className="w-6 h-6 text-[#FF8C42]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">Quality Service</h3>
                  <p className="text-gray-400 text-sm">Premium treatments and products for the best results.</p>
                </div>
              </div>
            </div>
          </div>
        )
      },
    {
        id: 'ready',
        title: 'You\'re All Set!',
        subtitle: 'Ready to book your appointment',
        content: (
          <div className="text-center space-y-8">
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="bg-green-600 rounded-full flex items-center justify-center shadow-xl w-full h-full">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-white">Welcome to Tipuno X!</h2>
              <p className="text-gray-300 text-lg leading-relaxed max-w-lg mx-auto">
                Thanks for taking the tour! You're now ready to explore everything we have to offer. Book your appointment and let our skilled barbers take care of you.
              </p>
              <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700 max-w-md mx-auto">
                <h3 className="font-semibold text-white text-lg mb-2">Ready to Get Started?</h3>
                <p className="text-gray-400 text-sm leading-relaxed">Browse our services, pick your preferred barber, and schedule your appointment at a time that works for you.</p>
              </div>
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
    // Mark onboarding as completed for this session
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
    <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-900 to-black z-50 overflow-hidden">
      {/* Subtle background texture */}
       <div className="absolute inset-0">
         <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#FF8C42]/3 rounded-full blur-3xl"></div>
         <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#FF7A2B]/2 rounded-full blur-3xl"></div>
         <div className="absolute inset-0 bg-[url('/img/pnglog.png')] bg-center bg-no-repeat opacity-[0.02] bg-contain"></div>
       </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 md:p-8">
          <div className="flex items-center space-x-4">
             <img 
               src="/img/tipuno_x_logo_white.avif" 
               alt="TipunoX Angeles Logo" 
               className="w-16 h-16 object-contain"
             />
             <div>
               <h1 className="text-white font-bold text-lg">Tipuno X</h1>
               <p className="text-gray-400 text-sm">Premium Barbershop</p>
             </div>
           </div>
          <button
            onClick={handleSkip}
            className="text-gray-400 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-gray-800/50"
          >
            Skip
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 md:px-8 mb-8">
          <div className="max-w-md mx-auto">
            <div className="flex space-x-3 mb-4">
              {steps.map((_, index) => (
                <div
                   key={index}
                   className={`h-1 rounded-full flex-1 transition-all duration-500 ${
                     index <= currentStep 
                       ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B]' 
                       : 'bg-gray-700'
                   }`}
                 />
              ))}
            </div>
            <p className="text-gray-400 text-sm text-center">
              {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-8">
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {currentStepData.title}
              </h1>
              <p className="text-xl text-gray-300">
                {currentStepData.subtitle}
              </p>
            </div>
            <div className="transition-all duration-500 ease-in-out">
              {currentStepData.content}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="p-6 md:p-8">
          <div className="max-w-md mx-auto flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={isFirstStep}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                isFirstStep
                  ? 'text-gray-600 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF8C42]/90 hover:to-[#FF7A2B]/90 text-white px-8 py-3 rounded-xl font-semibold flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <span>{isLastStep ? 'Get Started' : 'Continue'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PremiumOnboarding