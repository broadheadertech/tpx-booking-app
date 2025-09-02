import React, { useState } from 'react'
import { ArrowLeft, ShoppingCart, Plus, Minus, Package, Star, Heart } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

const ProductDetails = ({ product, onBack, onAddToCart, cartQuantity = 0 }) => {
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)

  // Product Image Component
  const ProductImage = ({ imageUrl, imageStorageId, productName, className }) => {
    const imageUrlFromStorage = useQuery(
      imageStorageId ? api.services.products.getImageUrl : undefined,
      imageStorageId ? { storageId: imageStorageId } : undefined
    )
    
    const [imageError, setImageError] = useState(false)
    
    const imageSrc = imageUrl || imageUrlFromStorage
    
    if (imageError || !imageSrc) {
      return (
        <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
          <Package className="w-16 h-16 text-gray-400" />
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

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      onAddToCart(product)
    }
    setQuantity(1)
  }

  const formatCategoryName = (category) => {
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const getStockStatus = () => {
    if (product.stock === 0) {
      return { label: 'Out of Stock', color: 'text-red-600', bg: 'bg-red-50' }
    } else if (product.stock <= product.minStock) {
      return { label: 'Low Stock', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    }
    return { label: 'In Stock', color: 'text-green-600', bg: 'bg-green-50' }
  }

  const stockStatus = getStockStatus()

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4F0E6' }}>
      {/* Header */}
      <div className="sticky top-0 z-40" style={{ backgroundColor: '#36454F' }}>
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-lg transition-all duration-200"
              style={{ '&:hover': { color: '#F68B24' } }}
              onMouseEnter={(e) => (e.target.style.color = '#F68B24')}
              onMouseLeave={(e) => (e.target.style.color = 'white')}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Shop</span>
            </button>
            <div className="text-center">
              <p className="text-sm font-bold text-white">Product Details</p>
            </div>
            <div className="w-20"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Product Image */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <ProductImage 
              imageUrl={product.imageUrl}
              imageStorageId={product.imageStorageId}
              productName={product.name}
              className="w-full h-64 object-cover rounded-xl"
            />
          </div>
        </div>

        {/* Product Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          {/* Category Badge */}
          <div className="mb-3">
            <span 
              className="inline-block px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: '#F68B24' }}
            >
              {formatCategoryName(product.category)}
            </span>
          </div>

          {/* Product Name & Brand */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-lg text-gray-600 mb-4">{product.brand}</p>

          {/* Price */}
          <div className="mb-4">
            <p className="text-3xl font-bold" style={{ color: '#F68B24' }}>
              ₱{product.price.toLocaleString()}
            </p>
            {product.cost && (
              <p className="text-sm text-gray-500">
                Cost: ₱{product.cost.toLocaleString()}
              </p>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-4">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stockStatus.bg} ${stockStatus.color}`}>
              {stockStatus.label}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {product.stock} units available
            </p>
          </div>

          {/* SKU */}
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              SKU: <span className="font-mono font-medium text-gray-700">{product.sku}</span>
            </p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>

          {/* Product Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Sold This Month</p>
              <p className="text-lg font-bold text-gray-900">{product.soldThisMonth}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500">Min Stock Level</p>
              <p className="text-lg font-bold text-gray-900">{product.minStock}</p>
            </div>
          </div>
        </div>

        {/* Add to Cart Section */}
        {product.stock > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-20">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add to Cart</h3>
            
            {/* Quantity Selector */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 font-medium">Quantity:</span>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: '#F68B24' }}
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="text-xl font-bold text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                  disabled={quantity >= product.stock}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50"
                  style={{ backgroundColor: '#F68B24' }}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Total Price */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700 font-medium">Total:</span>
              <span className="text-2xl font-bold" style={{ color: '#F68B24' }}>
                ₱{(product.price * quantity).toLocaleString()}
              </span>
            </div>

            {/* Current Cart Info */}
            {cartQuantity > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-700">
                  <ShoppingCart className="w-4 h-4 inline mr-1" />
                  {cartQuantity} already in cart
                </p>
              </div>
            )}

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={quantity + cartQuantity > product.stock}
              className="w-full py-4 rounded-xl text-white font-bold text-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              style={{ backgroundColor: '#F68B24' }}
            >
              <ShoppingCart className="w-5 h-5" />
              <span>
                {quantity + cartQuantity > product.stock 
                  ? 'Not enough stock' 
                  : `Add ${quantity} to Cart`
                }
              </span>
            </button>

            {/* Stock Warning */}
            {quantity + cartQuantity > product.stock && (
              <p className="text-sm text-red-600 text-center mt-2">
                Only {product.stock - cartQuantity} more available
              </p>
            )}
          </div>
        )}

        {/* Out of Stock Message */}
        {product.stock === 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm mb-20">
            <div className="text-center">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-600 mb-2">Out of Stock</h3>
              <p className="text-gray-500">
                This product is currently unavailable. Check back later!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProductDetails