import React, { useState, useEffect } from 'react'
import { Camera, Upload, ArrowLeft, Scissors, User, Star, CheckCircle, ChevronRight, Bot, Sparkles, Image, Loader } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { aiBarberService } from '../../services/aiBarberService'
import HaircutImageSearch from './HaircutImageSearch'

const AIBarberAssistant = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedImage, setUploadedImage] = useState(null)
  const [userPreferences, setUserPreferences] = useState({
    faceShape: '',
    hairType: '',
    lifestyle: '',
    maintenance: ''
  })
  const [recommendations, setRecommendations] = useState([])
  const [selectedRecommendation, setSelectedRecommendation] = useState(null)
  const [isGeneratingRecommendations, setIsGeneratingRecommendations] = useState(false)
  const [aiError, setAiError] = useState(null)

  // Fetch services and barbers from Convex
  const services = useQuery(api.services.services.getActiveServices)
  const barbers = useQuery(api.services.barbers.getActiveBarbers)

  const steps = [
    { id: 1, title: 'Upload Your Photo', subtitle: 'Let us analyze your face shape' },
    { id: 2, title: 'Tell Us About You', subtitle: 'Help us understand your preferences' },
    { id: 3, title: 'Your Recommendations', subtitle: 'Personalized haircut suggestions' },
    { id: 4, title: 'Browse Haircut Styles', subtitle: 'Explore visual examples' },
    { id: 5, title: 'Book Your Appointment', subtitle: 'Schedule with your preferred barber' }
  ]

  const faceShapes = [
    { id: 'oval', name: 'Oval', description: 'Balanced proportions' },
    { id: 'round', name: 'Round', description: 'Soft, curved features' },
    { id: 'square', name: 'Square', description: 'Strong jawline' },
    { id: 'heart', name: 'Heart', description: 'Wider forehead, narrow chin' },
    { id: 'diamond', name: 'Diamond', description: 'Narrow forehead and chin' },
    { id: 'oblong', name: 'Oblong', description: 'Longer than wide' }
  ]

  const hairTypes = [
    { id: 'straight', name: 'Straight', description: 'Naturally straight hair' },
    { id: 'wavy', name: 'Wavy', description: 'Slight waves and texture' },
    { id: 'curly', name: 'Curly', description: 'Defined curls' },
    { id: 'coily', name: 'Coily', description: 'Tight coils and kinks' }
  ]

  const lifestyles = [
    { id: 'professional', name: 'Professional', description: 'Office/business environment' },
    { id: 'casual', name: 'Casual', description: 'Relaxed, everyday style' },
    { id: 'active', name: 'Active', description: 'Sports and fitness focused' },
    { id: 'creative', name: 'Creative', description: 'Artistic and expressive' }
  ]

  const maintenanceLevels = [
    { id: 'low', name: 'Low Maintenance', description: '2-3 months between cuts' },
    { id: 'medium', name: 'Medium Maintenance', description: '4-6 weeks between cuts' },
    { id: 'high', name: 'High Maintenance', description: '2-3 weeks between cuts' }
  ]

  // AI-powered recommendations based on preferences
  const generateRecommendations = async () => {
    setIsGeneratingRecommendations(true)
    setAiError(null)
    
    try {
      const aiRecommendations = await aiBarberService.generatePersonalizedRecommendations(
        userPreferences,
        uploadedImage
      )
      
      // Map AI recommendations to include service IDs
      const enhancedRecommendations = aiRecommendations.map((rec, index) => ({
        ...rec,
        image: `/img/haircut-${rec.name.toLowerCase().replace(/\s+/g, '-')}.jpg`,
        serviceId: services?.[index % services?.length]?._id || null
      }))
      
      setRecommendations(enhancedRecommendations)
    } catch (error) {
      console.error('AI recommendation failed:', error)
      setAiError(error.message)
      
      // Fallback to basic recommendations
      const fallbackRecommendations = [
        {
          id: 1,
          name: 'Classic Fade',
          description: 'A versatile cut that works well with most face shapes and lifestyles.',
          suitability: 90,
          maintenance: 'Medium',
          serviceId: services?.[0]?._id,
          benefits: ['Professional look', 'Easy to style', 'Versatile']
        },
        {
          id: 2,
          name: 'Textured Crop',
          description: 'Modern and low-maintenance, perfect for busy lifestyles.',
          suitability: 85,
          maintenance: 'Low',
          serviceId: services?.[1]?._id,
          benefits: ['Low maintenance', 'Trendy', 'Natural texture']
        }
      ]
      setRecommendations(fallbackRecommendations)
    } finally {
      setIsGeneratingRecommendations(false)
    }
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNext = async () => {
    console.log('handleNext called, currentStep:', currentStep, 'canProceed:', canProceed())
    console.log('userPreferences:', userPreferences)
    
    if (currentStep < 5) {
      if (currentStep === 2) {
        await generateRecommendations()
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-28 h-28 bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-2xl flex items-center justify-center border border-gray-600/30 mb-3 shadow-lg">
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded" className="w-full h-full object-cover rounded-2xl" />
          ) : (
            <Camera className="w-8 h-8 text-gray-400" />
          )}
        </div>
        <p className="text-gray-300 text-sm leading-relaxed px-2">
          Upload a clear photo to analyze your face shape and get personalized recommendations.
        </p>
      </div>
      
      <div className="space-y-3">
        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <div className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white px-6 py-3 rounded-xl font-medium flex items-center justify-center space-x-2 transition-all duration-200 cursor-pointer shadow-lg">
            <Upload className="w-4 h-4" />
            <span>Upload Photo</span>
          </div>
        </label>
        
        <div className="bg-gradient-to-br from-[#333333]/60 to-[#444444]/60 p-4 rounded-xl border border-gray-600/30">
          <h4 className="text-white font-medium text-sm mb-3">Photo Tips:</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-[#FF8C42] rounded-full"></div>
              <span>Good lighting</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-[#FF8C42] rounded-full"></div>
              <span>Face camera directly</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-[#FF8C42] rounded-full"></div>
              <span>Remove accessories</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-[#FF8C42] rounded-full"></div>
              <span>Clear view of face</span>
            </div>
          </div>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-3 pt-2">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[80px] ${
              currentStep === 1
                ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/70 border border-gray-600/50'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed() || currentStep === 5 || (currentStep === 2 && isGeneratingRecommendations)}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[140px] ${
              canProceed() && currentStep < 5 && !(currentStep === 2 && isGeneratingRecommendations)
                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white shadow-lg shadow-[#FF8C42]/20'
                : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
            }`}
          >
            {currentStep === 2 && isGeneratingRecommendations ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <span>{currentStep === 5 ? 'Complete' : currentStep === 2 ? 'Generate Recommendations' : 'Continue'}</span>
                {currentStep < 5 && <ChevronRight className="w-4 h-4" />}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-white font-medium text-base mb-1">Tell us about your style</h3>
        <p className="text-gray-400 text-sm">Help us create the perfect recommendation for you</p>
      </div>

      <div>
        <h3 className="text-white font-medium text-sm mb-2">Hair type</h3>
        <div className="grid grid-cols-2 gap-2">
          {hairTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setUserPreferences(prev => ({ ...prev, hairType: type.id, faceShape: 'oval' }))}
              className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                userPreferences.hairType === type.id
                  ? 'bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border-[#FF8C42]/60 text-white shadow-lg'
                  : 'bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-600/30 text-gray-300 hover:border-gray-500/50'
              }`}
            >
              <div className="font-medium text-sm">{type.name}</div>
              <div className="text-xs text-gray-400 mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium text-sm mb-2">Lifestyle</h3>
        <div className="grid grid-cols-2 gap-2">
          {lifestyles.map((lifestyle) => (
            <button
              key={lifestyle.id}
              onClick={() => setUserPreferences(prev => ({ ...prev, lifestyle: lifestyle.id }))}
              className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                userPreferences.lifestyle === lifestyle.id
                  ? 'bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border-[#FF8C42]/60 text-white shadow-lg'
                  : 'bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-600/30 text-gray-300 hover:border-gray-500/50'
              }`}
            >
              <div className="font-medium text-sm">{lifestyle.name}</div>
              <div className="text-xs text-gray-400 mt-1">{lifestyle.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-white font-medium text-sm mb-2">Maintenance preference</h3>
        <div className="grid grid-cols-3 gap-2">
          {maintenanceLevels.map((level) => (
            <button
              key={level.id}
              onClick={() => setUserPreferences(prev => ({ ...prev, maintenance: level.id }))}
              className={`p-3 rounded-xl border transition-all duration-200 text-center ${
                userPreferences.maintenance === level.id
                  ? 'bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border-[#FF8C42]/60 text-white shadow-lg'
                  : 'bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-600/30 text-gray-300 hover:border-gray-500/50'
              }`}
            >
              <div className="font-medium text-sm">{level.name.replace(' Maintenance', '')}</div>
              <div className="text-xs text-gray-400 mt-1">{level.description.split(' ')[0]}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-3 pt-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[80px] ${
            currentStep === 1
              ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/70 border border-gray-600/50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <button
          onClick={handleNext}
          disabled={!canProceed() || currentStep === 5 || (currentStep === 2 && isGeneratingRecommendations)}
          className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[140px] ${
            canProceed() && currentStep < 5 && !(currentStep === 2 && isGeneratingRecommendations)
              ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white shadow-lg shadow-[#FF8C42]/20'
              : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
          }`}
        >
          {currentStep === 2 && isGeneratingRecommendations ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <span>{currentStep === 5 ? 'Complete' : currentStep === 2 ? 'Generate Recommendations' : 'Continue'}</span>
              {currentStep < 5 && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Bot className="w-4 h-4 text-[#FF8C42]" />
          <h3 className="text-white font-medium text-base">AI Recommendations</h3>
          <Sparkles className="w-4 h-4 text-[#FF8C42]" />
        </div>
        <p className="text-gray-400 text-sm">Personalized suggestions based on your preferences</p>
        {aiError && (
          <p className="text-yellow-400 text-xs mt-2 bg-yellow-400/10 px-3 py-2 rounded-lg border border-yellow-400/20">
            AI service unavailable - showing fallback recommendations
          </p>
        )}
      </div>
      
      {isGeneratingRecommendations ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF8C42] border-t-transparent"></div>
            <span className="text-gray-300 text-sm">AI analyzing your preferences...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedRecommendation?.id === rec.id
                  ? 'bg-gradient-to-r from-[#FF8C42]/20 to-[#FF7A2B]/20 border-[#FF8C42]/60 shadow-lg'
                  : 'bg-gradient-to-br from-gray-800/40 to-gray-700/40 border-gray-600/30 hover:border-gray-500/50'
              }`}
              onClick={() => setSelectedRecommendation(rec)}
            >
              <div className="space-y-3">
                {/* Header with title and rating */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium text-sm">{rec.name}</h4>
                    {!aiError && (
                      <div className="bg-[#FF8C42]/20 px-1.5 py-0.5 rounded-full">
                        <span className="text-[#FF8C42] text-xs font-medium">AI</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 text-[#FF8C42] fill-current" />
                    <span className="text-[#FF8C42] font-medium text-xs">{rec.suitability}%</span>
                  </div>
                </div>

                {/* Haircut Images */}
                {rec.images && rec.images.length > 0 && (
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {rec.images.map((image, index) => (
                      <div key={index} className="flex-shrink-0">
                        <img
                          src={image.thumbnail || image.url}
                          alt={`${rec.name} style ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border border-gray-600/30"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Description and benefits */}
                <div>
                  <p className="text-gray-400 text-xs mb-3 leading-relaxed">{rec.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {rec.benefits.slice(0, 3).map((benefit, index) => (
                      <span
                        key={index}
                        className="bg-gray-700/40 text-gray-300 px-2 py-0.5 rounded-lg text-xs"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-3 pt-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 1 || isGeneratingRecommendations}
          className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[80px] ${
            currentStep === 1 || isGeneratingRecommendations
              ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/70 border border-gray-600/50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <button
            onClick={handleNext}
            disabled={!canProceed() || currentStep === 5 || isGeneratingRecommendations}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[100px] ${
              canProceed() && currentStep < 5 && !isGeneratingRecommendations
                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white shadow-lg shadow-[#FF8C42]/20'
                : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>{currentStep === 5 ? 'Complete' : 'Continue'}</span>
            {currentStep < 5 && <ChevronRight className="w-4 h-4" />}
          </button>
      </div>
    </div>
  )

  const renderStep4 = () => {
    const searchQuery = selectedRecommendation ? selectedRecommendation.name : 'men haircut styles'
    
    return (
      <div className="space-y-4">
        {selectedRecommendation && (
          <div className="bg-gradient-to-r from-[#FF8C42]/10 to-[#FF7A2B]/10 p-4 rounded-xl border border-[#FF8C42]/30">
            <h3 className="text-white font-medium text-sm mb-1">Exploring: {selectedRecommendation.name}</h3>
            <p className="text-gray-400 text-xs">Browse similar styles and get inspired</p>
          </div>
        )}
        
        <HaircutImageSearch 
          searchQuery={searchQuery}
          onImageSelect={(image) => {
            console.log('Selected image:', image)
            // You can add logic here to save the selected image or show it in the next step
          }}
        />
        
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center gap-3 pt-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[80px] ${
              currentStep === 1
                ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/70 border border-gray-600/50'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          
          <button
            onClick={handleNext}
            disabled={currentStep === 5}
            className={`flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[100px] ${
              currentStep < 5
                ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white shadow-lg shadow-[#FF8C42]/20'
                : 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  const renderStep5 = () => (
    <div className="space-y-4">
      {selectedRecommendation && (
        <div className="bg-gradient-to-r from-[#FF8C42]/10 to-[#FF7A2B]/10 p-4 rounded-xl border border-[#FF8C42]/30">
          <h3 className="text-white font-medium text-sm mb-1">Selected: {selectedRecommendation.name}</h3>
          <p className="text-gray-400 text-xs">{selectedRecommendation.description}</p>
        </div>
      )}
      
      <div>
        <h3 className="text-white font-medium text-sm mb-3">Choose Your Barber</h3>
        <div className="space-y-2">
          {barbers?.slice(0, 3).map((barber) => (
            <div
              key={barber._id}
              className="flex items-center space-x-3 p-3 bg-gradient-to-br from-gray-800/40 to-gray-700/40 rounded-xl border border-gray-600/30"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-full flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium text-sm">{barber.name}</h4>
                <p className="text-gray-400 text-xs truncate">{barber.specialties?.join(', ') || 'Professional Barber'}</p>
              </div>
              <button className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] hover:from-[#FF7A2B] hover:to-[#FF6B1A] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 shadow-lg">
                Book
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-green-600/20 to-green-500/20 border border-green-600/40 p-4 rounded-xl">
        <div className="flex items-center space-x-2 mb-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <h4 className="text-green-400 font-medium text-sm">Ready to Transform!</h4>
        </div>
        <p className="text-gray-300 text-xs leading-relaxed">
          Your personalized style is ready. Select a barber to book your appointment.
        </p>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between items-center gap-3 pt-4">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm min-w-[80px] ${
            currentStep === 1
              ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
              : 'bg-gray-700/50 text-gray-200 hover:bg-gray-600/70 border border-gray-600/50'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        
        <div className="bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white px-6 py-2.5 rounded-xl font-medium text-sm">
          Complete
        </div>
      </div>
    </div>
  )

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return renderStep1()
      case 2:
        return renderStep2()
      case 3:
        return renderStep3()
      case 4:
        return renderStep4()
      case 5:
        return renderStep5()
      default:
        return renderStep1()
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return uploadedImage !== null
      case 2:
        return userPreferences.hairType && userPreferences.lifestyle && userPreferences.maintenance
      case 3:
        return selectedRecommendation !== null
      case 4:
        return true // Image browsing is optional
      default:
        return true
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
      </div>

      <div className="relative z-10 max-w-md mx-auto">
        {/* Compact Header */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
          <div className="px-4 py-3">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] rounded-xl flex items-center justify-center shadow-lg">
                <Scissors className="w-4 h-4 text-white" />
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center space-x-2">
                  <h1 className="text-white font-bold text-base">AI Style Assistant</h1>
                  <Bot className="w-4 h-4 text-[#FF8C42]" />
                </div>
                <p className="text-gray-400 text-xs">Personalized recommendations powered by AI</p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Stepper Progress Indicator */}
        <div className="px-4 py-3 bg-[#1A1A1A]/95 border-b border-[#333333]/50">
          <div className="flex justify-center items-center mb-2">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="relative">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${
                        currentStep >= step.id
                          ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-md'
                          : 'bg-[#2A2A2A] border border-[#444444] text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        step.id
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="w-6 mx-1">
                      <div
                        className={`h-0.5 rounded-full transition-all duration-500 ${
                          currentStep > step.id ? 'bg-[#FF8C42]' : 'bg-[#444444]'
                        }`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-white font-medium text-sm">{steps[currentStep - 1]?.title}</h2>
            <p className="text-gray-400 text-xs">{steps[currentStep - 1]?.subtitle}</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-4 py-3 pb-3">
          {renderCurrentStep()}
        </div>

      </div>
    </div>
  )
}

export default AIBarberAssistant