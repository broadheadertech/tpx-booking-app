import { useState } from 'react'
import { MessageCircle, Timer, Wallet, Clock, Loader2 } from 'lucide-react'

/**
 * PracticalNeeds - Practical preferences step
 * Users select conversation style, speed, budget, and time preferences
 */
const PracticalNeeds = ({ initialData = {}, onComplete, isSubmitting }) => {
  const [data, setData] = useState({
    conversation: initialData.conversation || null,
    speed: initialData.speed || null,
    budget: initialData.budget || 'any',
    timePreference: initialData.timePreference || 'flexible'
  })

  const conversationOptions = [
    { id: 'chatty', label: 'Chatty', description: 'Love a good conversation', icon: '💬' },
    { id: 'balanced', label: 'Balanced', description: 'Talk when it flows', icon: '⚖️' },
    { id: 'quiet', label: 'Quiet', description: 'Prefer minimal small talk', icon: '🤫' }
  ]

  const speedOptions = [
    { id: 'fast', label: 'Quick', description: 'Get in, get out', icon: '⚡' },
    { id: 'moderate', label: 'Standard', description: 'Normal pace', icon: '⏱️' },
    { id: 'detailed', label: 'Detailed', description: 'Take your time', icon: '✨' }
  ]

  const budgetOptions = [
    { id: 'budget', label: 'Budget', description: 'Best value' },
    { id: 'mid', label: 'Mid-range', description: 'Quality balance' },
    { id: 'premium', label: 'Premium', description: 'Top tier' },
    { id: 'any', label: "Don't mind", description: 'Flexible' }
  ]

  const timeOptions = [
    { id: 'weekday_am', label: 'Weekday AM', icon: '🌅' },
    { id: 'weekday_pm', label: 'Weekday PM', icon: '🌆' },
    { id: 'weekend', label: 'Weekends', icon: '📅' },
    { id: 'flexible', label: 'Flexible', icon: '✨' }
  ]

  const handleSubmit = () => {
    onComplete(data)
  }

  const isValid = data.conversation && data.speed

  return (
    <div className="flex-1 flex flex-col p-4 overflow-auto">
      {/* Conversation Style */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-white font-semibold text-sm">Conversation Style</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {conversationOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setData(prev => ({ ...prev, conversation: option.id }))}
              className={`p-3 rounded-xl border-2 transition-all active:scale-95 ${
                data.conversation === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A]'
              }`}
            >
              <span className="text-2xl block mb-1">{option.icon}</span>
              <span className="text-white text-xs font-semibold block">{option.label}</span>
              <span className="text-gray-500 text-[10px] block">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Speed Preference */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-white font-semibold text-sm">Service Speed</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {speedOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setData(prev => ({ ...prev, speed: option.id }))}
              className={`p-3 rounded-xl border-2 transition-all active:scale-95 ${
                data.speed === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A]'
              }`}
            >
              <span className="text-2xl block mb-1">{option.icon}</span>
              <span className="text-white text-xs font-semibold block">{option.label}</span>
              <span className="text-gray-500 text-[10px] block">{option.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Budget Preference */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Wallet className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-white font-semibold text-sm">Budget</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          {budgetOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setData(prev => ({ ...prev, budget: option.id }))}
              className={`px-4 py-2 rounded-full border transition-all active:scale-95 ${
                data.budget === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] text-gray-400'
              }`}
            >
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Preference */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-[var(--color-primary)]" />
          <h3 className="text-white font-semibold text-sm">Preferred Time</h3>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {timeOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setData(prev => ({ ...prev, timePreference: option.id }))}
              className={`p-2 rounded-xl border transition-all active:scale-95 ${
                data.timePreference === option.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A]'
              }`}
            >
              <span className="text-xl block mb-0.5">{option.icon}</span>
              <span className="text-white text-[10px] font-medium block">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="mt-auto pt-4">
        <button
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
          className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Finding Your Match...
            </>
          ) : (
            'Find My Match'
          )}
        </button>

        {!isValid && (
          <p className="text-center text-gray-500 text-xs mt-2">
            Please select conversation style and speed preference
          </p>
        )}
      </div>
    </div>
  )
}

export default PracticalNeeds
