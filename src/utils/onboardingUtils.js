// Utility functions for managing onboarding state

/**
 * Check if onboarding has been completed in the current session
 * @returns {boolean} - True if onboarding was completed, false otherwise
 */
export const isOnboardingCompleted = () => {
  return sessionStorage.getItem('onboarding_completed') === 'true'
}

/**
 * Mark onboarding as completed for the current session
 */
export const markOnboardingCompleted = () => {
  sessionStorage.setItem('onboarding_completed', 'true')
}

/**
 * Reset onboarding state (useful for testing)
 */
export const resetOnboardingState = () => {
  sessionStorage.removeItem('onboarding_completed')
}

/**
 * Add a global function to reset onboarding for testing
 * This will be available in the browser console as window.resetOnboarding()
 */
if (typeof window !== 'undefined') {
  window.resetOnboarding = resetOnboardingState
}