import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight, ChevronLeft } from 'lucide-react'

/**
 * WalkthroughOverlay — Tooltip-based step-by-step guided tour
 *
 * Props:
 *  steps[]        — Array of { target, title, message, position?, action? }
 *                   action: optional CSS selector to click before measuring target
 *                          (e.g. click a dropdown button so inner items become visible)
 *  onComplete     — Called when user finishes the tour
 *  onSkip         — Called when user skips the tour
 *  isVisible      — Controls visibility externally
 */
const WalkthroughOverlay = ({ steps = [], onComplete, onSkip, isVisible = true }) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState(null)
  const [tooltipStyle, setTooltipStyle] = useState({})
  const [isAnimating, setIsAnimating] = useState(false)
  const tooltipRef = useRef(null)
  const rafRef = useRef(null)

  const step = steps[currentStep]
  const totalSteps = steps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  // Measure target element and compute tooltip position
  const measureTarget = useCallback(() => {
    if (!step?.target) return

    const el = document.querySelector(step.target)
    if (!el) {
      setTargetRect(null)
      return
    }

    const rect = el.getBoundingClientRect()
    const padding = 6
    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    })
  }, [step])

  // Compute tooltip placement
  useEffect(() => {
    if (!targetRect) return

    const pos = step?.position || 'bottom'
    const gap = 16
    const tooltipWidth = Math.min(300, window.innerWidth - 32)
    const style = { width: tooltipWidth }

    if (pos === 'bottom') {
      style.top = targetRect.top + targetRect.height + gap
      style.left = Math.max(16, Math.min(
        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - 16
      ))
    } else if (pos === 'top') {
      style.bottom = window.innerHeight - targetRect.top + gap
      style.left = Math.max(16, Math.min(
        targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        window.innerWidth - tooltipWidth - 16
      ))
    } else if (pos === 'left') {
      style.top = targetRect.top + targetRect.height / 2 - 40
      style.right = window.innerWidth - targetRect.left + gap
    } else if (pos === 'right') {
      style.top = targetRect.top + targetRect.height / 2 - 40
      style.left = targetRect.left + targetRect.width + gap
    }

    setTooltipStyle(style)
  }, [targetRect, step])

  // Run step action (e.g. open dropdown) and then measure target
  useEffect(() => {
    if (!isVisible) return

    setIsAnimating(true)
    const timer = setTimeout(() => setIsAnimating(false), 300)

    // If the step has an action selector, click it first so the target becomes visible
    if (step?.action) {
      const actionEl = document.querySelector(step.action)
      if (actionEl) {
        actionEl.click()
        // Wait for dropdown to render before measuring
        const measureTimer = setTimeout(measureTarget, 150)
        const handleChange = () => {
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
          rafRef.current = requestAnimationFrame(measureTarget)
        }
        window.addEventListener('resize', handleChange)
        window.addEventListener('scroll', handleChange, true)
        return () => {
          clearTimeout(timer)
          clearTimeout(measureTimer)
          window.removeEventListener('resize', handleChange)
          window.removeEventListener('scroll', handleChange, true)
          if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
      }
    }

    measureTarget()

    const handleChange = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measureTarget)
    }

    window.addEventListener('resize', handleChange)
    window.addEventListener('scroll', handleChange, true)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleChange)
      window.removeEventListener('scroll', handleChange, true)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [currentStep, isVisible, measureTarget, step])

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1)
    } else {
      onComplete?.()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleSkip = () => {
    onSkip?.()
  }

  if (!isVisible || !step || totalSteps === 0) return null

  // SVG overlay with cutout for spotlight
  const renderOverlay = () => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // If step has an action (opened a dropdown), don't dismiss on overlay click
    const overlayClick = step?.action ? (e) => e.stopPropagation() : handleSkip

    if (!targetRect) {
      // No target found — dim entire screen
      return (
        <div
          className="fixed inset-0 z-[9998]"
          style={{ backgroundColor: 'rgba(10, 10, 10, 0.85)' }}
          onClick={overlayClick}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )
    }

    const r = 8 // border-radius of cutout
    const { top, left, width, height } = targetRect

    return (
      <svg
        className="fixed inset-0 z-[9998]"
        width={vw}
        height={vh}
        style={{ pointerEvents: 'auto' }}
        onClick={overlayClick}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <defs>
          <mask id="walkthrough-mask">
            <rect x="0" y="0" width={vw} height={vh} fill="white" />
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              rx={r}
              ry={r}
              fill="black"
            />
          </mask>
        </defs>
        {/* Dark overlay with hole */}
        <rect
          x="0" y="0"
          width={vw} height={vh}
          fill="rgba(10, 10, 10, 0.85)"
          mask="url(#walkthrough-mask)"
        />
        {/* Glow border around cutout */}
        <rect
          x={left}
          y={top}
          width={width}
          height={height}
          rx={r}
          ry={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          strokeOpacity="0.5"
        />
        {/* Outer glow */}
        <rect
          x={left - 3}
          y={top - 3}
          width={width + 6}
          height={height + 6}
          rx={r + 3}
          ry={r + 3}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1"
          strokeOpacity="0.2"
        />
      </svg>
    )
  }

  const renderTooltip = () => (
    <div
      ref={tooltipRef}
      className={`fixed z-[9999] transition-all duration-300 ${
        isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
      style={tooltipStyle}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Progress bar */}
      <div className="h-1 bg-[#2A2A2A] rounded-t-xl overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, var(--color-primary), var(--color-accent))',
          }}
        />
      </div>

      {/* Tooltip card */}
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-b-xl p-4 shadow-2xl shadow-black/60">
        {/* Step counter + Skip */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] text-gray-500 font-medium">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <button
            onClick={handleSkip}
            className="text-[11px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Skip Tour
          </button>
        </div>

        {/* Title */}
        <h3 className="text-white font-semibold text-sm mb-1">
          {step.title}
        </h3>

        {/* Message */}
        <p className="text-gray-400 text-xs leading-relaxed mb-4">
          {step.message}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
            }`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Back
          </button>

          <button
            onClick={handleNext}
            className="flex items-center gap-1 text-xs font-medium px-4 py-1.5 rounded-lg text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
            }}
          >
            {currentStep === totalSteps - 1 ? 'Done' : 'Next'}
            {currentStep < totalSteps - 1 && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(
    <>
      {renderOverlay()}
      {renderTooltip()}
    </>,
    document.body
  )
}

export default WalkthroughOverlay
