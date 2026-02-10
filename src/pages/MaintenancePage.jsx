import { useState, useEffect } from 'react'
import { Wrench, Clock } from 'lucide-react'

function MaintenancePage({ endTime, message }) {
  const [timeLeft, setTimeLeft] = useState(null)

  useEffect(() => {
    if (!endTime) return

    const tick = () => {
      const diff = endTime - Date.now()
      if (diff <= 0) {
        setTimeLeft(null)
        return
      }
      setTimeLeft(diff)
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [endTime])

  const formatCountdown = (ms) => {
    if (!ms || ms <= 0) return null
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    const parts = []
    if (hours > 0) parts.push(`${hours}h`)
    if (minutes > 0) parts.push(`${minutes}m`)
    parts.push(`${seconds}s`)
    return parts.join(' ')
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-8">
          <Wrench className="w-10 h-10 text-amber-400" />
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-white mb-3">
          We're Under Maintenance
        </h1>

        {/* Message */}
        <p className="text-gray-400 text-lg mb-8">
          {message || "We're making improvements. Please check back soon."}
        </p>

        {/* Countdown */}
        {endTime && timeLeft && timeLeft > 0 ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-gray-400 font-medium">Estimated time remaining</span>
            </div>
            <p className="text-2xl font-bold text-amber-400 font-mono">
              {formatCountdown(timeLeft)}
            </p>
          </div>
        ) : !endTime ? (
          <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-6 mb-8">
            <p className="text-gray-400">Please check back later</p>
          </div>
        ) : null}

      </div>
    </div>
  )
}

export default MaintenancePage
