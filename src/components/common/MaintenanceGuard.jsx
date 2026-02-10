import { useQuery } from 'convex/react'
import { useUser } from '@clerk/clerk-react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../../convex/_generated/api'
import MaintenancePage from '../../pages/MaintenancePage'

/**
 * MaintenanceGuard — wraps all routes in App.jsx.
 * When maintenance is enabled, non-super_admin users see the maintenance page.
 * Super admins bypass maintenance and see the normal app.
 */
function MaintenanceGuard({ children }) {
  const maintenance = useQuery(api.services.maintenanceConfig.getMaintenanceStatus)

  // Clerk auth
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn: clerkSignedIn } = useUser()
  const clerkConvexUser = useQuery(
    api.services.auth.getUserByClerkId,
    clerkLoaded && clerkSignedIn && clerkUser?.id
      ? { clerk_user_id: clerkUser.id }
      : 'skip'
  )

  // Legacy auth
  const { user: legacyUser } = useAuth()

  // Determine the active user
  const user = (clerkSignedIn && clerkConvexUser) ? clerkConvexUser : legacyUser

  // Still loading maintenance status — render nothing briefly
  if (maintenance === undefined) return null

  // Maintenance is off — render app normally
  if (!maintenance.is_enabled) return children

  // Maintenance is on — check if user is super_admin
  if (user?.role === 'super_admin') return children

  // Everyone else sees the maintenance page
  return (
    <MaintenancePage
      endTime={maintenance.end_time}
      message={maintenance.message}
    />
  )
}

export default MaintenanceGuard
