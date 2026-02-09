/**
 * Branch Selector Component
 * Story 13-3: Admin Staff Branch Context Switching
 *
 * Dropdown component for switching between branches.
 * - Shows for super_admin and admin_staff roles
 * - Hidden for branch_admin, staff, and barber (shows read-only branch name)
 */

import React, { useState, useRef, useEffect } from 'react'
import { Building, ChevronDown, Check } from 'lucide-react'
import { useBranchContext } from '../../context/BranchContext'

export function BranchSelector({ className = '' }) {
  const {
    branches,
    currentBranch,
    canSwitchBranches,
    isBranchScoped,
    setSelectedBranch,
    isLoading,
  } = useBranchContext()

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleSelectBranch = (branchId) => {
    setSelectedBranch(branchId)
    setIsOpen(false)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center space-x-1.5 ${className}`}>
        <Building className="w-3.5 h-3.5 text-gray-500 animate-pulse" />
        <span className="text-xs text-gray-500">Loading...</span>
      </div>
    )
  }

  // Branch-scoped users see read-only branch name
  if (isBranchScoped) {
    if (!currentBranch) return null

    return (
      <div className={`flex items-center space-x-1.5 ${className}`}>
        <Building className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="text-xs font-medium text-gray-300 truncate max-w-[120px]">
          {currentBranch.name}
        </span>
        <span className="text-[10px] text-gray-500 hidden lg:inline">
          ({currentBranch.branch_code})
        </span>
      </div>
    )
  }

  // Users who can't switch and have no branch
  if (!canSwitchBranches) {
    return null
  }

  // Dropdown for users who can switch branches
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all duration-200 group"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Building className="w-3.5 h-3.5 text-[var(--color-primary)]" />
        <span className="text-xs font-medium text-gray-300 truncate max-w-[100px] sm:max-w-[150px]">
          {currentBranch?.name || 'Select Branch'}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-[#1A1A1A] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
              Switch Branch
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {branches.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-gray-500">No branches available</p>
              </div>
            ) : (
              branches.map((branch) => (
                <button
                  key={branch._id}
                  onClick={() => handleSelectBranch(branch._id)}
                  className={`w-full px-3 py-2 flex items-center justify-between hover:bg-white/5 transition-colors duration-150 ${
                    currentBranch?._id === branch._id ? 'bg-[var(--color-primary)]/10' : ''
                  }`}
                  role="option"
                  aria-selected={currentBranch?._id === branch._id}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {branch.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {branch.branch_code} • {branch.address ? branch.address.substring(0, 30) + '...' : 'No address'}
                    </p>
                  </div>
                  {currentBranch?._id === branch._id && (
                    <Check className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0 ml-2" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default BranchSelector
