import React, { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ShoppingBag, Plus, Minus, X, Check, Loader2, ExternalLink } from 'lucide-react'

/**
 * ShoppableProducts - Display tagged products in a post
 * BT3: In-feed product commerce
 */

// Product Card in feed
const ProductCard = ({ product, onQuickAdd, isAdding }) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] hover:border-[var(--color-primary)]/30 transition-colors">
      {/* Product Image */}
      <div className="w-14 h-14 rounded-lg bg-[#2A2A2A] overflow-hidden flex-shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-gray-600" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-white truncate">{product.name}</h4>
        <p className="text-xs text-gray-500">{product.brand || product.category}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-[var(--color-primary)]">
            ₱{product.price?.toLocaleString()}
          </span>
          {!product.inStock && (
            <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
              Out of stock
            </span>
          )}
        </div>
      </div>

      {/* Quick Add Button */}
      <button
        onClick={() => onQuickAdd(product)}
        disabled={!product.inStock || isAdding}
        className={`p-2.5 rounded-xl transition-all ${
          product.inStock
            ? 'bg-[var(--color-primary)] text-white hover:opacity-90 active:scale-95'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isAdding ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Plus className="w-5 h-5" />
        )}
      </button>
    </div>
  )
}

// Products Section in Post
const ShoppableProducts = ({ postId, userId, onAddToCart }) => {
  const [addingProductId, setAddingProductId] = useState(null)
  const [showSuccess, setShowSuccess] = useState(null)

  const products = useQuery(
    api.services.shoppablePosts.getTaggedProductDetails,
    { postId }
  )

  const trackClick = useMutation(api.services.shoppablePosts.trackProductClick)
  const addToCart = useMutation(api.services.shoppablePosts.addToCartFromPost)

  const handleQuickAdd = async (product) => {
    setAddingProductId(product._id)

    try {
      // Track the click
      await trackClick({
        postId,
        productId: product._id,
        userId: userId || undefined,
      })

      if (userId) {
        // Logged in - add to cart via backend
        const result = await addToCart({
          postId,
          productId: product._id,
          quantity: 1,
        })

        if (result.success) {
          // Show success feedback
          setShowSuccess(product._id)
          setTimeout(() => setShowSuccess(null), 2000)

          // Notify parent to update cart
          onAddToCart?.(result.cartItem)
        }
      } else {
        // Not logged in - just open product modal or prompt login
        onAddToCart?.({
          productId: product._id,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
          sourcePostId: postId,
          requiresLogin: true,
        })
      }
    } catch (error) {
      console.error('Failed to add to cart:', error)
    } finally {
      setAddingProductId(null)
    }
  }

  if (!products || products.length === 0) {
    return null
  }

  return (
    <div className="px-4 pb-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-2">
        <ShoppingBag className="w-4 h-4 text-[var(--color-primary)]" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
          Shop the Look
        </span>
        <span className="text-[10px] text-gray-600">
          {products.length} product{products.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Product List */}
      <div className="space-y-2">
        {products.map((product) => (
          <div key={product._id} className="relative">
            <ProductCard
              product={product}
              onQuickAdd={handleQuickAdd}
              isAdding={addingProductId === product._id}
            />

            {/* Success overlay */}
            {showSuccess === product._id && (
              <div className="absolute inset-0 bg-green-500/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <div className="flex items-center gap-2 text-green-400 font-bold">
                  <Check className="w-5 h-5" />
                  Added to cart
                </div>
              </div>
            )}

            {/* Product note if available */}
            {product.note && (
              <p className="text-[10px] text-gray-500 mt-1 pl-3 italic">
                "{product.note}"
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Quick Purchase Modal
export const QuickPurchaseModal = ({ isOpen, onClose, product, postId, userId, onPurchaseComplete }) => {
  const [quantity, setQuantity] = useState(1)
  const [isPurchasing, setIsPurchasing] = useState(false)

  const recordPurchase = useMutation(api.services.shoppablePosts.recordPostPurchase)

  if (!isOpen || !product) return null

  const totalPrice = product.price * quantity
  const maxQuantity = Math.min(product.stock || 10, 10)

  const handlePurchase = async () => {
    setIsPurchasing(true)

    try {
      await recordPurchase({
        postId,
        productId: product._id,
        userId: userId || undefined,
        quantity,
        unitPrice: product.price,
        source: 'product_modal',
      })

      onPurchaseComplete?.({
        product,
        quantity,
        totalPrice,
      })
      onClose()
    } catch (error) {
      console.error('Purchase failed:', error)
    } finally {
      setIsPurchasing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#1A1A1A] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2A] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
          <h3 className="text-lg font-bold text-white">Quick Purchase</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Product Info */}
        <div className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="w-24 h-24 rounded-xl bg-[#2A2A2A] overflow-hidden flex-shrink-0">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-600" />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1">
              <h4 className="text-white font-bold">{product.name}</h4>
              <p className="text-sm text-gray-500 mt-1">{product.brand}</p>
              <p className="text-lg font-bold text-[var(--color-primary)] mt-2">
                ₱{product.price?.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <p className="text-sm text-gray-400 mt-4 line-clamp-2">
              {product.description}
            </p>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-between mt-6 p-4 bg-[#0A0A0A] rounded-xl">
            <span className="text-sm text-gray-400">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white disabled:opacity-50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-white font-bold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                disabled={quantity >= maxQuantity}
                className="w-8 h-8 rounded-full bg-[#2A2A2A] flex items-center justify-center text-white disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#2A2A2A]">
            <span className="text-gray-400">Total</span>
            <span className="text-xl font-bold text-white">
              ₱{totalPrice.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 pb-safe">
          <button
            onClick={handlePurchase}
            disabled={isPurchasing || !product.inStock}
            className="w-full py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingBag className="w-5 h-5" />
                Add to Cart - ₱{totalPrice.toLocaleString()}
              </>
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-3">
            Complete purchase at checkout or in-store
          </p>
        </div>
      </div>
    </div>
  )
}

// Shoppable indicator badge for post header
export const ShoppableBadge = ({ productCount }) => {
  if (!productCount || productCount === 0) return null

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
      <ShoppingBag className="w-3 h-3 text-green-400" />
      <span className="text-[10px] font-bold text-green-400">
        {productCount} product{productCount > 1 ? 's' : ''}
      </span>
    </div>
  )
}

export default ShoppableProducts
