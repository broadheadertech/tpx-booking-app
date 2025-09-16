import { ConvexHttpClient } from 'convex/browser'

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { body, headers } = req

    // Log webhook data for debugging
    console.log('Xendit Webhook received:', {
      event: body.event || 'unknown',
      payment_request_id: body.data?.payment_request_id,
      status: body.data?.status,
      timestamp: new Date().toISOString()
    })

    // Verify webhook signature (recommended for production)
    // This is a basic implementation - you should implement proper signature verification
    const signature = headers['xendit-signature']
    if (!signature) {
      console.warn('Webhook signature missing')
      // For now, continue without verification for testing
    }

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
}



