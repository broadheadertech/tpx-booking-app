import React, { useState } from 'react'
import Modal from '../common/Modal'
import Button from '../common/Button'
import Input from '../common/Input'
import { User, Mail, Phone, Lock, Calendar } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const AddCustomerModal = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nickname: '',
    email: '',
    mobile_number: '',
    birthday: ''
  })

  // Convex mutation
  const registerUserMutation = useMutation(api.services.auth.registerUser)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setFieldErrors({})
    
    try {
      // Prepare data for API according to /api/register/ specification
      const customerData = {
        username: formData.username.trim(),
        password: formData.password,
        mobile_number: formData.mobile_number.trim(),
        email: formData.email.trim(),
        ...(formData.nickname && { nickname: formData.nickname.trim() }),
        ...(formData.birthday && { birthday: formData.birthday })
      }

      console.log('Creating new customer:', customerData)
      
      // Call the Convex registerUser mutation to create new user
      const customerDataWithRole = {
        ...customerData,
        role: 'customer'
      }

      const newCustomer = await registerUserMutation(customerDataWithRole)

      console.log('Customer created successfully:', newCustomer)
      
      // Call parent success handler
      if (onSubmit) {
        await onSubmit(newCustomer)
      }
      
      // Reset form
      resetForm()
      onClose()
      
    } catch (err) {
      console.error('Error creating customer:', err)
      
      if (err.response?.data) {
        // Handle DRF validation errors
        const errorData = err.response.data
        if (typeof errorData === 'object') {
          setFieldErrors(errorData)
          
          // Set general error message if there are non-field errors
          if (errorData.non_field_errors) {
            setError(errorData.non_field_errors[0])
          } else {
            // Create a summary of field errors
            const errorMessages = Object.entries(errorData)
              .filter(([key]) => key !== 'non_field_errors')
              .map(([field, errors]) => `${field}: ${errors[0]}`)
            setError(`Please fix the following errors: ${errorMessages.join(', ')}`)
          }
        } else {
          setError(errorData || 'Failed to create customer')
        }
      } else {
        setError(err.message || 'Failed to create customer. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nickname: '',
      email: '',
      mobile_number: '',
      birthday: ''
    })
    setError(null)
    setFieldErrors({})
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Customer" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <User className="w-5 h-5 text-[#FF8C42] mr-2" />
              Account Information
            </h3>
            
            <Input
              label="Username"
              placeholder="Enter unique username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.username?.[0]}
            />
            
            <Input
              label="Password"
              type="password"
              placeholder="Enter secure password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.password?.[0]}
            />
            
            <Input
              label="Email Address"
              type="email"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.email?.[0]}
            />
            
            <Input
              label="Mobile Number"
              type="tel"
              placeholder="09123456789"
              value={formData.mobile_number}
              onChange={(e) => handleInputChange('mobile_number', e.target.value)}
              required
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.mobile_number?.[0]}
            />
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-black text-[#1A1A1A] uppercase tracking-wide flex items-center">
              <Calendar className="w-5 h-5 text-[#FF8C42] mr-2" />
              Personal Details
            </h3>
            
            <Input
              label="Nickname (Optional)"
              placeholder="Preferred name or alias"
              value={formData.nickname}
              onChange={(e) => handleInputChange('nickname', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.nickname?.[0]}
            />
            
            <Input
              label="Birthday (Optional)"
              type="date"
              value={formData.birthday}
              onChange={(e) => handleInputChange('birthday', e.target.value)}
              className="border-[#F5F5F5] focus:border-[#FF8C42]"
              error={fieldErrors.birthday?.[0]}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <User className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Customer Account
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>This will create a new customer account that they can use to:</p>
                    <ul className="list-disc pl-5 mt-1">
                      <li>Book appointments online</li>
                      <li>View booking history</li>
                      <li>Manage loyalty points</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex space-x-4 pt-6 border-t border-[#F5F5F5]">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm()
              onClose()
            }}
            disabled={loading}
            className="flex-1 border-[#6B6B6B] text-[#6B6B6B] hover:bg-[#6B6B6B] hover:text-white"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white hover:shadow-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCustomerModal