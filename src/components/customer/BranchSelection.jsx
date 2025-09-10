import React, { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Card from '../common/Card'
import Button from '../common/Button'

export default function BranchSelection({ onBranchSelect, selectedBranchId }) {
  const branches = useQuery(api.services.branches.getActiveBranches)
  
  const handleSelectBranch = (branch) => {
    onBranchSelect(branch)
  }

  if (!branches) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading branches...</div>
      </div>
    )
  }

  if (branches.length === 0) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">No branches available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Select a Branch
        </h2>
        <p className="text-gray-600">
          Choose the branch where you'd like to book your appointment
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card
            key={branch._id}
            className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedBranchId === branch._id
                ? 'ring-2 ring-blue-500 shadow-lg'
                : 'hover:shadow-md'
            }`}
            onClick={() => handleSelectBranch(branch)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {branch.name}
                  </h3>
                  <span className="text-sm font-mono text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {branch.branch_code}
                  </span>
                </div>
                {selectedBranchId === branch._id && (
                  <div className="text-blue-500">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start space-x-2">
                  <svg className="w-4 h-4 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{branch.address}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{branch.phone}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>{branch.email}</span>
                </div>
              </div>
              
              {selectedBranchId === branch._id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center text-blue-600 text-sm font-medium">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Selected Branch
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}