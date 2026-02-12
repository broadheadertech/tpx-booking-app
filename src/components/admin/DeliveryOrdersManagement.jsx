import React, { useState, useCallback } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import {
  Truck,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Filter,
  HelpCircle,
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { deliveryOrdersSteps } from '../../config/walkthroughSteps'

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    icon: Clock,
  },
  preparing: {
    label: 'Preparing',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: Package,
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: XCircle,
  },
}

const STATUS_FLOW = ['pending', 'preparing', 'out_for_delivery', 'delivered']

function DeliveryOrdersManagement() {
  const [showTutorial, setShowTutorial] = useState(false)
  const handleTutorialDone = useCallback(() => setShowTutorial(false), [])
  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [updatingOrder, setUpdatingOrder] = useState(null)

  const deliveryOrders = useQuery(api.services.transactions.getDeliveryOrders, {
    status: statusFilter === 'all' ? 'all' : statusFilter,
    limit: 100,
  }) || []

  const updateDeliveryStatus = useMutation(api.services.transactions.updateDeliveryStatus)

  const handleStatusUpdate = async (orderId, newStatus) => {
    setUpdatingOrder(orderId)
    try {
      await updateDeliveryStatus({
        transactionId: orderId,
        delivery_status: newStatus,
      })
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setUpdatingOrder(null)
    }
  }

  const getNextStatus = (currentStatus) => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus)
    if (currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1]
    }
    return null
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatAddress = (address) => {
    if (!address) return 'No address provided'
    const parts = [
      address.street_address,
      address.barangay && `Brgy. ${address.barangay}`,
      address.city,
      address.province,
      address.zip_code,
    ].filter(Boolean)
    return parts.join(', ')
  }

  // Count orders by status
  const statusCounts = deliveryOrders.reduce((acc, order) => {
    const status = order.delivery_status || 'pending'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div data-tour="delivery-header" className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-white">Delivery Orders</h2>
            <p className="text-gray-400 mt-1">Manage and track delivery orders</p>
          </div>
          <button onClick={() => setShowTutorial(true)} className="w-8 h-8 rounded-full bg-[#2A2A2A] border border-[#3A3A3A] flex items-center justify-center text-gray-400 hover:text-white hover:border-[var(--color-primary)]/50 transition-all" title="Show tutorial">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] rounded-xl text-gray-300 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Status Summary Cards */}
      <div data-tour="delivery-status-cards" className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const Icon = config.icon
          const count = statusCounts[status] || 0
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`p-4 rounded-2xl border transition-all ${
                statusFilter === status
                  ? 'bg-[var(--color-primary)]/20 border-[var(--color-primary)]'
                  : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon size={18} />
                </div>
                <div className="text-left">
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs text-gray-400">{config.label}</p>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Filter Bar */}
      <div data-tour="delivery-filter" className="flex items-center gap-4 p-4 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
        <Filter size={18} className="text-gray-400" />
        <span className="text-gray-400 text-sm">Filter:</span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#2A2A2A] border border-[#3A3A3A] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--color-primary)]"
        >
          <option value="all">All Orders</option>
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <option key={status} value={status}>{config.label}</option>
          ))}
        </select>
        <span className="text-gray-500 text-sm ml-auto">
          {deliveryOrders.length} order{deliveryOrders.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Orders List */}
      <div data-tour="delivery-list" className="space-y-4">
        {deliveryOrders.length === 0 ? (
          <div className="text-center py-16 bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A]">
            <Truck size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">No delivery orders found</p>
            <p className="text-gray-500 text-sm mt-1">
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Orders will appear here when customers place delivery orders'}
            </p>
          </div>
        ) : (
          deliveryOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.delivery_status] || STATUS_CONFIG.pending
            const StatusIcon = statusConfig.icon
            const isExpanded = expandedOrder === order._id
            const nextStatus = getNextStatus(order.delivery_status)
            const isUpdating = updatingOrder === order._id

            return (
              <div
                key={order._id}
                className="bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden"
              >
                {/* Order Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-[#222]"
                  onClick={() => setExpandedOrder(isExpanded ? null : order._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${statusConfig.color}`}>
                        <StatusIcon size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-white">{order.receipt_number}</p>
                          <span className={`px-2 py-0.5 rounded-lg text-xs border ${statusConfig.color}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {order.customer_name} · {order.item_count} item{order.item_count !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-bold text-white">₱{order.total_amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-[#2A2A2A] p-4 space-y-4">
                    {/* Customer Info */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Customer Details
                        </h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-white">
                            <User size={16} className="text-gray-500" />
                            {order.delivery_address?.contact_name || order.customer_name}
                          </div>
                          {order.delivery_address?.contact_phone && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Phone size={16} className="text-gray-500" />
                              {order.delivery_address.contact_phone}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                          Delivery Address
                        </h4>
                        <div className="flex items-start gap-2 text-gray-300">
                          <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                          <span>{formatAddress(order.delivery_address)}</span>
                        </div>
                        {order.delivery_address?.landmark && (
                          <p className="text-sm text-gray-500 ml-6">
                            Landmark: {order.delivery_address.landmark}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Products */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                        Order Items
                      </h4>
                      <div className="bg-[#0A0A0A] rounded-xl p-3 space-y-2">
                        {order.products.map((product, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">{product.quantity}x</span>
                              <span className="text-white">{product.product_name}</span>
                            </div>
                            <span className="text-gray-300">₱{(product.price * product.quantity).toLocaleString()}</span>
                          </div>
                        ))}
                        <div className="border-t border-[#2A2A2A] pt-2 mt-2">
                          {order.delivery_fee > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-400">Delivery Fee</span>
                              <span className="text-gray-300">₱{order.delivery_fee.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-bold mt-1">
                            <span className="text-white">Total</span>
                            <span className="text-white">₱{order.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Actions */}
                    {order.delivery_status !== 'delivered' && order.delivery_status !== 'cancelled' && (
                      <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                        <div className="text-sm text-gray-400">
                          Branch: <span className="text-white">{order.branch_name}</span>
                        </div>
                        <div className="flex gap-2">
                          {nextStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(order._id, nextStatus)
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              {isUpdating ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <StatusIcon size={16} />
                              )}
                              Mark as {STATUS_CONFIG[nextStatus].label}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleStatusUpdate(order._id, 'cancelled')
                            }}
                            disabled={isUpdating}
                            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {order.notes && (
                      <div className="pt-4 border-t border-[#2A2A2A]">
                        <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                          Notes
                        </h4>
                        <p className="text-gray-300 text-sm whitespace-pre-wrap">{order.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <WalkthroughOverlay steps={deliveryOrdersSteps} isVisible={showTutorial} onComplete={handleTutorialDone} onSkip={handleTutorialDone} />
    </div>
  )
}

export default DeliveryOrdersManagement
