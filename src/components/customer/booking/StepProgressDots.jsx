import { Check } from 'lucide-react'

/**
 * StepProgressDots - Modern step progress indicator
 *
 * Features:
 * - Clean dot-based design (not numbered)
 * - Animated transitions
 * - Completed step checkmarks
 * - Connecting lines with gradient
 * - Step labels on hover/active
 */
const StepProgressDots = ({
  currentStep,
  totalSteps,
  steps = [], // Array of { label: 'Branch', icon?: Component }
  showLabels = false, // Show labels below dots
  size = 'default' // 'small' | 'default' | 'large'
}) => {
  // Size configurations
  const sizes = {
    small: {
      dot: 'w-2 h-2',
      activeDot: 'w-3 h-3',
      line: 'h-0.5',
      gap: 'gap-1',
      containerGap: 'gap-2'
    },
    default: {
      dot: 'w-2.5 h-2.5',
      activeDot: 'w-4 h-4',
      line: 'h-0.5',
      gap: 'gap-1.5',
      containerGap: 'gap-3'
    },
    large: {
      dot: 'w-3 h-3',
      activeDot: 'w-5 h-5',
      line: 'h-1',
      gap: 'gap-2',
      containerGap: 'gap-4'
    }
  }

  const sizeConfig = sizes[size] || sizes.default

  // Generate steps array if not provided
  const stepsArray = steps.length > 0
    ? steps
    : Array.from({ length: totalSteps }, (_, i) => ({ label: `Step ${i + 1}` }))

  return (
    <div className="flex items-center justify-center">
      <div className={`flex items-center ${sizeConfig.containerGap}`}>
        {stepsArray.map((step, index) => {
          const stepNumber = index + 1
          const isCompleted = stepNumber < currentStep
          const isActive = stepNumber === currentStep
          const isPending = stepNumber > currentStep

          return (
            <div key={index} className="flex items-center">
              {/* Step Dot */}
              <div className="relative flex flex-col items-center">
                <div
                  className={`
                    rounded-full transition-all duration-300 ease-out
                    flex items-center justify-center
                    ${isActive
                      ? `${sizeConfig.activeDot} bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] shadow-lg shadow-[var(--color-primary)]/30`
                      : isCompleted
                        ? `${sizeConfig.dot} bg-[var(--color-primary)]`
                        : `${sizeConfig.dot} bg-[#2A2A2A]`
                    }
                  `}
                >
                  {/* Completed Checkmark */}
                  {isCompleted && size === 'large' && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}

                  {/* Active Pulse */}
                  {isActive && (
                    <div className="absolute inset-0 rounded-full bg-[var(--color-primary)] animate-ping opacity-30" />
                  )}
                </div>

                {/* Step Label */}
                {showLabels && step.label && (
                  <span
                    className={`
                      absolute -bottom-5 text-[10px] font-medium whitespace-nowrap
                      transition-all duration-300
                      ${isActive
                        ? 'text-white opacity-100'
                        : isCompleted
                          ? 'text-[var(--color-primary)] opacity-80'
                          : 'text-gray-500 opacity-60'
                      }
                    `}
                  >
                    {step.label}
                  </span>
                )}
              </div>

              {/* Connecting Line */}
              {index < stepsArray.length - 1 && (
                <div
                  className={`
                    ${sizeConfig.line} w-6 sm:w-8 mx-1 rounded-full overflow-hidden
                    bg-[#2A2A2A] relative
                  `}
                >
                  {/* Progress Fill */}
                  <div
                    className={`
                      absolute inset-y-0 left-0 rounded-full
                      transition-all duration-500 ease-out
                      ${isCompleted || isActive
                        ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)]'
                        : 'bg-transparent'
                      }
                    `}
                    style={{
                      width: isCompleted ? '100%' : isActive ? '50%' : '0%'
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * StepProgressBar - Alternative linear progress style
 */
export const StepProgressBar = ({
  currentStep,
  totalSteps
}) => {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100

  return (
    <div className="w-full">
      <div className="h-1 bg-[#2A2A2A] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-gray-500">Step {currentStep} of {totalSteps}</span>
        <span className="text-xs text-[var(--color-primary)]">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

export default StepProgressDots
