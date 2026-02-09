import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useCurrentUser } from '../../../hooks/useCurrentUser'
import { useCart } from '../../../context/CartContext'
import {
  Heart,
  HeartOff,
  ShoppingCart,
  Package,
  Trash2,
  Plus,
  Star,
  CheckCircle,
} from 'lucide-react'

/**
 * WishlistPage - Customer's saved products
 */
function WishlistPage() {
  const { user } = useCurrentUser()
  const { addItem, items: cartItems } = useCart()
  const [removingId, setRemovingId] = useState(null)
  const [addedToCartId, setAddedToCartId] = useState(null)

  // Fetch user's wishlist
  const wishlist = useQuery(
    api.services.wishlist.getUserWishlist,
    user?._id ? { user_id: user._id } : 'skip'
  )

  // Remove from wishlist mutation
  const removeFromWishlist = useMutation(api.services.wishlist.removeFromWishlist)

  const handleRemove = async (productId) => {
    if (!user) return
    setRemovingId(productId)
    try {
      await removeFromWishlist({
        user_id: user._id,
        product_id: productId,
      })
    } finally {
      setRemovingId(null)
    }
  }

  const handleAddToCart = (product) => {
    addItem(product, 1)
    setAddedToCartId(product._id)
    setTimeout(() => setAddedToCartId(null), 1500)
  }

  const isInCart = (productId) => cartItems.some(i => i.product._id === productId)

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium mb-1">Login to view wishlist</p>
        <p className="text-sm text-gray-600 text-center">Sign in to save your favorite products</p>
      </div>
    )
  }

  if (wishlist === undefined) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#2A2A2A] animate-pulse">
            <div className="flex gap-4">
              <div className="w-24 h-24 bg-[#2A2A2A] rounded-xl" />
              <div className="flex-1">
                <div className="h-4 bg-[#2A2A2A] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[#2A2A2A] rounded w-1/2 mb-3" />
                <div className="h-5 bg-[#2A2A2A] rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (wishlist.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
          <HeartOff className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium mb-1">Your wishlist is empty</p>
        <p className="text-sm text-gray-600 text-center">Tap the heart icon on products to save them here</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      {/* Header Stats */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">
          {wishlist.length} {wishlist.length === 1 ? 'item' : 'items'} saved
        </p>
      </div>

      {/* Wishlist Items */}
      {wishlist.map((item) => {
        const product = item.product
        if (!product) return null

        const isRemoving = removingId === product._id
        const inCart = isInCart(product._id)
        const justAddedToCart = addedToCartId === product._id

        return (
          <div
            key={item._id}
            className={`bg-[#1A1A1A] rounded-2xl border border-[#2A2A2A] overflow-hidden transition-all ${
              isRemoving ? 'opacity-50 scale-95' : ''
            }`}
          >
            <div className="flex gap-4 p-4">
              {/* Product Image */}
              <div className="w-24 h-24 flex-shrink-0 rounded-xl bg-[#2A2A2A] overflow-hidden">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-600" />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white line-clamp-2 leading-tight">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-[10px] text-gray-400">4.8</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-[10px] text-gray-500">{product.stock} in stock</span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(product._id)}
                    disabled={isRemoving}
                    className="p-2 rounded-lg hover:bg-[#2A2A2A] transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-400" />
                  </button>
                </div>

                {/* Price */}
                <div className="mt-2">
                  <span className="text-lg font-bold text-[var(--color-primary)]">
                    ₱{product.price.toLocaleString()}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock === 0}
                  className={`mt-3 w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                    product.stock === 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : justAddedToCart || inCart
                      ? 'bg-green-500 text-white'
                      : 'bg-[var(--color-primary)] text-white active:scale-[0.98]'
                  }`}
                >
                  {justAddedToCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Added!
                    </>
                  ) : inCart ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      In Cart
                    </>
                  ) : product.stock === 0 ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default WishlistPage
