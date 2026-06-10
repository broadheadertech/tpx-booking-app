import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

/**
 * Persistent banner shown while the device is offline. Fixed to the top so it's
 * visible regardless of where it sits in the layout. Pairs with the checkout
 * guards in POS that block a sale from being attempted while disconnected.
 */
export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] bg-red-600 text-white text-xs sm:text-sm font-semibold px-4 py-2 flex items-center justify-center gap-2 shadow-lg"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>Offline — new sales can't be processed until your connection is back.</span>
    </div>
  )
}
