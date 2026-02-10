import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useCart } from '../../../context/CartContext'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import {
  X,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Package,
  Wallet,
  CreditCard,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2,
  PartyPopper,
  Receipt,
  Truck,
  Home,
  Briefcase,
  Clock,
  Phone,
  User,
  ChevronDown,
  Building2,
  MapPinned,
} from 'lucide-react'

function ShoppingCartDrawer() {
  const navigate = useNavigate()
  const { user } = useCurrentUser()
  const {
    items,
    itemCount,
    subtotal,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart()

  // State
  const [paymentMethod, setPaymentMethod] = useState('wallet') // 'wallet' or 'cash'
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [showAddressList, setShowAddressList] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [orderError, setOrderError] = useState(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // Address form state with complete fields
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    street_address: '',
    barangay: '',
    city: '',
    province: '',
    zip_code: '',
    landmark: '',
    contact_name: user?.nickname || user?.username || '',
    contact_phone: user?.mobile_number || '',
  })

  // Mutations
  const createTransaction = useMutation(api.services.transactions.createTransaction)
  const addAddress = useMutation(api.services.userAddresses.addAddress)

  // Queries
  const wallet = useQuery(
    api.services.wallet.getWallet,
    user?._id ? { userId: user._id } : 'skip'
  )
  const userAddresses = useQuery(
    api.services.userAddresses.getUserAddresses,
    user?._id ? { user_id: user._id } : 'skip'
  ) || []
  // Get all branches to find a fulfillment branch for catalog products
  const branches = useQuery(api.services.branches.getAllBranches) || []
  // Get shop configuration for delivery fee
  const shopConfig = useQuery(api.services.shopConfig.getShopConfig) || {}

  // Calculate delivery fee (with free delivery threshold support)
  const configDeliveryFee = shopConfig.delivery_fee ?? 50 // Default 50 if not configured
  const freeDeliveryThreshold = shopConfig.free_delivery_threshold ?? 0
  const qualifiesForFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold
  const deliveryFee = qualifiesForFreeDelivery ? 0 : configDeliveryFee

  // Calculate totals
  const totalAmount = subtotal + deliveryFee
  const walletBalance = wallet ? (wallet.balance + (wallet.bonus_balance || 0)) / 100 : 0
  const canPayWithWallet = walletBalance >= totalAmount

  // Set default address when addresses load
  useEffect(() => {
    if (userAddresses.length > 0 && !selectedAddressId) {
      const defaultAddr = userAddresses.find(a => a.is_default) || userAddresses[0]
      setSelectedAddressId(defaultAddr._id)
    }
  }, [userAddresses, selectedAddressId])

  // Update form with user info when user loads
  useEffect(() => {
    if (user) {
      setAddressForm(prev => ({
        ...prev,
        contact_name: prev.contact_name || user.nickname || user.username || '',
        contact_phone: prev.contact_phone || user.mobile_number || '',
      }))
    }
  }, [user])

  // Get selected address object
  const selectedAddress = userAddresses.find(a => a._id === selectedAddressId)

  // Validate address form
  const isAddressFormValid = () => {
    return (
      addressForm.street_address.trim() &&
      addressForm.city.trim() &&
      addressForm.province.trim() &&
      addressForm.zip_code.trim() &&
      addressForm.contact_name.trim() &&
      addressForm.contact_phone.trim()
    )
  }

  // Handle adding new address
  const handleSaveAddress = async () => {
    if (!user?._id || !isAddressFormValid()) {
      return
    }

    setIsSavingAddress(true)
    try {
      const result = await addAddress({
        user_id: user._id,
        label: addressForm.label,
        street_address: addressForm.street_address,
        barangay: addressForm.barangay || undefined,
        city: addressForm.city,
        province: addressForm.province,
        zip_code: addressForm.zip_code,
        landmark: addressForm.landmark || undefined,
        contact_name: addressForm.contact_name,
        contact_phone: addressForm.contact_phone,
        is_default: userAddresses.length === 0,
      })
      setSelectedAddressId(result.addressId)
      setShowAddressForm(false)
      // Reset form
      setAddressForm({
        label: 'Home',
        street_address: '',
        barangay: '',
        city: '',
        province: '',
        zip_code: '',
        landmark: '',
        contact_name: user?.nickname || user?.username || '',
        contact_phone: user?.mobile_number || '',
      })
    } catch (err) {
      console.error('Failed to save address:', err)
    } finally {
      setIsSavingAddress(false)
    }
  }

  // Handle checkout
  const handleCheckout = () => {
    if (!selectedAddress) {
      setShowAddressForm(true)
      return
    }
    if (paymentMethod === 'wallet' && !canPayWithWallet) {
      return
    }
    setOrderError(null)
    setShowCheckout(true)
  }

  // Handle payment confirmation
  const handleConfirmPayment = async () => {
    if (!user?._id) {
      setOrderError('Please login to complete your purchase')
      return
    }

    if (!selectedAddress) {
      setOrderError('Please add a delivery address')
      return
    }

    setIsProcessing(true)
    setOrderError(null)

    try {
      // Get branch_id from product, or use default fulfillment branch for catalog products
      let branchId = items[0]?.product?.branch_id
      if (!branchId) {
        // For catalog products (no branch_id), use the first active branch as fulfillment center
        const activeBranch = branches.find(b => b.is_active) || branches[0]
        if (!activeBranch) {
          throw new Error('No fulfillment branch available')
        }
        branchId = activeBranch._id
      }

      const products = items.map(item => ({
        product_id: item.product._id,
        product_name: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      }))

      // Build transaction data
      const transactionData = {
        customer: user._id,
        customer_name: user.nickname || user.username,
        customer_phone: user.mobile_number || '',
        customer_email: user.email || '',
        branch_id: branchId,
        transaction_type: 'retail',
        products,
        services: [],
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: totalAmount,
        payment_method: paymentMethod === 'wallet' ? 'wallet' : 'cash',
        payment_status: paymentMethod === 'wallet' ? 'completed' : 'pending',
        processed_by: user._id,
        skip_booking_creation: true,
        fulfillment_type: 'delivery',
        delivery_address: {
          street_address: selectedAddress.street_address,
          barangay: selectedAddress.barangay,
          city: selectedAddress.city,
          province: selectedAddress.province,
          zip_code: selectedAddress.zip_code,
          landmark: selectedAddress.landmark,
          contact_name: selectedAddress.contact_name,
          contact_phone: selectedAddress.contact_phone,
        },
        delivery_fee: deliveryFee,
        delivery_status: 'pending',
        estimated_delivery: '30-45 mins',
      }

      const result = await createTransaction(transactionData)

      setOrderSuccess({
        receipt_number: result.receipt_number,
        transaction_id: result.transaction_id,
        items: [...items],
        total: totalAmount,
        paymentMethod,
        deliveryAddress: selectedAddress,
        deliveryFee,
      })
      clearCart()
      setShowCheckout(false)
    } catch (error) {
      console.error('Checkout error:', error)
      const errorMessage = error.message || 'Payment failed. Please try again.'
      if (errorMessage.includes('Insufficient') || errorMessage.includes('balance')) {
        setOrderError('Insufficient wallet balance. Please top up or choose cash payment.')
      } else if (errorMessage.includes('stock') || errorMessage.includes('Stock')) {
        setOrderError('Some items are out of stock. Please review your cart.')
      } else {
        setOrderError(errorMessage)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCloseSuccess = () => {
    setOrderSuccess(null)
    closeCart()
  }

  if (!isCartOpen) return null

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-[#0A0A0A] shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1A1A1A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Your Cart</h2>
              <p className="text-xs text-gray-400">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center hover:bg-[#2A2A2A] transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <EmptyCart onClose={closeCart} />
          ) : (
            items.map((item) => (
              <CartItem
                key={item.product._id}
                item={item}
                onUpdateQuantity={(qty) => updateQuantity(item.product._id, qty)}
                onRemove={() => removeItem(item.product._id)}
              />
            ))
          )}
        </div>

        {/* Footer - Only show if cart has items */}
        {items.length > 0 && (
          <div className="border-t border-[#1A1A1A] p-4 space-y-4 bg-[#0A0A0A]">
            {/* Delivery Header */}
            <div className="flex items-center gap-2 pb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Truck className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Door-to-Door Delivery</p>
                <p className="text-xs text-gray-400">Delivered to your address</p>
              </div>
            </div>

            {/* Delivery Address Section */}
            <div className="space-y-2">
              {selectedAddress ? (
                <button
                  onClick={() => setShowAddressList(true)}
                  className="w-full p-3 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] hover:border-green-500/50 transition-all text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {selectedAddress.label === 'Home' ? (
                        <Home className="w-4 h-4 text-green-400" />
                      ) : selectedAddress.label === 'Work' ? (
                        <Briefcase className="w-4 h-4 text-green-400" />
                      ) : (
                        <MapPin className="w-4 h-4 text-green-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{selectedAddress.label}</span>
                        <span className="px-1.5 py-0.5 bg-green-500/20 rounded text-[10px] font-bold text-green-400">
                          Selected
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{selectedAddress.full_address}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedAddress.contact_name} • {selectedAddress.contact_phone}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  </div>
                </button>
              ) : (
                <button
                  onClick={() => setShowAddressForm(true)}
                  className="w-full p-4 rounded-xl border-2 border-dashed border-[#2A2A2A] hover:border-green-500/50 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-green-400"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-semibold">Add Delivery Address</span>
                </button>
              )}

              {/* Delivery Info */}
              <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-xl">
                <Clock className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400 font-medium">Estimated delivery: 30-45 mins</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payment Method</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentMethod('wallet')}
                  className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                    paymentMethod === 'wallet'
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400'
                  }`}
                >
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">Wallet</span>
                </button>
                <button
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : 'bg-[#1A1A1A] border-[#2A2A2A] text-gray-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="text-sm font-medium">COD</span>
                </button>
              </div>

              {/* Wallet Balance Info */}
              {paymentMethod === 'wallet' && (
                <div className={`flex items-center gap-2 p-3 rounded-xl ${
                  canPayWithWallet ? 'bg-green-500/10' : 'bg-red-500/10'
                }`}>
                  {canPayWithWallet ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className={`text-sm ${canPayWithWallet ? 'text-green-400' : 'text-red-400'}`}>
                    Wallet: ₱{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {!canPayWithWallet && (
                    <button
                      onClick={() => {
                        closeCart()
                        navigate('/customer/wallet/topup')
                      }}
                      className="ml-auto text-xs font-semibold text-[var(--color-primary)]"
                    >
                      Top Up
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="space-y-2 pt-2 border-t border-[#1A1A1A]">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white font-medium">₱{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Delivery Fee</span>
                {qualifiesForFreeDelivery ? (
                  <span className="text-green-400 font-medium">FREE</span>
                ) : (
                  <span className="text-white font-medium">₱{deliveryFee.toLocaleString()}</span>
                )}
              </div>
              {freeDeliveryThreshold > 0 && !qualifiesForFreeDelivery && (
                <p className="text-xs text-amber-400 text-right">
                  Add ₱{(freeDeliveryThreshold - subtotal).toLocaleString()} more for free delivery
                </p>
              )}
              <div className="flex justify-between pt-2">
                <span className="text-white font-semibold">Total</span>
                <span className="text-xl font-bold text-green-400">₱{totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleCheckout}
              disabled={(paymentMethod === 'wallet' && !canPayWithWallet)}
              className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] ${
                (paymentMethod === 'wallet' && !canPayWithWallet)
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
              }`}
            >
              {!selectedAddress
                ? 'Add Delivery Address'
                : paymentMethod === 'wallet'
                ? `Pay ₱${totalAmount.toLocaleString()} with Wallet`
                : `Order • Cash on Delivery`}
            </button>
          </div>
        )}
      </div>

      {/* Address List Modal */}
      {showAddressList && (
        <AddressListModal
          addresses={userAddresses}
          selectedId={selectedAddressId}
          onSelect={(id) => {
            setSelectedAddressId(id)
            setShowAddressList(false)
          }}
          onAddNew={() => {
            setShowAddressList(false)
            setShowAddressForm(true)
          }}
          onClose={() => setShowAddressList(false)}
        />
      )}

      {/* Address Form Modal */}
      {showAddressForm && (
        <AddressFormModal
          form={addressForm}
          setForm={setAddressForm}
          onSave={handleSaveAddress}
          onClose={() => setShowAddressForm(false)}
          isSaving={isSavingAddress}
          isValid={isAddressFormValid()}
        />
      )}

      {/* Checkout Confirmation Modal */}
      {showCheckout && (
        <CheckoutModal
          itemCount={itemCount}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          totalAmount={totalAmount}
          paymentMethod={paymentMethod}
          selectedAddress={selectedAddress}
          isProcessing={isProcessing}
          orderError={orderError}
          onConfirm={handleConfirmPayment}
          onCancel={() => setShowCheckout(false)}
        />
      )}

      {/* Order Success Screen */}
      {orderSuccess && (
        <OrderSuccessScreen
          orderSuccess={orderSuccess}
          onClose={handleCloseSuccess}
        />
      )}

      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Empty Cart Component
function EmptyCart({ onClose }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] flex items-center justify-center mx-auto mb-4">
        <ShoppingCart className="w-10 h-10 text-gray-500" />
      </div>
      <p className="text-gray-400 font-semibold text-lg">Your cart is empty</p>
      <p className="text-sm text-gray-500 mt-1">Add products to get started</p>
      <button
        onClick={onClose}
        className="mt-6 px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all active:scale-[0.98]"
      >
        Continue Shopping
      </button>
    </div>
  )
}

// Cart Item Component
function CartItem({ item, onUpdateQuantity, onRemove }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="flex gap-3 p-3 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A]">
      <div className="w-20 h-20 rounded-lg bg-[#2A2A2A] overflow-hidden flex-shrink-0">
        {item.product.imageUrl && !imageError ? (
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white line-clamp-2">{item.product.name}</p>
        <p className="text-sm text-green-400 font-bold mt-1">
          ₱{item.product.price.toLocaleString()}
        </p>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 bg-[#2A2A2A] rounded-lg p-1">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#3A3A3A] transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-400" />
            </button>
            <span className="w-8 text-center text-sm font-semibold text-white">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#3A3A3A] transition-colors"
            >
              <Plus className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <button
            onClick={onRemove}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

// Address List Modal
function AddressListModal({ addresses, selectedId, onSelect, onAddNew, onClose }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-end sm:items-center justify-center z-10">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2A] max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Select Address</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {addresses.map((addr) => (
            <button
              key={addr._id}
              onClick={() => onSelect(addr._id)}
              className={`w-full p-4 rounded-xl border text-left transition-all ${
                selectedId === addr._id
                  ? 'bg-green-500/10 border-green-500'
                  : 'bg-[#1A1A1A] border-[#2A2A2A] hover:border-[#3A3A3A]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selectedId === addr._id ? 'bg-green-500/20' : 'bg-[#2A2A2A]'
                }`}>
                  {addr.label === 'Home' ? (
                    <Home className={`w-4 h-4 ${selectedId === addr._id ? 'text-green-400' : 'text-gray-400'}`} />
                  ) : addr.label === 'Work' ? (
                    <Briefcase className={`w-4 h-4 ${selectedId === addr._id ? 'text-green-400' : 'text-gray-400'}`} />
                  ) : (
                    <MapPin className={`w-4 h-4 ${selectedId === addr._id ? 'text-green-400' : 'text-gray-400'}`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{addr.label}</span>
                    {addr.is_default && (
                      <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] font-bold text-blue-400">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{addr.full_address}</p>
                  <p className="text-xs text-gray-500 mt-1">{addr.contact_name} • {addr.contact_phone}</p>
                </div>
                {selectedId === addr._id && (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-[#1A1A1A]">
          <button
            onClick={onAddNew}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[#2A2A2A] text-gray-400 font-semibold hover:border-green-500/50 hover:text-green-400 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add New Address
          </button>
        </div>
      </div>
    </div>
  )
}

// Address Form Modal with complete fields
function AddressFormModal({ form, setForm, onSave, onClose, isSaving, isValid }) {
  const labelOptions = ['Home', 'Work', 'Other']

  return (
    <div className="absolute inset-0 bg-black/70 flex items-end sm:items-center justify-center z-10">
      <div className="w-full max-w-md bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2A] max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-[#1A1A1A] flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Add Delivery Address</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Label Selection */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Label</label>
            <div className="flex gap-2 mt-2">
              {labelOptions.map((label) => (
                <button
                  key={label}
                  onClick={() => setForm(prev => ({ ...prev, label }))}
                  className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    form.label === label
                      ? 'bg-green-500/20 border border-green-500 text-green-400'
                      : 'bg-[#1A1A1A] border border-[#2A2A2A] text-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Street Address */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Street Address *</label>
            <div className="relative mt-2">
              <MapPinned className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
              <textarea
                value={form.street_address}
                onChange={(e) => setForm(prev => ({ ...prev, street_address: e.target.value }))}
                placeholder="House/Unit No., Street, Subdivision"
                rows={2}
                className="w-full p-3 pl-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Barangay */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Barangay</label>
            <input
              type="text"
              value={form.barangay}
              onChange={(e) => setForm(prev => ({ ...prev, barangay: e.target.value }))}
              placeholder="e.g., San Antonio"
              className="w-full mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* City & Province Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">City *</label>
              <div className="relative mt-2">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                  className="w-full p-3 pl-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Province *</label>
              <input
                type="text"
                value={form.province}
                onChange={(e) => setForm(prev => ({ ...prev, province: e.target.value }))}
                placeholder="Province"
                className="w-full mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Zip Code */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Zip Code *</label>
            <input
              type="text"
              value={form.zip_code}
              onChange={(e) => setForm(prev => ({ ...prev, zip_code: e.target.value }))}
              placeholder="e.g., 1234"
              maxLength={4}
              className="w-full mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Landmark */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Landmark (Optional)</label>
            <input
              type="text"
              value={form.landmark}
              onChange={(e) => setForm(prev => ({ ...prev, landmark: e.target.value }))}
              placeholder="Near the church, beside the park..."
              className="w-full mt-2 p-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-[#2A2A2A] pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contact Information</p>
          </div>

          {/* Contact Name */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Recipient Name *</label>
            <div className="relative mt-2">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm(prev => ({ ...prev, contact_name: e.target.value }))}
                placeholder="Full name"
                className="w-full p-3 pl-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Phone Number *</label>
            <div className="relative mt-2">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                placeholder="09XX XXX XXXX"
                className="w-full p-3 pl-10 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-green-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-[#1A1A1A]">
          <button
            onClick={onSave}
            disabled={!isValid || isSaving}
            className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Address'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Checkout Modal
function CheckoutModal({ itemCount, subtotal, deliveryFee, totalAmount, paymentMethod, selectedAddress, isProcessing, orderError, onConfirm, onCancel }) {
  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-10">
      <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-white mb-4">Confirm Order</h3>

        {orderError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{orderError}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Items</span>
            <span className="text-white">{itemCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delivery</span>
            <span className="text-white flex items-center gap-1">
              <Truck className="w-3 h-3" /> Door-to-Door
            </span>
          </div>
          {selectedAddress && (
            <div className="text-sm">
              <span className="text-gray-400 block mb-1">Deliver to</span>
              <p className="text-white text-xs">{selectedAddress.full_address}</p>
              <p className="text-gray-500 text-xs mt-1">{selectedAddress.contact_name} • {selectedAddress.contact_phone}</p>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Payment</span>
            <span className="text-white">{paymentMethod === 'wallet' ? 'Wallet' : 'Cash on Delivery'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="text-white">₱{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Delivery Fee</span>
            {deliveryFee === 0 ? (
              <span className="text-green-400">FREE</span>
            ) : (
              <span className="text-white">₱{deliveryFee.toLocaleString()}</span>
            )}
          </div>
          <div className="flex justify-between pt-2 border-t border-[#2A2A2A]">
            <span className="text-white font-semibold">Total</span>
            <span className="text-green-400 font-bold">₱{totalAmount.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl bg-[#2A2A2A] text-gray-400 font-semibold hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Order Success Screen
function OrderSuccessScreen({ orderSuccess, onClose }) {
  return (
    <div className="absolute inset-0 bg-[#0A0A0A] flex flex-col z-20">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Success Icon */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <PartyPopper className="w-5 h-5 text-yellow-400" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
        <p className="text-gray-400 mb-6">
          {orderSuccess.paymentMethod === 'wallet'
            ? 'Payment successful. Your order is on its way!'
            : 'Your order is being prepared. Pay when it arrives.'}
        </p>

        {/* Order Details Card */}
        <div className="w-full max-w-sm bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] mb-4">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#2A2A2A]">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-500">Order Number</p>
              <p className="text-lg font-bold text-white font-mono">{orderSuccess.receipt_number}</p>
            </div>
          </div>

          {/* Items Summary */}
          <div className="space-y-2 mb-4">
            {orderSuccess.items.slice(0, 3).map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-400 truncate flex-1 mr-2">
                  {item.quantity}x {item.product.name}
                </span>
                <span className="text-white">₱{(item.product.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            {orderSuccess.items.length > 3 && (
              <p className="text-xs text-gray-500">+{orderSuccess.items.length - 3} more items</p>
            )}
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Delivery Fee</span>
            <span className="text-white">₱{orderSuccess.deliveryFee.toLocaleString()}</span>
          </div>

          <div className="flex justify-between pt-3 border-t border-[#2A2A2A]">
            <span className="text-white font-semibold">Total</span>
            <span className="text-green-400 font-bold">₱{orderSuccess.total.toLocaleString()}</span>
          </div>
        </div>

        {/* Delivery Info */}
        {orderSuccess.deliveryAddress && (
          <div className="w-full max-w-sm bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-xs text-gray-500">Delivering to</p>
                <p className="text-sm font-semibold text-white">{orderSuccess.deliveryAddress.contact_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{orderSuccess.deliveryAddress.full_address}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
                  <Clock className="w-3 h-3" />
                  <span>Estimated: 30-45 mins</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[#1A1A1A]">
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 active:scale-[0.98] transition-transform"
        >
          Continue Shopping
        </button>
      </div>
    </div>
  )
}

export default ShoppingCartDrawer
