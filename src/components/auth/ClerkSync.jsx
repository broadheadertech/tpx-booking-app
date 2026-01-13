import { useEffect } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

/**
 * Component to sync Clerk user data to Convex database
 * Place this in your app's root component
 */
export function ClerkSync() {
  const { user, isLoaded } = useUser()
  const syncUser = useMutation(api.services.clerkSync.manualSyncClerkUser)

  useEffect(() => {
    if (isLoaded && user) {
      // Sync user to Convex when they sign in
      syncUser({
        clerkUserId: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        username: user.username || user.primaryEmailAddress?.emailAddress?.split('@')[0] || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        avatar: user.imageUrl || '',
        phoneNumber: user.primaryPhoneNumber?.phoneNumber || '',
      }).then(() => {
        console.log('User synced to Convex database')
      }).catch((error) => {
        console.error('Failed to sync user to Convex:', error)
      })
    }
  }, [isLoaded, user?.id])

  return null // This component doesn't render anything
}
