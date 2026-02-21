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
  ChevronUp,
  HelpCircle,
  Wallet,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react'
import WalkthroughOverlay from '../common/WalkthroughOverlay'
import { branchOrderingSteps } from '../../config/walkthroughSteps'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../common/Modal'
import DamageReportModal from './DamageReportModal'

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

// Stock status badge (uses available stock accounting for reservations)
const StockBadge = ({ stock, minStock, availableStock }) => {
  const qty = availableStock ?? stock
  if (qty <= 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">
        Out of Stock
      </span>
    )
  } else if (qty <= minStock) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
        Low Stock ({qty})
      </span>
    )
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">
      In Stock ({qty})
    </span>
  )
}

const BranchProductOrdering = ({ user, onRefresh }) => {
  const { showAlert, showConfirm } = useAppModal()
  const [showTutorial, setShowTutorial] = useState(false)
  const [activeTab, setActiveTab] = useState('catalog') // 'catalog' | 'cart' | 'orders'
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [cart, setCart] = useState([]) // { product_id, product, quantity }
  const [orderNotes, setOrderNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(null)
  const [expandedOrder, setExpandedOrder] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [showTopUpInfo, setShowTopUpInfo] = useState(false)
  const [damageReportOrder, setDamageReportOrder] = useState(null)
  const [reconcileOrder, setReconcileOrder] = useState(null)

  // Queries
  const catalogProducts = useQuery(api.services.productCatalog.getCatalogProducts) || []
  const branchOrders = useQuery(
    user?.branch_id ? api.services.productOrders.getOrdersByBranch : undefined,
    user?.branch_id ? { branch_id: user.branch_id } : undefined
  ) || []
  const branchWallet = useQuery(
    api.services.branchWallet.getBranchWallet,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  )
  const branchClaims = useQuery(
    api.services.damageClaims.getClaimsByBranch,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  ) || []
  const smartSuggestions = useQuery(
    api.services.smartOrdering.getSmartSuggestions,
    user?.branch_id ? { branch_id: user.branch_id } : 'skip'
  )
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Mutations
  const createOrder = useMutation(api.services.productOrders.createOrder)
  const cancelOrder = useMutation(api.services.productOrders.cancelOrder)
  const receiveOrder = useMutation(api.services.productOrders.receiveOrder)
  const reconcileOrderReceipt = useMutation(api.services.productOrders.reconcileOrderReceipt)

  // Add a single suggestion to cart
  const addSuggestionToCart = (suggestion) => {
    const product = catalogProducts.find(p => p._id === suggestion.catalog_product_id)
    if (!product) return
    const maxQty = product.availableStock ?? product.stock
    if (maxQty <= 0) return
    const qty = Math.min(suggestion.suggested_qty, maxQty)
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product._id)
      if (existing) {
        const newQty = Math.min(existing.quantity + qty, maxQty)
        return prev.map(item =>
          item.product_id === product._id ? { ...item, quantity: newQty } : item
        )
      }
      return [...prev, { product_id: product._id, product, quantity: qty }]
    })
  }

  // Add all critical/low suggestions to cart at once
  const addAllSuggestionsToCart = () => {
    if (!smartSuggestions?.suggestions) return
    const urgent = smartSuggestions.suggestions.filter(
      s => s.urgency === 'critical' || s.urgency === 'low' || s.urgency === 'reorder'
    )
    setCart(prev => {
      let newCart = [...prev]
      for (const suggestion of urgent) {
        const product = catalogProducts.find(p => p._id === suggestion.catalog_product_id)
        if (!product) continue
        const maxQty = product.availableStock ?? product.stock
        if (maxQty <= 0) continue
        const qty = Math.min(suggestion.suggested_qty, maxQty)
        const existingIdx = newCart.findIndex(item => item.product_id === product._id)
        if (existingIdx >= 0) {
          const newQty = Math.min(newCart[existingIdx].quantity + qty, maxQty)
          newCart[existingIdx] = { ...newCart[existingIdx], quantity: newQty }
        } else {
          newCart.push({ product_id: product._id, product, quantity: qty })
        }
      }
      return newCart
    })
    showAlert('Smart Cart', `Added ${urgent.length} suggested products to your cart.`)
  }

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

  // Cart functions (use functional setCart to avoid stale closures from Convex reactive re-renders)
  const addToCart = (product) => {
    const maxQty = product.availableStock ?? product.stock
    if (maxQty <= 0) return
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product._id)
      if (existing) {
        if (existing.quantity >= maxQty) return prev
        return prev.map(item =>
          item.product_id === product._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prev, { product_id: product._id, product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId))
  }

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else {
      setCart(prev => prev.map(item => {
        if (item.product_id !== productId) return item
        const maxQty = item.product?.availableStock ?? item.product?.stock ?? Infinity
        return { ...item, quantity: Math.min(quantity, maxQty) }
      }))
    }
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0)
  }

  // Submit order with confirmation
  const handleSubmitOrder = async () => {
    if (!user?.branch_id || cart.length === 0) return

    const total = getCartTotal()
    const itemCount = getCartItemCount()
    const itemSummary = cart.map(item => `${item.quantity}x ${item.product.name}`).join(', ')

    const confirmed = await showConfirm({
      title: 'Confirm Order',
      message: `You are about to place an order for ${itemCount} item${itemCount !== 1 ? 's' : ''} totaling ₱${total.toLocaleString()}.\n\n${itemSummary}\n\nThis amount will be held from your Branch Wallet. Continue?`,
      type: 'warning',
    })
    if (!confirmed) return

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
      showAlert({ title: 'Order Placed', message: `Order submitted successfully! ₱${total.toLocaleString()} has been held from your wallet.`, type: 'success' })
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
      <div data-tour="order-header" className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
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
          <button onClick={() => setShowTutorial(true)} className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#2A2A2A] transition-colors" title="Show tutorial">
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div data-tour="order-tabs" className="flex space-x-1 bg-[#1A1A1A] p-1 rounded-xl border border-[#2A2A2A]">
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
      <div data-tour="order-content">
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

          {/* Smart Suggestions */}
          {smartSuggestions?.suggestions?.length > 0 && showSuggestions && (
            <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  <h3 className="text-white font-semibold text-sm">Smart Reorder Suggestions</h3>
                  <span className="text-gray-400 text-xs">
                    Based on {smartSuggestions.meta.analysis_period_days}d sales data
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {smartSuggestions.suggestions.filter(s => s.urgency !== 'healthy').length > 0 && (
                    <button
                      onClick={addAllSuggestionsToCart}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Zap className="w-3 h-3" />
                      Add All to Cart
                    </button>
                  )}
                  <button
                    onClick={() => setShowSuggestions(false)}
                    className="text-gray-500 hover:text-gray-300 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-4 flex gap-3 overflow-x-auto">
                {smartSuggestions.suggestions.slice(0, 8).map(suggestion => {
                  const inCart = cart.some(item => item.product_id === suggestion.catalog_product_id)
                  return (
                    <div
                      key={suggestion.catalog_product_id}
                      className={`flex-shrink-0 w-56 p-3 rounded-xl border transition-all ${
                        suggestion.urgency === 'critical'
                          ? 'bg-red-500/10 border-red-500/30'
                          : suggestion.urgency === 'low'
                            ? 'bg-yellow-500/10 border-yellow-500/30'
                            : 'bg-[#1A1A1A] border-[#2A2A2A]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          suggestion.urgency === 'critical'
                            ? 'bg-red-500/20 text-red-400'
                            : suggestion.urgency === 'low'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {suggestion.urgency === 'critical' ? 'Urgent' : suggestion.urgency === 'low' ? 'Low Stock' : 'Reorder'}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          {suggestion.days_of_supply === 999 ? '∞' : suggestion.days_of_supply + 'd'} supply
                        </span>
                      </div>

                      <h4 className="text-white text-sm font-medium truncate" title={suggestion.product_name}>
                        {suggestion.product_name}
                      </h4>

                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span className="text-gray-400">
                          Stock: <span className="text-white font-medium">{suggestion.current_stock}</span>
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-400 flex items-center gap-0.5">
                          <TrendingUp className="w-3 h-3" />
                          {suggestion.daily_sales_rate}/day
                        </span>
                      </div>

                      <p className="text-gray-500 text-[10px] mt-1 truncate" title={suggestion.reason}>
                        {suggestion.reason}
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-purple-400 text-xs font-bold">
                          Qty: {suggestion.suggested_qty}
                        </span>
                        <button
                          onClick={() => addSuggestionToCart(suggestion)}
                          disabled={inCart}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                            inCart
                              ? 'bg-green-500/20 text-green-400 cursor-default'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }`}
                        >
                          {inCart ? (
                            <>
                              <CheckCircle className="w-3 h-3" />
                              In Cart
                            </>
                          ) : (
                            <>
                              <Plus className="w-3 h-3" />
                              Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Collapsed suggestion toggle */}
          {smartSuggestions?.suggestions?.length > 0 && !showSuggestions && (
            <button
              onClick={() => setShowSuggestions(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 text-sm hover:bg-purple-500/20 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Show Smart Suggestions ({smartSuggestions.suggestions.filter(s => s.urgency !== 'healthy').length} items need reorder)
            </button>
          )}

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
              const cartItem = cart.find(item => item.product_id === product._id)
              const inCart = !!cartItem
              const availableStock = product.availableStock ?? product.stock
              const outOfStock = availableStock <= 0

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
                      <StockBadge stock={product.stock} minStock={product.minStock} availableStock={product.availableStock} />
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
                          {availableStock} available
                          {(product.reservedStock ?? 0) > 0 && (
                            <span className="text-yellow-500 ml-1">({product.reservedStock} reserved)</span>
                          )}
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
                            disabled={cartItem.quantity >= availableStock}
                            className="p-1.5 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                          disabled={item.quantity >= (item.product.availableStock ?? item.product.stock)}
                          className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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

                {/* Branch Wallet Payment (Mandatory) */}
                <div className="mt-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-300 text-sm font-medium flex items-center gap-1.5">
                      <Wallet className="w-4 h-4" />
                      Payment via Branch Wallet
                    </span>
                    <span className={`font-bold text-sm ${branchWallet && branchWallet.balance >= getCartTotal() ? 'text-green-400' : 'text-red-400'}`}>
                      ₱{(branchWallet?.balance ?? 0).toLocaleString()}
                    </span>
                  </div>

                  {branchWallet && branchWallet.balance >= getCartTotal() ? (
                    <p className="text-xs text-green-400 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      ₱{getCartTotal().toLocaleString()} will be held from your wallet until delivery is confirmed.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Insufficient balance. Need ₱{(getCartTotal() - (branchWallet?.balance ?? 0)).toLocaleString()} more.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          // Navigate to wallet/finance tab for top-up
                          window.location.hash = '#finance'
                          showAlert({ title: 'Top Up Required', message: 'Please top up your Branch Wallet first, then return to place your order.', type: 'warning' })
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <Wallet className="w-4 h-4" />
                        Top Up Wallet
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmitOrder}
                  disabled={isSubmitting || cart.length === 0 || !branchWallet || branchWallet.balance < getCartTotal()}
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
                  Payment is held from your wallet. Your order will be reviewed by HQ before processing.
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

                      {/* Damage Claim Status */}
                      {order.status === 'received' && (() => {
                        const claim = branchClaims.find(c => c.order_id === order._id)
                        if (!claim) return null
                        const claimColors = {
                          pending: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
                          approved: 'bg-green-500/10 border-green-500/20 text-green-400',
                          rejected: 'bg-red-500/10 border-red-500/20 text-red-400',
                        }
                        return (
                          <div className={`border rounded-lg p-3 ${claimColors[claim.status]}`}>
                            <h4 className="text-xs font-medium mb-0.5">
                              Damage Claim — {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                            </h4>
                            <p className="text-xs opacity-80">
                              ₱{claim.total_damage_amount.toLocaleString()} claimed
                              {claim.credit_amount ? ` • ₱${claim.credit_amount.toLocaleString()} credited` : ''}
                            </p>
                          </div>
                        )
                      })()}

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
                              setReconcileOrder(order)
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                          >
                            <PackageCheck className="h-4 w-4" />
                            <span>Receive & Log</span>
                          </button>
                        )}

                        {order.status === 'received' && !branchClaims.find(c => c.order_id === order._id) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setDamageReportOrder(order)
                            }}
                            className="flex items-center space-x-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                          >
                            <AlertCircle className="h-4 w-4" />
                            <span>Report Damage</span>
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

      <WalkthroughOverlay steps={branchOrderingSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />

      {/* Damage Report Modal */}
      {damageReportOrder && (
        <DamageReportModal
          order={damageReportOrder}
          userId={user._id}
          onClose={() => setDamageReportOrder(null)}
        />
      )}

      {/* Reconcile Receipt Modal */}
      {reconcileOrder && (
        <ReconcileReceiptModal
          order={reconcileOrder}
          onClose={() => setReconcileOrder(null)}
          onConfirm={async (receivedItems, notes) => {
            try {
              const result = await reconcileOrderReceipt({
                order_id: reconcileOrder._id,
                received_by: user._id,
                received_items: receivedItems,
                notes: notes || undefined,
              })
              setReconcileOrder(null)
              onRefresh?.()
              if (result.hasDiscrepancy) {
                showAlert({ title: 'Discrepancy Reported', message: 'Receipt confirmed. A discrepancy report has been sent to HQ for review.', type: 'warning' })
              }
            } catch (error) {
              showAlert({ title: 'Error', message: error.message || 'Failed to confirm receipt', type: 'error' })
            }
          }}
        />
      )}
    </div>
  )
}

/**
 * ReconcileReceiptModal — branch staff confirms actual quantities received per item.
 * Auto-flags discrepancies against HQ-shipped quantities.
 */
const ReconcileReceiptModal = ({ order, onClose, onConfirm }) => {
  const [items, setItems] = useState(() =>
    order.items.map((item) => ({
      catalog_product_id: item.catalog_product_id,
      product_name: item.product_name,
      quantity_shipped: item.quantity_approved ?? item.quantity_requested,
      quantity_received: item.quantity_approved ?? item.quantity_requested,
      expiry_date: '',
    }))
  )
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasDiscrepancy = items.some(
    (item) => Number(item.quantity_received) !== item.quantity_shipped
  )

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const receivedItems = items.map((item) => ({
      catalog_product_id: item.catalog_product_id,
      quantity_received: Math.max(0, Number(item.quantity_received) || 0),
      expiry_date: item.expiry_date ? new Date(item.expiry_date).getTime() : undefined,
    }))
    await onConfirm(receivedItems, notes)
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#333333] rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#333333]">
          <div>
            <h3 className="text-white font-semibold text-lg">Receive Shipment</h3>
            <p className="text-gray-500 text-sm">{order.order_number}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {hasDiscrepancy && (
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-orange-400 text-xs">Quantities differ from what was shipped — a discrepancy report will be sent to HQ.</p>
            </div>
          )}

          {items.map((item, index) => {
            const received = Number(item.quantity_received) || 0
            const diff = item.quantity_shipped - received
            const diffColor = diff > 0 ? 'text-red-400' : diff < 0 ? 'text-yellow-400' : 'text-green-400'

            return (
              <div key={item.catalog_product_id} className="bg-[#111111] border border-[#2A2A2A] rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-white font-medium text-sm">{item.product_name}</p>
                  {diff !== 0 && (
                    <span className={`text-xs font-semibold ${diffColor} flex-shrink-0`}>
                      {diff > 0 ? `−${diff} short` : `+${Math.abs(diff)} excess`}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Expected (shipped)</label>
                    <div className="bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400 rounded-lg px-3 py-2 text-sm">{item.quantity_shipped}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Actually received <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      min="0"
                      value={item.quantity_received}
                      onChange={(e) => setItems((prev) => prev.map((it, i) => i === index ? { ...it, quantity_received: e.target.value } : it))}
                      className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Expiry Date <span className="text-gray-600">(Optional)</span></label>
                  <input
                    type="date"
                    value={item.expiry_date}
                    onChange={(e) => setItems((prev) => prev.map((it, i) => i === index ? { ...it, expiry_date: e.target.value } : it))}
                    className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm focus:border-[var(--color-primary)] outline-none"
                  />
                </div>
              </div>
            )
          })}

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Notes <span className="text-gray-600">(Optional)</span></label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any notes about this receipt..."
              className="w-full bg-[#111111] border border-[#333333] text-white rounded-lg px-3 py-2 text-sm resize-none focus:border-[var(--color-primary)] outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-[#333333]">
          <button onClick={onClose} className="flex-1 py-2.5 text-gray-400 hover:text-white bg-[#111111] rounded-xl text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <><RefreshCw className="w-4 h-4 animate-spin" /> Confirming...</> : <><PackageCheck className="w-4 h-4" /> Confirm Receipt</>}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BranchProductOrdering
