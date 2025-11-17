function Button({ children, variant = 'primary', onClick, disabled = false, className = '', type = 'button' }) {
  const baseStyles = 'w-full min-h-[48px] rounded-lg font-bold text-base transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  
  const variants = {
    primary: 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-accent)] active:bg-[var(--color-primary)]',
    secondary: 'bg-[var(--color-bg)] text-white hover:bg-white/10 active:bg-white/20',
    outline: 'border-2 border-[var(--color-primary)] text-[var(--color-primary)] bg-transparent hover:bg-[var(--color-primary)] hover:text-white'
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