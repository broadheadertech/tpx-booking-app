import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { useQuery, useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useToast } from '../../components/common/ToastNotification'
import { useUser } from '@clerk/clerk-react'
import { WalletHub } from '../../components/customer/wallet'

// Auto-polling interval for pending transactions (10 seconds)
const AUTO_POLL_INTERVAL = 10000
// Max auto-poll attempts before stopping (5 minutes total)
const MAX_AUTO_POLL_ATTEMPTS = 30

function Wallet() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const topupToastShownRef = useRef(false)
  const { user: authUser } = useCurrentUser()
  const { user: clerkUser } = useUser()
  const toast = useToast()

  // Get Convex user from Clerk ID (for Clerk-authenticated users)
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkUser?.id ? { clerk_user_id: clerkUser.id } : 'skip'
  )

  // Use Clerk user if available, otherwise fall back to AuthContext user
  const user = clerkConvexUser || authUser

  const wallet = useQuery(api.services.wallet.getWallet, user?._id ? { userId: user._id } : 'skip')
  const txs = useQuery(api.services.wallet.listTransactions, user?._id ? { userId: user._id, limit: 50 } : 'skip')
  const pendingTopups = useQuery(api.services.wallet.getPendingTopups, user?._id ? { userId: user._id } : 'skip')
  const ensureWallet = useMutation(api.services.wallet.ensureWallet)
  const finalizeTopUp = useAction(api.services.paymongo.captureSourceAndCreditWallet)
  const checkTopupStatus = useAction(api.services.wallet.checkAndProcessWalletTopupStatus)

  const [checkingTopupId, setCheckingTopupId] = useState(null)
  const [isProcessingReturn, setIsProcessingReturn] = useState(false)
  const [autoPollingActive, setAutoPollingActive] = useState(false)
  const pollAttemptsRef = useRef(0)
  const pollIntervalRef = useRef(null)

  const goToTopUp = useCallback(() => {
    navigate('/customer/wallet/topup')
  }, [navigate])

  useEffect(() => {
    if (user?._id) {
      ensureWallet({ userId: user._id }).catch(() => {})
    }
  }, [user, ensureWallet])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Auto-process a single pending top-up
  const processOnePendingTopup = useCallback(async (pending) => {
    if (!pending.source_id) return null

    try {
      const result = await checkTopupStatus({ sessionId: pending.source_id })
      console.log('[Wallet] Auto-check result:', result)
      return result
    } catch (e) {
      console.error('[Wallet] Auto-check failed:', e)
      return null
    }
  }, [checkTopupStatus])

  // Start automatic polling for pending transactions
  const startAutoPolling = useCallback(() => {
    if (pollIntervalRef.current || autoPollingActive) return

    console.log('[Wallet] Starting auto-polling for pending top-ups')
    setAutoPollingActive(true)
    pollAttemptsRef.current = 0

    pollIntervalRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1
      console.log(`[Wallet] Auto-poll attempt ${pollAttemptsRef.current}/${MAX_AUTO_POLL_ATTEMPTS}`)

      // Check if we still have pending transactions
      if (!pendingTopups || pendingTopups.length === 0) {
        console.log('[Wallet] No pending top-ups, stopping auto-poll')
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        setAutoPollingActive(false)
        return
      }

      // Process each pending top-up
      let anyProcessed = false
      for (const pending of pendingTopups) {
        const result = await processOnePendingTopup(pending)
        if (result?.status === 'paid') {
          anyProcessed = true
          toast.success('Top-up Successful!', `₱${result.amount} has been credited${result.bonus > 0 ? ` (+₱${result.bonus} bonus!)` : ''}`)
        }
      }

      // Stop polling if we processed any or reached max attempts
      if (anyProcessed || pollAttemptsRef.current >= MAX_AUTO_POLL_ATTEMPTS) {
        console.log('[Wallet] Stopping auto-poll:', anyProcessed ? 'transaction processed' : 'max attempts reached')
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
        setAutoPollingActive(false)

        if (!anyProcessed && pollAttemptsRef.current >= MAX_AUTO_POLL_ATTEMPTS) {
          toast.info('Payment Processing', 'Your payment is being processed. It may take a moment to appear.')
        }
      }
    }, AUTO_POLL_INTERVAL)
  }, [pendingTopups, processOnePendingTopup, autoPollingActive, toast])

  // Handle top-up success/cancelled query params
  useEffect(() => {
    const topupResult = searchParams.get('topup')

    // Prevent multiple toast firings on re-renders
    if (!topupResult || topupToastShownRef.current) return

    if (topupResult === 'success') {
      topupToastShownRef.current = true
      setIsProcessingReturn(true)

      // Try to process any pending SA wallet top-ups with immediate check + auto-polling
      const processPendingTopups = async () => {
        if (user?._id && pendingTopups && pendingTopups.length > 0) {
          let anyProcessed = false

          for (const pending of pendingTopups) {
            if (pending.source_id) {
              const result = await processOnePendingTopup(pending)
              if (result?.status === 'paid') {
                anyProcessed = true
                toast.success('Top-up Successful!', `₱${result.amount} has been credited to your wallet${result.bonus > 0 ? ` (+₱${result.bonus} bonus!)` : ''}`)
              }
            }
          }

          // If not processed yet, start auto-polling
          if (!anyProcessed) {
            console.log('[Wallet] Payment not yet confirmed, starting auto-poll')
            startAutoPolling()
          }
        }

        setIsProcessingReturn(false)
      }

      // Wait before first poll — PayMongo needs time to process the payment after redirect
      setTimeout(() => {
        processPendingTopups()
      }, 3000)

      // Also handle legacy paymongo source flow for backwards compatibility
      if (user?._id && txs) {
        const pendingSources = txs.filter(t => t.status === 'pending' && !!t.source_id && !pendingTopups?.find(p => p.source_id === t.source_id))
        pendingSources.forEach(async (t) => {
          try {
            await finalizeTopUp({ sourceId: t.source_id, userId: user._id })
          } catch (e) {
            console.error('[Wallet] Legacy finalize top-up failed:', e)
          }
        })
      }

      // Clear the query param to prevent re-firing on navigation
      searchParams.delete('topup')
      setSearchParams(searchParams, { replace: true })
    } else if (topupResult === 'cancelled') {
      topupToastShownRef.current = true
      toast.error('Top-up Cancelled', 'Your payment was cancelled. No charges were made.')

      // Clear the query param
      searchParams.delete('topup')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams, user, txs, pendingTopups, finalizeTopUp, processOnePendingTopup, startAutoPolling, toast])

  // Auto-start polling when there are pending transactions (for users who land on page directly)
  useEffect(() => {
    if (pendingTopups && pendingTopups.length > 0 && !autoPollingActive && !pollIntervalRef.current) {
      // Start auto-polling after a short delay
      const timer = setTimeout(() => {
        startAutoPolling()
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [pendingTopups, autoPollingActive, startAutoPolling])

  // Handler for manually checking a pending top-up
  const handleCheckTopupStatus = useCallback(async (sourceId) => {
    setCheckingTopupId(sourceId)
    try {
      const result = await checkTopupStatus({ sessionId: sourceId })
      console.log('[Wallet] Manual check result:', result)
      if (result.status === 'paid') {
        toast.success('Top-up Successful!', `₱${result.amount} has been credited${result.bonus > 0 ? ` (+₱${result.bonus} bonus!)` : ''}`)
      } else if (result.status === 'expired') {
        toast.error('Top-up Expired', 'The payment session has expired. Please try again.')
      } else if (result.status === 'pending') {
        toast.info('Still Processing', 'Your payment is still being processed. Please wait a moment.')
      } else if (result.status === 'already_completed') {
        toast.info('Already Processed', 'This top-up has already been credited.')
      } else {
        toast.error('Check Failed', result.error || 'Unable to verify payment status')
      }
    } catch (e) {
      console.error('[Wallet] Check status error:', e)
      toast.error('Check Failed', 'Unable to verify payment status. Please try again.')
    } finally {
      setCheckingTopupId(null)
    }
  }, [checkTopupStatus, toast])

  return (
    <WalletHub
      user={user}
      wallet={wallet}
      transactions={txs}
      pendingTopups={pendingTopups}
      onTopUp={goToTopUp}
      onCheckTopupStatus={handleCheckTopupStatus}
      checkingTopupId={checkingTopupId}
      isProcessingReturn={isProcessingReturn}
      autoPollingActive={autoPollingActive}
    />
  )
}

export default Wallet
