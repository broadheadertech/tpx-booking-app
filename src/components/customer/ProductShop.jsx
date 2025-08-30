import React, { useState, useEffect } from 'react'
import { ArrowLeft, Search, Filter, ShoppingCart, Package, Star, Plus, Minus } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import ProductDetails from './ProductDetails'

const ProductShop = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useState([])
  const [showCart, setShowCart] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [currentView, setCurrentView] = useState('shop') // 'shop' or 'details'

  // Fetch products from Convex
  const products = useQuery(api.services.products.getAllProducts) || []

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    const isActive = product.status === 'active' && product.stock > 0
    return matchesSearch && matchesCategory && isActive
  })

  // Get unique categories
  const categories = ['all', ...new Set(products.map(p => p.category))]

  // Cart functions
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === product._id)
      if (existing) {
        return prev.map(item => 
          item._id === product._id 
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock) }
            : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const removeFromCart = (productId) => {
    setCart(prev => {
      const existing = prev.find(item => item._id === productId)
      if (existing && existing.quantity > 1) {
        return prev.map(item => 
          item._id === productId 
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      }
      return prev.filter(item => item._id !== productId)
    })
  }

  const getCartItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0)
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getItemQuantityInCart = (productId) => {
    const item = cart.find(item => item._id === productId)
    return item ? item.quantity : 0
  }

  // Navigation functions
  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setCurrentView('details')
  }

  const handleBackToShop = () => {
    setSelectedProduct(null)
    setCurrentView('shop')
  }

  // Product Image Component
  const ProductImage = ({ imageUrl, imageStorageId, productName }) => {
    const imageUrlFromStorage = useQuery(
      imageStorageId ? api.services.products.getImageUrl : undefined,
      imageStorageId ? { storageId: imageStorageId } : undefined
    )
    
    const [imageError, setImageError] = useState(false)
    
    const imageSrc = imageUrl || imageUrlFromStorage
    
    if (imageError || !imageSrc) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
      )
    }
    
    return (
      <img 
        src={imageSrc}
        alt={productName}
        className="w-full h-32 object-cover rounded-lg"
        onError={() => setImageError(true)}
      />
    )
  }

  const formatCategoryName = (category) => {
    if (category === 'all') return 'All Products'
    return category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  // Render product details if a product is selected
  if (currentView === 'details' && selectedProduct) {
    return (
      <ProductDetails 
        product={selectedProduct}
        onBack={handleBackToShop}
        onAddToCart={addToCart}
        cartQuantity={getItemQuantityInCart(selectedProduct._id)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A]">
      {/* Subtle background pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,140,66,0.03),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(255,140,66,0.02),transparent_50%)]"></div>
      </div>
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-[#2A2A2A]/95 to-[#333333]/95 backdrop-blur-xl border-b border-[#444444]/30">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3 py-2 text-white font-semibold rounded-xl hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            <div className="text-center">
              <p className="text-lg font-bold text-white">Product Shop</p>
              <p className="text-xs text-[#FF8C42]">
                {filteredProducts.length} products
              </p>
            </div>
            <button
              onClick={() => setShowCart(!showCart)}
              className="relative p-2 text-white rounded-xl bg-gradient-to-br from-[#FF8C42] to-[#FF7A2B] transition-colors duration-200 shadow-lg"
            >
              <ShoppingCart className="w-5 h-5" />
              {getCartItemCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {getCartItemCount()}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-6">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-[#2A2A2A] border border-[#555555] text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42] focus:border-[#FF8C42] transition-colors"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <div className="flex space-x-3 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-[#FF8C42] to-[#FF7A2B] text-white shadow-lg'
                    : 'text-gray-400 bg-[#333333] border border-[#555555] hover:text-gray-300 hover:bg-[#444444]'
                }`}
              >
                {formatCategoryName(category)}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-3">No Products Found</h3>
            <p className="text-gray-400">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your search or filter.'
                : 'Products will appear here when available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 mb-20">
            {filteredProducts.map((product) => {
              const quantityInCart = getItemQuantityInCart(product._id)
              
              return (
                <div
                  key={product._id}
                  className="bg-gradient-to-br from-[#333333]/90 to-[#444444]/90 backdrop-blur-xl rounded-2xl p-4 shadow-lg border border-[#555555]/30 cursor-pointer transition-all duration-200 hover:scale-105 hover:border-[#FF8C42]/50"
                  onClick={() => handleProductClick(product)}
                >
                  <ProductImage 
                    imageUrl={product.imageUrl}
                    imageStorageId={product.imageStorageId}
                    productName={product.name}
                  />
                  
                  <div className="mt-3">
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-2">
                      {product.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">{product.brand}</p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <p className="text-lg font-bold" style={{ color: '#F68B24' }}>
                          ₱{product.price.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {product.stock} in stock
                        </p>
                      </div>
                    </div>
                    
                    {/* Add to Cart Controls */}
                    <div className="mt-3">
                      {quantityInCart === 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            addToCart(product)
                          }}
                          className="w-full py-2 px-3 rounded-lg text-white font-medium text-sm transition-colors duration-200"
                          style={{ backgroundColor: '#F68B24' }}
                        >
                          Add to Cart
                        </button>
                      ) : (
                        <div className="flex items-center justify-between">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFromCart(product._id)
                            }}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: '#F68B24' }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-bold text-gray-900">{quantityInCart}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              addToCart(product)
                            }}
                            disabled={quantityInCart >= product.stock}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white disabled:opacity-50"
                            style={{ backgroundColor: '#F68B24' }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex">
          <div 
            className="flex-1 bg-black bg-opacity-50"
            onClick={() => setShowCart(false)}
          />
          <div className="w-80 bg-white h-full overflow-y-auto">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Shopping Cart</h2>
                <button
                  onClick={() => setShowCart(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    {cart.map((item) => (
                      <div key={item._id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                          <p className="text-xs text-gray-500">{item.brand}</p>
                          <p className="text-sm font-bold" style={{ color: '#F68B24' }}>
                            ₱{item.price.toLocaleString()} × {item.quantity}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => removeFromCart(item._id)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: '#F68B24' }}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => addToCart(item)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                            style={{ backgroundColor: '#F68B24' }}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-gray-900">Total:</span>
                      <span className="text-xl font-bold" style={{ color: '#F68B24' }}>
                        ₱{getCartTotal().toLocaleString()}
                      </span>
                    </div>
                    <button
                      className="w-full py-3 rounded-lg text-white font-bold transition-colors duration-200"
                      style={{ backgroundColor: '#F68B24' }}
                      onClick={() => {
                        // TODO: Implement checkout functionality
                        alert('Checkout functionality coming soon!')
                      }}
                    >
                      Checkout ({getCartItemCount()} items)
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductShop