function Card({ children, className = '', variant = 'default' }) {
  const baseClasses = "rounded-2xl shadow-xl backdrop-blur-sm p-6"
  
  const variants = {
    default: "bg-gradient-to-b from-[#1A1A1A] to-[#2A2A2A] border border-[#2A2A2A]/50 text-white",
    light: "bg-white border border-gray-200 text-gray-900",
    success: "bg-gradient-to-b from-green-500/20 to-green-600/20 border border-green-500/50 text-white",
    error: "bg-gradient-to-b from-red-500/20 to-red-600/20 border border-red-500/50 text-white"
  }
  
  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

export default Card