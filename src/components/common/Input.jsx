function Input({ label, type = 'text', placeholder, value, onChange, required = false, className = '' }) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-primary-black font-medium text-base mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className={`w-full h-12 px-4 border-2 border-gray-300 rounded-lg text-base focus:outline-none focus:border-primary-orange transition-colors duration-200 ${className}`}
      />
    </div>
  )
}

export default Input