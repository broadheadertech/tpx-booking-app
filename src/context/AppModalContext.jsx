import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, CheckCircle, Info, HelpCircle, X } from 'lucide-react'

const AppModalContext = createContext(null)

export const useAppModal = () => {
  const ctx = useContext(AppModalContext)
  if (!ctx) throw new Error('useAppModal must be used within AppModalProvider')
  return ctx
}

function ModalPortal({ modal, inputValue, setInputValue, onClose, onConfirm }) {
  const inputRef = useRef(null)

  useEffect(() => {
    if (modal.mode === 'prompt' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [modal.mode])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && modal.mode === 'prompt') onConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [modal.mode, onClose, onConfirm])

  const type = modal.type || (modal.mode === 'confirm' ? 'confirm' : 'info')

  const accentMap = {
    success: { text: 'text-green-400', bg: 'bg-green-500/20 hover:bg-green-500/30', border: 'border-green-500/50' },
    error: { text: 'text-red-400', bg: 'bg-red-500/20 hover:bg-red-500/30', border: 'border-red-500/50' },
    warning: { text: 'text-yellow-400', bg: 'bg-yellow-500/20 hover:bg-yellow-500/30', border: 'border-yellow-500/50' },
    info: { text: 'text-blue-400', bg: 'bg-blue-500/20 hover:bg-blue-500/30', border: 'border-blue-500/50' },
    confirm: { text: 'text-[var(--color-primary)]', bg: 'bg-[var(--color-primary)]/20 hover:bg-[var(--color-primary)]/30', border: 'border-[var(--color-primary)]/50' },
  }
  const accent = accentMap[type] || accentMap.info

  const icons = {
    success: <CheckCircle className={`w-12 h-12 ${accent.text}`} />,
    error: <AlertCircle className={`w-12 h-12 ${accent.text}`} />,
    warning: <AlertCircle className={`w-12 h-12 ${accent.text}`} />,
    info: <Info className={`w-12 h-12 ${accent.text}`} />,
    confirm: <HelpCircle className={`w-12 h-12 ${accent.text}`} />,
  }

  const isConfirm = modal.mode === 'confirm' || modal.mode === 'prompt'

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-2">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="bg-gradient-to-br from-[#1E1E1E] to-[#2A2A2A] border border-[#333333]/60 relative w-full max-w-sm transform rounded-3xl shadow-2xl z-[10000] p-6 sm:p-8">
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-[#2A2A2A] hover:bg-[var(--color-primary)]/10 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-300" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            {icons[type] || icons.info}
          </div>

          {/* Title */}
          {modal.title && (
            <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">{modal.title}</h2>
          )}

          {/* Message */}
          {modal.message && (
            <p className="text-sm sm:text-base text-gray-300 text-center mb-6 whitespace-pre-line">{modal.message}</p>
          )}

          {/* Prompt input */}
          {modal.mode === 'prompt' && (
            <input
              ref={inputRef}
              type={modal.inputType || 'text'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={modal.placeholder || ''}
              className="w-full px-4 py-3 mb-6 bg-[#3A3A3A] border border-[#2A2A2A] rounded-xl text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            {isConfirm && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 sm:py-3 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] text-gray-300 hover:text-white font-semibold transition-all text-sm sm:text-base"
              >
                {modal.cancelText || 'Cancel'}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 sm:py-3 rounded-lg border font-semibold transition-all text-sm sm:text-base ${accent.bg} ${accent.text} ${accent.border}`}
            >
              {isConfirm ? (modal.confirmText || 'Confirm') : 'OK'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function AppModalProvider({ children }) {
  const [modal, setModal] = useState(null)
  const [inputValue, setInputValue] = useState('')
  const resolveRef = useRef(null)

  const showAlert = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setModal({ mode: 'alert', ...options })
    })
  }, [])

  const showConfirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setModal({ mode: 'confirm', ...options })
    })
  }, [])

  const showPrompt = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setInputValue(options.defaultValue || '')
      setModal({ mode: 'prompt', ...options })
    })
  }, [])

  const handleClose = useCallback(() => {
    if (modal?.mode === 'alert') resolveRef.current?.()
    else if (modal?.mode === 'confirm') resolveRef.current?.(false)
    else if (modal?.mode === 'prompt') resolveRef.current?.(null)
    setModal(null)
    setInputValue('')
    resolveRef.current = null
  }, [modal])

  const handleConfirm = useCallback(() => {
    if (modal?.mode === 'alert') resolveRef.current?.()
    else if (modal?.mode === 'confirm') resolveRef.current?.(true)
    else if (modal?.mode === 'prompt') resolveRef.current?.(inputValue)
    setModal(null)
    setInputValue('')
    resolveRef.current = null
  }, [modal, inputValue])

  return (
    <AppModalContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {modal && (
        <ModalPortal
          modal={modal}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      )}
    </AppModalContext.Provider>
  )
}
