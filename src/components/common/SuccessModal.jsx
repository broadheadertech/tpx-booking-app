import React from 'react'
import Modal from './Modal'
import { CheckCircle, X } from 'lucide-react'

const SuccessModal = ({ isOpen, onClose, title, message, details = [] }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="md">
      <div className="text-center p-6">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title || 'Success!'}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>
        
        {details.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Details:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {details.map((detail, index) => (
                <li key={index} className="flex items-center">
                  <CheckCircle className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" />
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          Close
        </button>
      </div>
    </Modal>
  )
}

export default SuccessModal