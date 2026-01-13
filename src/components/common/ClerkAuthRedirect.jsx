import { useUser } from '@clerk/clerk-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Navigate } from 'react-router-dom'
import LoadingScreen from './LoadingScreen'
import { useEffect, useState } from 'react'

const ClerkAuthRedirect = ({ children }) => {
  const { user: clerkUser, isLoaded } = useUser()
  const [shouldRedirect, setShouldRedirect] = useState(false)
  
  // Query user data from Convex using Clerk ID
  const convexUser = useQuery(
    api.services.clerkSync.getUserByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  )

  // Delay redirect to prevent multiple simultaneous redirects
  useEffect(() => {
    if (isLoaded && clerkUser && convexUser) {
      // Small delay to prevent race conditions with other redirects
      const timer = setTimeout(() => {
        setShouldRedirect(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isLoaded, clerkUser, convexUser])

  // Show loading while checking authentication
  if (!isLoaded) {
    return <LoadingScreen message="Loading..." />
  }

  // If user is authenticated with Clerk and we have their Convex data, and redirect is ready
  if (isLoaded && clerkUser && convexUser && shouldRedirect) {
    // Redirect based on role
    switch (convexUser.role) {
      case 'super_admin':
        return <Navigate to="/admin/dashboard" replace />
      case 'staff':
      case 'admin':
      case 'branch_admin':
        return <Navigate to="/staff/dashboard" replace />
      case 'barber':
        return <Navigate to="/barber/home" replace />
      case 'customer':
      default:
        return <Navigate to="/customer/dashboard" replace />
    }
  }

  // If Clerk user exists but Convex data is still loading
  if (isLoaded && clerkUser && !convexUser) {
    return <LoadingScreen message="Loading your profile..." />
  }

  // Show login/register page for unauthenticated users
  return children
}

export default ClerkAuthRedirect
