function Button({ children, variant = 'primary', onClick, disabled = false, className = '', type = 'button' }) {
  const baseStyles = 'w-full min-h-[48px] rounded-lg font-bold text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-primary-orange text-white hover:bg-primary-orange-dark active:bg-primary-orange',
    secondary: 'bg-primary-black text-white hover:bg-gray-800 active:bg-gray-900',
    outline: 'border-2 border-primary-orange text-primary-orange bg-transparent hover:bg-primary-orange hover:text-white'
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

export default Button