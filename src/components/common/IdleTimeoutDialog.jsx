import { Clock, LogOut, RefreshCw } from 'lucide-react'

const IdleTimeoutDialog = ({
  open,
  remainingTime,
  onStayLoggedIn,
  onLogout
}) => {
  if (!open) return null

  // Format remaining time as MM:SS or just seconds
  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000)
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }
    return `${seconds} seconds`
  }

  const seconds = Math.ceil(remainingTime / 1000)
  const isUrgent = seconds <= 10

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-3xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Warning Icon with pulse animation */}
        <div className="mb-4 flex flex-col items-center">
          <div className={`relative mb-3 ${isUrgent ? 'animate-pulse' : ''}`}>
            <div className={`absolute inset-0 rounded-full ${isUrgent ? 'bg-red-500/20' : 'bg-[var(--color-primary)]/20'} blur-xl`} />
            <div className={`relative flex h-16 w-16 items-center justify-center rounded-full ${isUrgent ? 'bg-red-500/10' : 'bg-[var(--color-primary)]/10'}`}>
              <Clock className={`h-8 w-8 ${isUrgent ? 'text-red-500' : 'text-[var(--color-primary)]'}`} />
            </div>
          </div>
          <h3 className="text-xl font-bold text-white text-center">Session Timeout Warning</h3>
        </div>

        {/* Timer display */}
        <div className="mb-4 flex justify-center">
          <div className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 ${isUrgent ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10'}`}>
            <span className={`text-2xl font-mono font-bold ${isUrgent ? 'text-red-500' : 'text-white'}`}>
              {formatTime(remainingTime)}
            </span>
          </div>
        </div>

        {/* Message */}
        <p className="mb-6 text-center text-sm text-gray-300">
          You've been inactive for a while. For security, you'll be automatically logged out
          {isUrgent ? (
            <span className="text-red-400 font-medium"> in just a few seconds!</span>
          ) : (
            ' soon.'
          )}
        </p>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${isUrgent ? 'bg-red-500' : 'bg-[var(--color-primary)]'}`}
            style={{ width: `${(remainingTime / 60000) * 100}%` }}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
          <button
            onClick={onStayLoggedIn}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--color-accent)]"
          >
            <RefreshCw className="h-4 w-4" />
            Stay Logged In
          </button>
        </div>

        {/* Subtle hint */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Any mouse movement or keyboard activity will keep you logged in
        </p>
      </div>
    </div>
  )
}

export default IdleTimeoutDialog
