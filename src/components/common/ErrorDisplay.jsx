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

  if (variant === 'inline') {
    return (
      <div className={`flex items-start space-x-3 p-3 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-800">
            {formattedError.message}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">
                {formattedError.message}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors"
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
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 mb-1">
                {formattedError.message}
              </p>
              
              {formattedError.details && (
                <p className="text-xs text-red-600 mb-2">
                  {formattedError.details}
                </p>
              )}
              
              {formattedError.action && (
                <p className="text-xs text-red-600">
                  {formattedError.action}
                </p>
              )}
            </div>
            
            {onClose && (
              <button
                onClick={onClose}
                className="text-red-400 hover:text-red-600 transition-colors ml-3"
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