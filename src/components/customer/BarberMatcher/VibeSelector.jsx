import { useState } from 'react'
import { Gem, Zap, Flame, Sparkles, Check } from 'lucide-react'

/**
 * VibeSelector - Style vibe selection step
 * Users select one or more vibes that match their style preference
 */
const VibeSelector = ({ selectedVibes: initialVibes = [], onSelect, onSkip }) => {
  const [selected, setSelected] = useState(initialVibes)

  const vibes = [
    {
      id: 'classic',
      label: 'Classic',
      description: 'Timeless, traditional cuts',
      icon: Gem,
      color: 'from-amber-500 to-yellow-600',
      bgColor: 'bg-amber-500/20',
      examples: 'Side part, Pompadour, Ivy League'
    },
    {
      id: 'trendy',
      label: 'Trendy',
      description: 'Modern, fashion-forward styles',
      icon: Sparkles,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/20',
      examples: 'Textured crop, French crop, Curtains'
    },
    {
      id: 'edgy',
      label: 'Edgy',
      description: 'Bold, experimental looks',
      icon: Zap,
      color: 'from-red-500 to-orange-500',
      bgColor: 'bg-red-500/20',
      examples: 'Mohawk, Undercut designs, Bold fades'
    },
    {
      id: 'clean',
      label: 'Clean',
      description: 'Minimalist, precise cuts',
      icon: Flame,
      color: 'from-cyan-500 to-blue-500',
      bgColor: 'bg-cyan-500/20',
      examples: 'Buzz cut, Crew cut, Skin fade'
    }
  ]

  const toggleVibe = (vibeId) => {
    setSelected(prev =>
      prev.includes(vibeId)
        ? prev.filter(v => v !== vibeId)
        : [...prev, vibeId]
    )
  }

  const handleContinue = () => {
    onSelect(selected)
  }

  return (
    <div className="flex-1 flex flex-col p-4 overflow-auto">
      {/* Instructions */}
      <p className="text-center text-gray-400 text-sm mb-6">
        Select one or more styles that appeal to you
      </p>

      {/* Vibe Cards */}
      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
        {vibes.map((vibe) => {
          const Icon = vibe.icon
          const isSelected = selected.includes(vibe.id)

          return (
            <button
              key={vibe.id}
              onClick={() => toggleVibe(vibe.id)}
              className={`relative p-4 rounded-2xl border-2 transition-all active:scale-95 ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[#2A2A2A] bg-[#1A1A1A] hover:border-[#3A3A3A]'
              }`}
            >
              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${vibe.color} flex items-center justify-center mb-3 mx-auto`}>
                <Icon className="w-6 h-6 text-white" />
              </div>

              {/* Label */}
              <h3 className="text-white font-bold text-center mb-1">{vibe.label}</h3>
              <p className="text-gray-500 text-xs text-center">{vibe.description}</p>

              {/* Examples */}
              <p className="text-gray-600 text-[10px] text-center mt-2 line-clamp-1">
                {vibe.examples}
              </p>
            </button>
          )
        })}
      </div>

      {/* Selected count */}
      {selected.length > 0 && (
        <p className="text-center text-[var(--color-primary)] text-sm mt-4">
          {selected.length} style{selected.length > 1 ? 's' : ''} selected
        </p>
      )}

      {/* Actions */}
      <div className="mt-auto pt-6 space-y-3 max-w-md mx-auto w-full">
        <button
          onClick={handleContinue}
          className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl active:scale-[0.98] transition-transform"
        >
          Continue
        </button>

        <button
          onClick={onSkip}
          className="w-full py-3 text-gray-500 text-sm hover:text-white transition-colors"
        >
          Skip, I'm open to anything
        </button>
      </div>
    </div>
  )
}

export default VibeSelector
