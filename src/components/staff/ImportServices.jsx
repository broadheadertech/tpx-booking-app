import React, { useState } from 'react'
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const ImportServices = ({ onClose, onSuccess }) => {
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState(null)

  const bulkInsertServices = useMutation(api.services.services.bulkInsertServices)

  // CSV data from the file
  const csvData = [
    {
      name: "Tipuno X Classico",
      description: "Consultation, Haircut",
      duration_minutes: 30,
      price: 150.00
    },
    {
      name: "Tipuno X Signature",
      description: "Consultation, Haircut, Rinse Hot and Cold Towel Finish",
      duration_minutes: 60,
      price: 500.00
    },
    {
      name: "Tipuno X Deluxe",
      description: "Consultation, Haircut, Hair Spa Treatment, Rinse Hot and Cold Towel Finish",
      duration_minutes: 90,
      price: 800.00
    },
    {
      name: "Beard Shave/Shaping/Sculpting",
      description: "More than a shave. It's a service you'll feel.",
      duration_minutes: 30,
      price: 200.00
    },
    {
      name: "FACVNDO ELITE BARBERING SERVICE",
      description: "If you are looking for wedding haircuts, trust the elite hands that turn grooms into legends.",
      duration_minutes: 0,
      price: 10000.00
    },
    {
      name: "Package 1",
      description: "Consultation, Haircut, Shaving, Styling",
      duration_minutes: 45,
      price: 500.00
    },
    {
      name: "Package 2",
      description: "Consultation, Haircut, Hair Color or With Single Bleach, Rinse, Styling. Note: Short hair only, add 250 per length",
      duration_minutes: 60,
      price: 850.00
    },
    {
      name: "Package 3",
      description: "Consultation, Haircut, Hair Color or With Single Bleach, Hair Spa Treatment, Rinse, Styling. Note: Short hair only, add 250 per length",
      duration_minutes: 60,
      price: 1400.00
    },
    {
      name: "Mustache/Beard Trim",
      description: "No Description with this product yet.",
      duration_minutes: 30,
      price: 170.00
    },
    {
      name: "Hair Spa",
      description: "No description for this service yet.",
      duration_minutes: 30,
      price: 600.00
    },
    {
      name: "Hair and Scalp Treatment",
      description: "No description for this product yet.",
      duration_minutes: 60,
      price: 1500.00
    },
    {
      name: "Hair Color",
      description: "No description for this product yet.",
      duration_minutes: 60,
      price: 800.00
    },
    {
      name: "Perm",
      description: "No description for this product yet.",
      duration_minutes: 60,
      price: 1500.00
    },
    {
      name: "Hair Tattoo",
      description: "No description for this product yet.",
      duration_minutes: 60,
      price: 100.00
    }
  ]

  const handleImport = async () => {
    setIsImporting(true)
    setError(null)
    setImportResult(null)

    try {
      const result = await bulkInsertServices({ services: csvData })
      setImportResult(result)
      if (onSuccess) {
        onSuccess(result)
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err.message || 'Failed to import services')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="relative w-full max-w-2xl transform rounded-2xl bg-gradient-to-br from-[#2A2A2A] to-[#333333] border border-[#444444]/50 shadow-2xl transition-all p-6">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center mx-auto">
              <Upload className="w-8 h-8 text-white" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Import Services</h3>
              <p className="text-gray-400">Import {csvData.length} services from the CSV data into the database</p>
            </div>

            {/* Service Preview */}
            <div className="bg-[#1A1A1A] rounded-xl p-4 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-medium text-gray-300 mb-3">Services to be imported:</h4>
              <div className="space-y-2">
                {csvData.map((service, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-white font-medium">{service.name}</span>
                    <div className="text-right">
                      <span className="text-[var(--color-primary)] font-bold">₱{service.price.toFixed(2)}</span>
                      <span className="text-gray-400 ml-2">({service.duration_minutes}min)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Import Result */}
            {importResult && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Import Successful!</span>
                </div>
                <p className="text-sm text-green-300 mt-2">
                  Successfully imported {importResult.insertedCount} services
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
                <div className="flex items-center justify-center space-x-2 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Import Failed</span>
                </div>
                <p className="text-sm text-red-300 mt-2">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl text-gray-300 bg-[#444444] hover:bg-[#555555] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || importResult}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-medium hover:from-[var(--color-accent)] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
              >
                {isImporting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : importResult ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Imported</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import Services</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ImportServices