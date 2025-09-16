import React from 'react'

const LoadingSpinner = ({ 
  size = 'md', 
  message = null, 
  variant = 'primary',
  className = '' 
}) => {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5', 
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  }

  const colorClasses = {
    primary: 'border-[#FF8C42]',
    white: 'border-white',
    gray: 'border-gray-400'
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        {/* Main spinner */}
        <div className={`${sizeClasses[size]} rounded-full border-2 border-gray-600 border-t-${colorClasses[variant]} animate-spin`}></div>
        {/* Inner accent ring for larger sizes */}
        {(size === 'lg' || size === 'xl') && (
          <div 
            className={`absolute inset-1 rounded-full border border-transparent border-t-${colorClasses[variant]} animate-spin opacity-60`}
            style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
          ></div>
        )}
      </div>
      {message && (
        <span className="ml-3 text-gray-300 text-sm font-medium">{message}</span>
      )}
    </div>
  )
}

export default LoadingSpinner