import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'

const ConfirmDialog = ({ open, title, message, type = 'warning', onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!open) return null

  const icons = {
    warning: <AlertTriangle className="h-6 w-6 text-yellow-500" />,
    danger: <AlertTriangle className="h-6 w-6 text-red-500" />,
    success: <CheckCircle2 className="h-6 w-6 text-green-500" />,
    info: <Info className="h-6 w-6 text-blue-500" />,
  }

  const buttonColors = {
    warning: 'bg-yellow-600 hover:bg-yellow-700',
    danger: 'bg-red-600 hover:bg-red-700',
    success: 'bg-green-600 hover:bg-green-700',
    info: 'bg-blue-600 hover:bg-blue-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Icon */}
        <div className="mb-4 flex items-center gap-3">
          {icons[type]}
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>

        {/* Message */}
        <p className="mb-6 text-sm text-gray-300">{message}</p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${buttonColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
