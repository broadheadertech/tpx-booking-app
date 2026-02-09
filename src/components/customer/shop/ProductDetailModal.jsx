import { useState, useEffect } from 'react'
import {
  X,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Star,
  Truck,
  Shield,
  AlertTriangle,
  CheckCircle,
  BadgeCheck,
  Heart,
} from 'lucide-react'

/**
 * ProductDetailModal - Full product detail view
 *
 * Bottom sheet on mobile, centered modal on larger screens
 * Following BookingDetailModal pattern
 */
function ProductDetailModal({ product, isOpen, onClose, onAddToCart, isInCart, isWishlisted, onToggleWishlist, isTogglingWishlist }) {
  const [quantity, setQuantity] = useState(1)
  const [imageError, setImageError] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  // Reset state when product changes
  useEffect(() => {
    if (product) {
      setImageError(false)
      setQuantity(1)
    }
  }, [product?._id])

  if (!isOpen || !product) return null

  // Get image URL (check multiple possible fields)
  const productImage = product.imageUrl || product.resolvedImageUrl || product.image_url

  // Calculate display values - use real discount if available
  const now = Date.now()
  const isPromoActive = product.discount_percent &&
    (!product.promo_start || now >= product.promo_start) &&
    (!product.promo_end || now <= product.promo_end)
  const discount = isPromoActive ? product.discount_percent : null
  const originalPrice = discount
    ? (product.original_price || Math.round(product.price / (1 - discount / 100)))
    : null
  const isLowStock = product.stock <= 5 && product.stock > 0
  const isOutOfStock = product.stock === 0

  const handleQuantityChange = (delta) => {
    const newQty = quantity + delta
    if (newQty >= 1 && newQty <= product.stock) {
      setQuantity(newQty)
    }
  }

  const handleAddToCart = () => {
    setIsAdding(true)
    onAddToCart(product, quantity)
    setTimeout(() => {
      setIsAdding(false)
      setQuantity(1)
      onClose()
    }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#0A0A0A] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2A] animate-slide-up">
        {/* Close Button - Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Product Image - Full aspect square */}
          <div className="relative aspect-square bg-[#1A1A1A]">
          {productImage && !imageError ? (
            <img
              src={productImage}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-24 h-24 text-gray-600" />
            </div>
          )}

          {/* Discount Badge - only show if product has active promo */}
          {discount && (
            <div className="absolute top-4 left-4 bg-[var(--color-primary)] px-3 py-1.5 rounded-xl">
              <span className="text-sm font-bold text-white">-{discount}%</span>
            </div>
          )}

          {/* Low Stock Warning */}
          {isLowStock && (
            <div className="absolute bottom-4 left-4 bg-amber-500/90 backdrop-blur-sm px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span className="text-sm font-bold text-white">Only {product.stock} left!</span>
            </div>
          )}

          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <span className="text-xl font-bold text-white">Out of Stock</span>
            </div>
          )}

          {/* Wishlist Button - Bottom Right */}
          <button
            onClick={onToggleWishlist}
            disabled={isTogglingWishlist}
            className={`absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg ${
              isWishlisted
                ? 'bg-red-500'
                : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'
            } ${isTogglingWishlist ? 'scale-90' : ''}`}
          >
            <Heart
              className={`w-6 h-6 transition-all ${
                isWishlisted ? 'text-white fill-white' : 'text-white'
              }`}
            />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Brand & Mall Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-[var(--color-primary)] rounded text-[10px] font-bold text-white">Mall</span>
            <span className="text-sm text-gray-400">{product.brand || 'TipunoX'}</span>
          </div>

          {/* Product Name */}
          <h2 className="text-xl font-bold text-white mb-2">{product.name}</h2>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-semibold text-white">4.8</span>
            </div>
            <span className="text-gray-600">•</span>
            <span className="text-sm text-gray-400">{Math.floor(Math.random() * 500) + 100} sold</span>
            <span className="text-gray-600">•</span>
            <span className="text-sm text-gray-400">{product.stock} in stock</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-2 mb-4">
            <span className="text-2xl font-bold text-[var(--color-primary)]">
              ₱{product.price.toLocaleString()}
            </span>
            {originalPrice && (
              <span className="text-sm text-gray-500 line-through">
                ₱{originalPrice.toLocaleString()}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-2">Description</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              {product.description || 'Premium quality product from our exclusive collection. Perfect for your grooming needs.'}
            </p>
          </div>

          {/* Features */}
          <div className="flex gap-4 mb-6">
            <div className="flex items-center gap-2 text-gray-400">
              <Truck className="w-4 h-4 text-green-400" />
              <span className="text-xs">Free Pickup</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs">Authentic</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <BadgeCheck className="w-4 h-4 text-purple-400" />
              <span className="text-xs">Quality Assured</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Quantity</span>
            <div className="flex items-center gap-3 bg-[#1A1A1A] rounded-xl p-1">
              <button
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= 1}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[#2A2A2A] transition-colors disabled:opacity-30"
              >
                <Minus className="w-5 h-5 text-white" />
              </button>
              <span className="w-10 text-center text-lg font-bold text-white">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(1)}
                disabled={quantity >= product.stock}
                className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-[#2A2A2A] transition-colors disabled:opacity-30"
              >
                <Plus className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between py-3 border-t border-[#2A2A2A]">
            <span className="text-gray-400">Total</span>
            <span className="text-xl font-bold text-green-400">
              ₱{(product.price * quantity).toLocaleString()}
            </span>
          </div>
        </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1A1A1A] bg-[#0A0A0A]">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || isAdding}
            className={`w-full py-4 rounded-2xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
              isOutOfStock
                ? 'bg-gray-600 cursor-not-allowed'
                : isAdding || isInCart
                ? 'bg-green-600'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
            }`}
          >
            {isAdding ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Added to Cart!
              </>
            ) : isInCart ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Already in Cart
              </>
            ) : isOutOfStock ? (
              'Out of Stock'
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default ProductDetailModal
