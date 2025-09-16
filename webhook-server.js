const express = require('express')
const { ConvexHttpClient } = require('convex/browser')

const app = express()
const port = process.env.PORT || 3001

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.CONVEX_URL)

// Middleware
app.use(express.json())

// Xendit webhook endpoint
app.post('/api/payment/webhook', async (req, res) => {
  try {
    const { body, headers } = req

    // Log webhook data for debugging
    console.log('Xendit Webhook received:', {
      event: body.event || 'unknown',
      payment_request_id: body.data?.payment_request_id,
      status: body.data?.status,
      timestamp: new Date().toISOString()
    })

    // Extract payment data
    const paymentData = body.data
    if (!paymentData) {
      console.error('No payment data in webhook')
      return res.status(400).json({ error: 'No payment data' })
    }

    const paymentRequestId = paymentData.payment_request_id
    const status = paymentData.status
    const metadata = paymentData

    if (!paymentRequestId || !status) {
      console.error('Missing required fields:', { paymentRequestId, status })
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Update payment status in Convex
    console.log('Updating payment status in Convex:', {
      paymentRequestId,
      status,
      metadata
    })

    await convex.mutation('services/payments:updatePaymentStatus', {
      payment_request_id: paymentRequestId,
      status: status,
      metadata: metadata
    })

    console.log('Payment status updated successfully')

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Payment status updated successfully',
      payment_request_id: paymentRequestId,
      status: status
    })

  } catch (error) {
    console.error('Webhook processing error:', error)

    // Return error response
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Start server
app.listen(port, () => {
  console.log(`Webhook server running on port ${port}`)
  console.log('Make sure to set CONVEX_URL environment variable')
})



