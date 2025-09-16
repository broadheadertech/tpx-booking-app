import React from 'react'

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center">
      <div className="text-center">
        {/* Modern spinning animation with multiple rings */}
        <div className="relative w-16 h-16 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-[#333333] opacity-20"></div>
          {/* Animated ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF8C42] animate-spin"></div>
          {/* Inner ring for depth */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-[#FF8C42] animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#FF8C42] rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Loading text */}
        <div className="space-y-2">
          <p className="text-white text-lg font-medium">{message}</p>
          {/* Animated dots */}
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-[#FF8C42] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#FF8C42] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[#FF8C42] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
        
        {/* Subtle brand touch */}
        <div className="mt-8">
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-[#FF8C42] to-transparent mx-auto opacity-50"></div>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen