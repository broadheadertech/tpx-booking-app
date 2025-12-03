import React from 'react'
import { useNavigate } from 'react-router-dom'
import ServiceBooking from '../../components/customer/ServiceBooking'

function CustomerBooking() {
  const navigate = useNavigate()

  const handleBack = () => {
    navigate('/customer/dashboard')
  }

  return <ServiceBooking onBack={handleBack} />
}

export default CustomerBooking
