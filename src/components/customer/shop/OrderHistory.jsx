import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import {
  Package,
  Receipt,
  Clock,
  CheckCircle,
  Store,
  ChevronRight,
  ShoppingBag,
  CreditCard,
  Wallet,
  XCircle,
  Truck,
} from 'lucide-react'

/**
 * OrderHistory - List of customer's retail purchases
 */
function OrderHistory() {
  const { user } = useCurrentUser()
  const [selectedOrder, setSelectedOrder] = useState(null)

  // Fetch customer's retail transactions
  const orders = useQuery(
    api.services.transactions.getCustomerRetailTransactions,
    user?._id ? { customerId: user._id, limit: 50 } : 'skip'
  )

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-PH', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const getStatusConfig = (order) => {
    // For delivery orders, use delivery_status
    if (order.fulfillment_type === 'delivery') {
      const deliveryStatus = order.delivery_status || 'pending'
      switch (deliveryStatus) {
        case 'delivered':
          return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Delivered' }
        case 'out_for_delivery':
          return { icon: Truck, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Out for Delivery' }
        case 'preparing':
          return { icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Preparing' }
        case 'cancelled':
          return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Cancelled' }
        case 'pending':
        default:
          return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending' }
      }
    }

    // For pickup orders, use payment_status
    switch (order.payment_status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Completed' }
      case 'pending':
        return { icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Pending Pickup' }
      case 'failed':
        return { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' }
      default:
        return { icon: Clock, color: 'text-gray-400', bg: 'bg-gray-500/20', label: order.payment_status }
    }
  }

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'wallet':
        return Wallet
      case 'cash':
        return CreditCard
      default:
        return CreditCard
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium mb-1">Login to view orders</p>
        <p className="text-sm text-gray-600 text-center">Sign in to see your purchase history</p>
      </div>
    )
  }

  if (orders === undefined) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] animate-pulse">
            <div className="h-4 bg-[#2A2A2A] rounded w-1/3 mb-3" />
            <div className="h-3 bg-[#2A2A2A] rounded w-1/2 mb-2" />
            <div className="h-3 bg-[#2A2A2A] rounded w-1/4" />
          </div>
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
          <Receipt className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium mb-1">No orders yet</p>
        <p className="text-sm text-gray-600 text-center">Your purchase history will appear here</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* Orders List */}
      {orders.map((order) => {
        const status = getStatusConfig(order)
        const StatusIcon = status.icon
        const PaymentIcon = getPaymentIcon(order.payment_method)
        const isDelivery = order.fulfillment_type === 'delivery'

        return (
          <div
            key={order._id}
            onClick={() => setSelectedOrder(selectedOrder?._id === order._id ? null : order)}
            className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden cursor-pointer hover:border-[#3A3A3A] transition-colors"
          >
            {/* Order Header */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white font-mono">{order.receipt_number}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg ${status.bg} flex items-center gap-1`}>
                  <StatusIcon className={`w-3 h-3 ${status.color}`} />
                  <span className={`text-[10px] font-semibold ${status.color}`}>{status.label}</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <Package className="w-4 h-4" />
                    <span className="text-xs">{order.item_count} items</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <PaymentIcon className="w-4 h-4" />
                    <span className="text-xs capitalize">{order.payment_method}</span>
                  </div>
                  {/* Delivery/Pickup indicator */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${isDelivery ? 'bg-green-500/20' : 'bg-blue-500/20'}`}>
                    {isDelivery ? <Truck className="w-3 h-3 text-green-400" /> : <Store className="w-3 h-3 text-blue-400" />}
                    <span className={`text-[10px] font-medium ${isDelivery ? 'text-green-400' : 'text-blue-400'}`}>
                      {isDelivery ? 'Delivery' : 'Pickup'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-green-400">
                    ₱{order.total_amount.toLocaleString()}
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform ${selectedOrder?._id === order._id ? 'rotate-90' : ''}`} />
                </div>
              </div>
            </div>

            {/* Expanded Order Details */}
            {selectedOrder?._id === order._id && (
              <div className="border-t border-[#2A2A2A] p-4 bg-[#0A0A0A]">
                {/* Products List */}
                <div className="space-y-2 mb-4">
                  {order.products.map((product, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {product.quantity}x {product.product_name}
                      </span>
                      <span className="text-white">
                        ₱{(product.price * product.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Delivery/Pickup Info */}
                {isDelivery ? (
                  <div className="flex items-start gap-3 p-3 bg-[#1A1A1A] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Truck className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Delivery Address</p>
                      {order.delivery_address ? (
                        <>
                          <p className="text-sm font-medium text-white">{order.delivery_address.label || 'Home'}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {order.delivery_address.street}, {order.delivery_address.barangay}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.delivery_address.city}, {order.delivery_address.province}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-medium text-white">Address not available</p>
                      )}
                      {order.delivery_fee > 0 && (
                        <p className="text-xs text-amber-400 mt-1">
                          Delivery Fee: ₱{order.delivery_fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Store className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Pickup Location</p>
                      <p className="text-sm font-medium text-white">{order.branch_name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default OrderHistory
