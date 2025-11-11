import React from 'react'
import { AlertCircle, X, RefreshCw } from 'lucide-react'
import { formatErrorForDisplay } from '../../utils/errorHandler'

const ErrorDisplay = ({ 
  error, 
  onClose, 
  onRetry, 
  className = '',
  variant = 'default'
}) => {
  if (!error) return null

  const formattedError = formatErrorForDisplay(error)

  // Check if we're in a dark theme context (for auth pages)
  const isDarkTheme = className.includes('dark') || document.body.classList.contains('dark') || 
                      window.location.pathname.includes('/auth')
  
  const darkThemeClasses = {
    container: 'bg-red-500/10 border-red-500/30',
    icon: 'text-red-400',
    message: 'text-red-300',
    details: 'text-red-200',
    action: 'text-[#FF8C42]',
    closeButton: 'text-red-400 hover:text-red-300'
  }
  
  const lightThemeClasses = {
    container: 'bg-red-50 border-red-200',
    icon: 'text-red-500',
    message: 'text-red-800',
    details: 'text-red-600',
    action: 'text-red-600',
    closeButton: 'text-red-400 hover:text-red-600'
  }
  
  const theme = isDarkTheme ? darkThemeClasses : lightThemeClasses

  if (variant === 'inline') {
    return (
      <div className={`flex items-start space-x-3 p-3 ${theme.container} border rounded-lg ${className}`}>
        <AlertCircle className={`w-4 h-4 ${theme.icon} flex-shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${theme.message}`}>
            {formattedError.message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={`${theme.closeButton} transition-colors`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`${theme.container} border rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className={`w-5 h-5 ${theme.icon}`} />
            <div>
              <p className={`text-sm font-medium ${theme.message}`}>
                {formattedError.message}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className={`${theme.closeButton} transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Default variant
  return (
    <div className={`${theme.container} border rounded-xl p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className={`w-5 h-5 ${theme.icon} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className={`text-sm font-medium ${theme.message} mb-1`}>
                {formattedError.message}
              </p>
              
              {formattedError.details && (
                <p className={`text-xs ${theme.details} mb-2`}>
                  {formattedError.details}
                </p>
              )}
              
              {formattedError.action && (
                <p className={`text-xs ${theme.action}`}>
                  {formattedError.action}
                </p>
              )}
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className={`${theme.closeButton} transition-colors ml-3`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ErrorDisplay

// Hook for managing error state
export const useErrorHandler = () => {
  const [error, setError] = React.useState(null)
  
  const showError = React.useCallback((err) => {
    setError(err)
  }, [])
  
  const clearError = React.useCallback(() => {
    setError(null)
  }, [])
  
  const retryWithClear = React.useCallback((retryFn) => {
    clearError()
    if (retryFn) retryFn()
  }, [clearError])
  
  return {
    error,
    showError,
    clearError,
    retryWithClear
  }
}