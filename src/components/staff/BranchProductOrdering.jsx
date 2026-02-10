import React, { useState } from 'react'
import { useAppModal } from '../../context/AppModalContext'
import {
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  Filter,
  RefreshCw,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  AlertCircle,
  X,
  FileText,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../common/Modal'

// Product image component for catalog items
const CatalogProductImage = ({ imageUrl, imageStorageId, productName, className }) => {
  const imageUrlFromStorage = useQuery(
    api.services.productCatalog.getImageUrl,
    imageStorageId ? { storageId: imageStorageId } : 'skip'
  )

  const [imageError, setImageError] = useState(false)
  const imageSrc = imageUrl || imageUrlFromStorage

  if (imageError || !imageSrc) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full bg-[#1A1A1A]">
        <Package className="w-8 h-8" />
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={productName}
      className={className}
      onError={() => setImageError(true)}
    />
  )
}

// Order status badge
const OrderStatusBadge = ({ status }) => {
  const statusConfig = {
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Pending' },
    approved: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: CheckCircle, label: 'Approved' },
    shipped: { bg: 'bg-purple-500/20', text: 'text-purple-400', icon: Truck, label: 'Shipped' },
    received: { bg: 'bg-green-500/20', text: 'text-green-400', icon: PackageCheck, label: 'Received' },
    rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: XCircle, label: 'Rejected' },
    cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: XCircle, label: 'Cancelled' },
  }

  const config = statusConfig[status] || statusConfig.pending
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </span>
  )
}

// Stock status badge
const StockBadge = ({ stock, minStock }) => {
  if (stock === 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
        Out of Stock
      </span>
    )
  } else if (stock <= minStock) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
        Low Stock
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
      In Stock
    </span>
  )
}

const BranchProductOrdering = ({ user, onRefresh }) => {
  const { showAlert, showConfirm } = useAppModal()
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' | 'cart' | 'orders'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [cart, setCart] = useState([]) // { product_id, product, quantity }
  const [orderNotes, setOrderNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(null)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')

  // Queries
  const catalogProducts = useQuery(api.services.productCatalog.getCatalogProducts) || []
  const branchOrders = useQuery(
    user?.branch_id ? api.services.productOrders.getOrdersByBranch : undefined,
    user?.branch_id ? { branch_id: user.branch_id } : undefined
  ) || []

  // Mutations
  const createOrder = useMutation(api.services.productOrders.createOrder)
  const cancelOrder = useMutation(api.services.productOrders.cancelOrder)
  const receiveOrder = useMutation(api.services.productOrders.receiveOrder)

  // Filter products
  const filteredProducts = catalogProducts.filter(product => {
    if (!product.is_active) return false
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Filter orders
  const filteredOrders = branchOrders.filter(order => {
    if (orderStatusFilter === 'all') return true
    return order.status === orderStatusFilter
  })

  // Cart functions
  const addToCart = (product) => {
    const existing = cart.find(item => item.product_id === product._id)
    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ))
    } else {
      setCart([...cart, { product_id: product._id, product, quantity: 1 }])
    }
  }

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(cart.map(item =>
        item.product_id === productId
          ? { ...item, quantity }
          : item
      ))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  // Submit order
  const handleSubmitOrder = async () => {
    if (!user?.branch_id || cart.length === 0) return

    setIsSubmitting(true)
    try {
      const items = cart.map(item => ({
        catalog_product_id: item.product_id,
        quantity_requested: item.quantity,
      }))

      await createOrder({
        branch_id: user.branch_id,
        requested_by: user._id,
        items,
        notes: orderNotes.trim() || undefined,
      })

      // Clear cart and notes
      setCart([])
      setOrderNotes('')
      setActiveTab('orders')
      onRefresh?.()
    } catch (error) {
      console.error('Error creating order:', error)
      showAlert({ title: 'Order Error', message: error.message || 'Failed to create order', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    const confirmed = await showConfirm({ title: 'Cancel Order', message: 'Are you sure you want to cancel this order?', type: 'warning' })
    if (!confirmed) return

    try {
      await cancelOrder({
        order_id: orderId,
        cancelled_by: user._id,
        reason: 'Cancelled by branch',
      })
      onRefresh?.()
    } catch (error) {
      console.error('Error cancelling order:', error)
      showAlert({ title: 'Error', message: error.message || 'Failed to cancel order', type: 'error' })
    }
  }

  // Receive order (confirm receipt)
  const handleReceiveOrder = async (orderId) => {
    const confirmed = await showConfirm({ title: 'Confirm Receipt', message: 'Confirm that you have received this order?', type: 'warning' })
    if (!confirmed) return

    try {
      await receiveOrder({
        order_id: orderId,
        received_by: user._id,
      })
      onRefresh?.()
    } catch (error) {
      console.error('Error receiving order:', error)
      showAlert({ title: 'Error', message: error.message || 'Failed to confirm receipt', type: 'error' })
    }
  }

  // Get unique categories from catalog
  const categories = [...new Set(catalogProducts.map(p => p.category))].filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-white">Order Products</h2>
          <p className="text-gray-400 mt-1">Order products from the central warehouse</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onRefresh?.()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#2A2A2A]">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'catalog'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Product Catalog</span>
        </button>
        <button
          onClick={() => setActiveTab('cart')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'cart'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          <span>My Cart</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {getCartItemCount()}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'orders'
              ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#2A2A2A]'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>My Orders</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Search and Filter */}
          <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50">
            <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-[#0A0A0A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)]"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={() => setActiveTab('cart')}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all text-sm"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span>View Cart ({getCartItemCount()})</span>
                </button>
              )}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product_id === product._id)
              const inCart = !!cartItem
              const outOfStock = product.stock === 0

              return (
                <div
                  key={product._id}
                  className={`bg-[#1A1A1A] rounded-xl border overflow-hidden transition-all ${
                    outOfStock
                      ? 'border-[#2A2A2A]/50 opacity-60'
                      : inCart
                        ? 'border-[var(--color-primary)]/50 ring-2 ring-[var(--color-primary)]/20'
                        : 'border-[#2A2A2A]/50 hover:border-[#444444]'
                  }`}
                >
                  {/* Product Image */}
                  <div className="h-32 bg-[#0A0A0A] relative">
                    <CatalogProductImage
                      imageUrl={product.image_url}
                      imageStorageId={product.image_storage_id}
                      productName={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      <StockBadge stock={product.stock} minStock={product.minStock} />
                    </div>
                    {inCart && (
                      <div className="absolute top-2 left-2 bg-[var(--color-primary)] text-white text-xs px-2 py-1 rounded-full">
                        {cartItem.quantity} in cart
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm truncate">{product.name}</h3>
                    {product.brand && (
                      <p className="text-xs text-gray-400 truncate">{product.brand}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 capitalize">{product.category}</p>

                    <div className="flex items-center justify-between mt-3">
                      <div>
                        <div className="text-lg font-bold text-[var(--color-primary)]">
                          ₱{product.price?.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.stock} available
                        </div>
                      </div>

                      {outOfStock ? (
                        <span className="text-xs text-gray-500">Unavailable</span>
                      ) : inCart ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(product._id, cartItem.quantity - 1)}
                            className="p-1.5 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="text-white font-medium w-6 text-center">
                            {cartItem.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(product._id, cartItem.quantity + 1)}
                            className="p-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 transition-all"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all text-sm"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterCategory !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'The central catalog has no products yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'cart' && (
        <div className="space-y-6">
          {cart.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">Your cart is empty</h3>
              <p className="mt-1 text-sm text-gray-500">
                Browse the catalog and add products to your order.
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all text-sm"
              >
                <Package className="h-4 w-4 mr-2" />
                Browse Catalog
              </button>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 overflow-hidden">
                <div className="p-4 border-b border-[#2A2A2A]">
                  <h3 className="text-lg font-bold text-white">Order Items ({cart.length})</h3>
                </div>

                <div className="divide-y divide-[#2A2A2A]">
                  {cart.map(item => (
                    <div key={item.product_id} className="p-4 flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#0A0A0A] flex-shrink-0">
                        <CatalogProductImage
                          imageUrl={item.product.image_url}
                          imageStorageId={item.product.image_storage_id}
                          productName={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white truncate">{item.product.name}</h4>
                        {item.product.brand && (
                          <p className="text-xs text-gray-400">{item.product.brand}</p>
                        )}
                        <p className="text-sm text-[var(--color-primary)] font-semibold mt-1">
                          ₱{item.product.price?.toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-2 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-white font-bold w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 transition-all"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-white font-bold">
                          ₱{(item.product.price * item.quantity).toLocaleString()}
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-red-400 text-xs hover:text-red-300 mt-1"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Notes */}
              <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 p-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Add any special instructions or notes for this order..."
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0A0A0A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                />
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 rounded-xl border border-[var(--color-primary)]/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-300">Total Items</span>
                  <span className="text-white font-semibold">{getCartItemCount()}</span>
                </div>
                <div className="flex items-center justify-between text-xl">
                  <span className="text-gray-300">Total Amount</span>
                  <span className="text-[var(--color-primary)] font-bold">
                    ₱{getCartTotal().toLocaleString()}
                  </span>
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cart.length === 0}
                  className="w-full mt-6 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      <span>Submitting Order...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      <span>Submit Order</span>
                    </>
                  )}
                </button>

                <p className="text-center text-xs text-gray-500 mt-3">
                  Your order will be reviewed by the super admin before processing.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Order Filter */}
          <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50">
            <div className="flex flex-wrap gap-2">
              {['all', 'pending', 'approved', 'shipped', 'received', 'rejected', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setOrderStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    orderStatusFilter === status
                      ? 'bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white'
                      : 'bg-[#2A2A2A] text-gray-400 hover:text-white hover:bg-[#333333]'
                  }`}
                >
                  {status === 'all' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Orders List */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50">
              <FileText className="mx-auto h-12 w-12 text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {orderStatusFilter !== 'all'
                  ? `No ${orderStatusFilter} orders.`
                  : 'You haven\'t placed any orders yet.'}
              </p>
              <button
                onClick={() => setActiveTab('catalog')}
                className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:brightness-110 transition-all text-sm"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Start Ordering
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map(order => (
                <div
                  key={order._id}
                  className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]/50 overflow-hidden"
                >
                  {/* Order Header */}
                  <div
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#222222] transition-colors"
                    onClick={() => setExpandedOrder(expandedOrder === order._id ? null : order._id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[var(--color-primary)] font-semibold">
                            {order.order_number}
                          </span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-gray-400 mt-1">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-white">
                          ₱{order.total_amount?.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.items?.length} item{order.items?.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {expandedOrder === order._id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Order Details (Expanded) */}
                  {expandedOrder === order._id && (
                    <div className="border-t border-[#2A2A2A] p-4 space-y-4">
                      {/* Order Items */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-400">Items</h4>
                        <div className="bg-[#0A0A0A] rounded-lg p-3 space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <div className="flex items-center space-x-2">
                                <span className="text-white">{item.product_name}</span>
                                <span className="text-gray-500">x{item.quantity_requested}</span>
                                {item.quantity_approved !== undefined && item.quantity_approved !== item.quantity_requested && (
                                  <span className="text-yellow-400 text-xs">
                                    (Approved: {item.quantity_approved})
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-300">
                                ₱{(item.unit_price * item.quantity_requested).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-400 mb-1">Notes</h4>
                          <p className="text-sm text-gray-300 bg-[#0A0A0A] rounded-lg p-3">
                            {order.notes}
                          </p>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {order.status === 'rejected' && order.rejection_reason && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <h4 className="text-sm font-medium text-red-400 mb-1">Rejection Reason</h4>
                          <p className="text-sm text-red-300">{order.rejection_reason}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex justify-end space-x-3 pt-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCancelOrder(order._id)
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Cancel Order</span>
                          </button>
                        )}

                        {order.status === 'shipped' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleReceiveOrder(order._id)
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                          >
                            <PackageCheck className="h-4 w-4" />
                            <span>Confirm Receipt</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default BranchProductOrdering
