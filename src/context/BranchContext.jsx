/**
 * Branch Context
 * Story 13-3: Admin Staff Branch Context Switching
 *
 * Provides branch context for data filtering:
 * - Admin Staff and Super Admin can switch between branches
 * - Branch Admin, Staff, and Barber use their assigned branch
 * - Selected branch persists in localStorage
 */

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'

const BranchContext = createContext(null)

// Roles that can switch branches
const BRANCH_SWITCHING_ROLES = ['super_admin', 'admin_staff']

// Roles that are scoped to their assigned branch
const BRANCH_SCOPED_ROLES = ['branch_admin', 'staff', 'barber']

export function BranchProvider({ children }) {
  const { user, isLoading: userLoading } = useCurrentUser()
  const branches = useQuery(api.services.branches.getActiveBranches) || []

  // Get stored branch from localStorage
  const getStoredBranch = () => {
    try {
      const stored = localStorage.getItem('selectedBranchId')
      return stored || null
    } catch {
      return null
    }
  }

  const [selectedBranchId, setSelectedBranchIdState] = useState(getStoredBranch)

  // Determine if user can switch branches
  const canSwitchBranches = useMemo(() => {
    if (!user) return false
    return BRANCH_SWITCHING_ROLES.includes(user.role)
  }, [user])

  // Determine if user is branch-scoped
  const isBranchScoped = useMemo(() => {
    if (!user) return false
    return BRANCH_SCOPED_ROLES.includes(user.role)
  }, [user])

  // Get the effective branch ID
  const effectiveBranchId = useMemo(() => {
    if (!user) return null

    // Branch-scoped users always use their assigned branch
    if (isBranchScoped) {
      return user.branch_id || null
    }

    // Users who can switch - use selected or first available
    if (canSwitchBranches) {
      // If we have a selected branch and it exists, use it
      if (selectedBranchId) {
        const branchExists = branches.some(b => b._id === selectedBranchId)
        if (branchExists) {
          return selectedBranchId
        }
      }

      // Default to first branch if available
      if (branches.length > 0) {
        return branches[0]._id
      }
    }

    return null
  }, [user, isBranchScoped, canSwitchBranches, selectedBranchId, branches])

  // Get the current branch object
  const currentBranch = useMemo(() => {
    if (!effectiveBranchId) return null
    return branches.find(b => b._id === effectiveBranchId) || null
  }, [effectiveBranchId, branches])

  // Set selected branch (only for users who can switch)
  const setSelectedBranch = (branchId) => {
    if (!canSwitchBranches) {
      console.warn('[BranchContext] User cannot switch branches')
      return
    }

    // Validate branch exists
    const branchExists = branches.some(b => b._id === branchId)
    if (!branchExists && branchId !== null) {
      console.warn('[BranchContext] Branch not found:', branchId)
      return
    }

    setSelectedBranchIdState(branchId)

    // Persist to localStorage
    try {
      if (branchId) {
        localStorage.setItem('selectedBranchId', branchId)
      } else {
        localStorage.removeItem('selectedBranchId')
      }
    } catch (e) {
      console.warn('[BranchContext] Failed to save to localStorage:', e)
    }

    console.log('[BranchContext] Branch switched to:', branchId)
  }

  // Initialize selected branch from localStorage when branches load
  useEffect(() => {
    if (canSwitchBranches && branches.length > 0 && !selectedBranchId) {
      // If no branch selected, default to first branch
      const storedBranch = getStoredBranch()
      if (storedBranch && branches.some(b => b._id === storedBranch)) {
        setSelectedBranchIdState(storedBranch)
      } else if (branches.length > 0) {
        // Default to first branch
        setSelectedBranchIdState(branches[0]._id)
      }
    }
  }, [canSwitchBranches, branches, selectedBranchId])

  // Clear stored branch when user logs out or changes
  useEffect(() => {
    if (!user && selectedBranchId) {
      // User logged out - clear selection
      try {
        localStorage.removeItem('selectedBranchId')
      } catch {}
      setSelectedBranchIdState(null)
    }
  }, [user, selectedBranchId])

  const value = {
    // State
    branches,
    currentBranch,
    effectiveBranchId,
    selectedBranchId,

    // Computed
    canSwitchBranches,
    isBranchScoped,
    isLoading: userLoading || !branches,

    // Actions
    setSelectedBranch,

    // Convenience methods
    getBranchById: (branchId) => branches.find(b => b._id === branchId),
    getBranchName: () => currentBranch?.name || 'Unknown Branch',
  }

  return (
    <BranchContext.Provider value={value}>
      {children}
    </BranchContext.Provider>
  )
}

export function useBranchContext() {
  const context = useContext(BranchContext)
  if (!context) {
    throw new Error('useBranchContext must be used within a BranchProvider')
  }
  return context
}

export default BranchContext
