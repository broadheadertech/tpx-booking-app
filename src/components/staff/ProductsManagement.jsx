import React, { useState, useEffect, useRef } from 'react'
import { Package, DollarSign, TrendingUp, TrendingDown, Plus, Edit, Trash2, Search, Filter, RefreshCw, Save, X, AlertCircle, Image, ShoppingCart, BarChart3, Upload, Camera } from 'lucide-react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import Modal from '../common/Modal'
import Button from '../common/Button'

// Component to handle product image display from Convex storage or URL
const ProductImage = ({ imageUrl, imageStorageId, productName, className }) => {
  const imageUrlFromStorage = useQuery(
    imageStorageId ? api.services.products.getImageUrl : undefined,
    imageStorageId ? { storageId: imageStorageId } : undefined
  )

  const [imageError, setImageError] = useState(false)

  const imageSrc = imageUrl || imageUrlFromStorage

  if (imageError || !imageSrc) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 w-full h-full">
        <Package className="w-16 h-16 mb-2" />
        <span className="text-sm font-medium">No Image</span>
      </div>
    )
  }

  return (
    <img
      src={imageSrc}
      alt={productName}
      className={className}
      onError={() => setImageError(true)}
      onLoad={() => setImageError(false)}
    />
  )
}

const ProductsManagement = ({ onRefresh, user }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStock, setFilterStock] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    cost: '',
    category: 'hair-care',
    brand: '',
    sku: '',
    stock: '',
    minStock: '',
    imageStorageId: '',
    status: 'active'
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Convex queries and mutations
  const products = useQuery(api.services.products.getAllProducts) || []
  const createProductMutation = useMutation(api.services.products.createProduct)
  const updateProductMutation = useMutation(api.services.products.updateProduct)
  const deleteProductMutation = useMutation(api.services.products.deleteProduct)
  const generateUploadUrl = useMutation(api.services.products.generateUploadUrl)
  const deleteImage = useMutation(api.services.products.deleteImage)

  // File upload state
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef(null)

  const loading = !products

  // Image handling functions
  const handleImageSelect = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setFormErrors(prev => ({ ...prev, image: 'Image size must be less than 5MB' }))
        return
      }

      if (!file.type.startsWith('image/')) {
        setFormErrors(prev => ({ ...prev, image: 'Please select a valid image file' }))
        return
      }

      setSelectedImage(file)
      setFormErrors(prev => ({ ...prev, image: '' }))

      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target && e.target.result && typeof e.target.result === 'string') {
          console.log('Setting image preview:', e.target.result.substring(0, 50) + '...')
          setImagePreview(e.target.result)
        } else {
          console.error('Invalid FileReader result:', e.target?.result)
          setFormErrors(prev => ({ ...prev, image: 'Failed to process image file' }))
        }
      }
      reader.onerror = (error) => {
        console.error('FileReader error:', error)
        setFormErrors(prev => ({ ...prev, image: 'Failed to read image file' }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUpload = async () => {
    if (!selectedImage) return null

    try {
      setUploadingImage(true)

      // Get upload URL
      const uploadUrl = await generateUploadUrl()

      // Upload file
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': selectedImage.type },
        body: selectedImage,
      })

      if (!result.ok) {
        throw new Error('Failed to upload image')
      }

      const { storageId } = await result.json()
      return storageId
    } catch (error) {
      console.error('Error uploading image:', error)
      setFormErrors(prev => ({ ...prev, image: 'Failed to upload image' }))
      return null
    } finally {
      setUploadingImage(false)
    }
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview('')
    setFormData(prev => ({ ...prev, imageStorageId: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const validateForm = () => {
    const errors = {}

    if (!formData.name.trim()) errors.name = 'Product name is required'
    if (!formData.description.trim()) errors.description = 'Description is required'
    if (!formData.price || formData.price <= 0) errors.price = 'Valid price is required'
    if (!formData.cost || formData.cost < 0) errors.cost = 'Valid cost is required'
    if (!formData.brand.trim()) errors.brand = 'Brand is required'
    if (!formData.sku.trim()) errors.sku = 'SKU is required'
    if (!formData.stock || formData.stock < 0) errors.stock = 'Valid stock quantity is required'
    if (!formData.minStock || formData.minStock < 0) errors.minStock = 'Valid minimum stock is required'

    // Price validation
    if (formData.price && formData.cost && parseFloat(formData.price) <= parseFloat(formData.cost)) {
      errors.price = 'Price must be higher than cost'
    }

    // SKU uniqueness check (excluding current product when editing)
    const existingSku = products.find(p =>
      p.sku.toLowerCase() === formData.sku.toLowerCase() &&
      (!editingProduct || p._id !== editingProduct._id)
    )
    if (existingSku) {
      errors.sku = 'SKU already exists'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      // Upload image if selected
      let imageStorageId = formData.imageStorageId
      if (selectedImage) {
        imageStorageId = await handleImageUpload()
        if (!imageStorageId) {
          return // Upload failed, error already set
        }
      }

      const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        category: formData.category,
        brand: formData.brand,
        sku: formData.sku,
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock),
        imageStorageId: imageStorageId || undefined,
        status: formData.status
      }

      if (editingProduct) {
        // Update existing product
        await updateProductMutation({
          id: editingProduct._id,
          ...productData
        })
      } else {
        // Create new product
        await createProductMutation(productData)
      }

      handleCloseModal()
      onRefresh?.()
    } catch (error) {
      console.error('Error saving product:', error)
      setFormErrors({ submit: error.message || 'Failed to save product' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product) => {
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      cost: product.cost.toString(),
      category: product.category,
      brand: product.brand,
      sku: product.sku,
      stock: product.stock.toString(),
      minStock: product.minStock.toString(),
      imageStorageId: product.imageStorageId || '',
      status: product.status
    })

    // Set image preview if product has an image URL (for existing products)
    if (product.imageUrl) {
      setImagePreview(product.imageUrl)
    }

    setEditingProduct(product)
    setShowCreateModal(true)
  }

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      await deleteProductMutation({ id: productId })
      onRefresh?.()
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  const handleCloseModal = () => {
    setShowCreateModal(false)
    setEditingProduct(null)
    setFormData({
      name: '',
      description: '',
      price: '',
      cost: '',
      category: 'hair-care',
      brand: '',
      sku: '',
      stock: '',
      minStock: '',
      imageStorageId: '',
      status: 'active'
    })
    setFormErrors({})

    // Reset image state
    setSelectedImage(null)
    setImagePreview('')
    setUploadingImage(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return {
        label: 'Out of Stock',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200'
      }
    } else if (product.stock <= product.minStock) {
      return {
        label: 'Low Stock',
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200'
      }
    } else {
      return {
        label: 'In Stock',
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-200'
      }
    }
  }



  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || product.category === filterCategory
    const matchesStock = filterStock === 'all' ||
      (filterStock === 'in-stock' && product.stock > product.minStock) ||
      (filterStock === 'low-stock' && product.stock > 0 && product.stock <= product.minStock) ||
      (filterStock === 'out-of-stock' && product.stock === 0)
    return matchesSearch && matchesCategory && matchesStock
  })

  const stats = {
    total: products.length,
    inStock: products.filter(p => p.stock > p.minStock).length,
    lowStock: products.filter(p => p.stock > 0 && p.stock <= p.minStock).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (p.price * p.stock), 0),
    totalSold: products.reduce((sum, p) => sum + p.soldThisMonth, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-3xl font-black text-white">Products & Inventory</h2>
          <p className="text-gray-400 mt-1">Manage your barbershop products and track inventory</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onRefresh?.()}
            className="flex items-center space-x-2 px-4 py-2 bg-[#444444] text-gray-300 rounded-lg hover:bg-[#555555] transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white rounded-lg hover:from-[var(--color-accent)] hover:brightness-110 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Products</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">In Stock</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.inStock}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Low Stock</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.lowStock}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Out of Stock</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.outOfStock}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Inventory Value</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">₱{stats.totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>

        <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Sold This Month</p>
              <p className="text-2xl font-bold text-[var(--color-primary)]">{stats.totalSold}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-[var(--color-primary)] opacity-50" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-[#1A1A1A] p-4 rounded-lg border border-[#2A2A2A]/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-[#1A1A1A] border border-[#444444] text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="hair-care">Hair Care</option>
                <option value="beard-care">Beard Care</option>
                <option value="shaving">Shaving</option>
                <option value="tools">Tools</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <select
              value={filterStock}
              onChange={(e) => setFilterStock(e.target.value)}
              className="bg-[#1A1A1A] border border-[#444444] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            >
              <option value="all">All Stock Levels</option>
              <option value="in-stock">In Stock</option>
              <option value="low-stock">Low Stock</option>
              <option value="out-of-stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-32 bg-[#444444] rounded mb-4"></div>
                <div className="h-4 bg-[#444444] rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-[#444444] rounded w-full mb-2"></div>
                <div className="h-6 bg-[#444444] rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product)
            const profitMargin = ((product.price - product.cost) / product.price * 100).toFixed(1)

            return (
              <div key={product._id} className="bg-[#1A1A1A] rounded-lg border border-[#2A2A2A]/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Product Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                  {product.imageUrl || product.imageStorageId ? (
                    <ProductImage
                      imageUrl={product.imageUrl}
                      imageStorageId={product.imageStorageId}
                      productName={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Package className="w-16 h-16 mb-2" />
                      <span className="text-sm font-medium">No Image</span>
                    </div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.bg} ${stockStatus.text} ${stockStatus.border}`}>
                    {stockStatus.label}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-white text-sm">{product.name}</h3>
                      <p className="text-xs text-gray-400">{product.brand}</p>
                    </div>
                  </div>

                  <p className="text-gray-400 text-xs mb-3 line-clamp-2">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">SKU:</span>
                      <span className="font-mono text-gray-300">{product.sku}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-semibold ${product.stock === 0 ? 'text-red-400' :
                          product.stock <= product.minStock ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                        {product.stock} units
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sold:</span>
                      <span className="text-gray-300">{product.soldThisMonth} this month</span>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Stock Level</span>
                      <span>{Math.round((product.stock / (product.minStock * 2)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-[#444444] rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${product.stock === 0 ? 'bg-red-500' :
                            product.stock <= product.minStock ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-[var(--color-primary)]">₱{product.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Cost: ₱{product.cost.toLocaleString()}</div>
                      <div className="text-xs text-green-400">+{profitMargin}% margin</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">{product.category.replace('-', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-gray-400 hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {(user?.role === "branch_admin" ||
                        user?.role === "super_admin") && (
                          <button
                            onClick={() => handleDelete(product._id)}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/20 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || filterCategory !== 'all' || filterStock !== 'all'
              ? 'Try adjusting your search or filter criteria.'
              : 'Get started by adding your first product.'
            }
          </p>
          {!searchTerm && filterCategory === 'all' && filterStock === 'all' && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:brightness-110 transition-all"
              >
                <Plus className="-ml-1 mr-2 h-4 w-4" />
                New Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Product Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        size="xl"
        variant="dark"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Image Section */}
          <div className="bg-[#252525] rounded-2xl p-5 border border-[#333333]">
            <h3 className="text-base font-bold text-white mb-4 flex items-center">
              <Camera className="w-5 h-5 mr-2 text-[var(--color-primary)]" />
              Product Image
            </h3>

            <div className="flex flex-col lg:flex-row gap-5">
              {/* Image Preview */}
              <div className="flex-1">
                <div className="relative">
                  {imagePreview ? (
                    <div className="relative group bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#333333]">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-44 object-cover"
                        style={{ display: 'block', maxWidth: '100%', height: '176px' }}
                        onError={(e) => {
                          console.error('Image failed to load:', imagePreview)
                          console.error('Image error event:', e)
                          setImagePreview('')
                          setFormErrors(prev => ({ ...prev, image: 'Failed to load image. Please try a different image.' }))
                        }}
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', e.target.src.substring(0, 50) + '...')
                          setFormErrors(prev => ({ ...prev, image: '' }))
                        }}
                      />
                      <div className="absolute inset-0 bg-transparent group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-44 border-2 border-dashed border-[#444444] rounded-xl flex flex-col items-center justify-center bg-[#1A1A1A] hover:bg-[#222222] hover:border-[var(--color-primary)]/50 transition-all duration-200 cursor-pointer"
                    >
                      <Upload className="w-10 h-10 text-[var(--color-primary)] mb-2" />
                      <p className="text-sm text-gray-400 text-center">
                        <span className="font-semibold text-[var(--color-primary)]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 5MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Controls */}
              <div className="lg:w-48 space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] hover:brightness-110 text-white font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {uploadingImage ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Choose Image</span>
                    </>
                  )}
                </button>

                {formErrors.image && (
                  <p className="text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                    <span>{formErrors.image}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Product Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.name ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                    }`}
                  placeholder="Enter product name"
                />
                {formErrors.name && (
                  <p className="mt-1.5 text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 resize-none ${formErrors.description ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                    }`}
                  placeholder="Describe the product features and benefits"
                />
                {formErrors.description && (
                  <p className="mt-1.5 text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    {formErrors.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#1A1A1A] border border-[#333333] rounded-xl text-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 hover:border-[#444444]"
                  >
                    <option value="hair-care">Hair Care</option>
                    <option value="beard-care">Beard Care</option>
                    <option value="shaving">Shaving</option>
                    <option value="tools">Tools</option>
                    <option value="accessories">Accessories</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Brand <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.brand ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                      }`}
                    placeholder="Brand name"
                  />
                  {formErrors.brand && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {formErrors.brand}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Selling Price (₱) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.price ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                      }`}
                    placeholder="0.00"
                  />
                  {formErrors.price && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {formErrors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Cost Price (₱) <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                    min="0"
                    step="0.01"
                    className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.cost ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                      }`}
                    placeholder="0.00"
                  />
                  {formErrors.cost && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {formErrors.cost}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  SKU <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                  className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent font-mono transition-all duration-200 ${formErrors.sku ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                    }`}
                  placeholder="PROD-001"
                />
                {formErrors.sku && (
                  <p className="mt-1.5 text-sm text-red-400 flex items-center">
                    <AlertCircle className="h-3.5 w-3.5 mr-1" />
                    {formErrors.sku}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Current Stock <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    min="0"
                    className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.stock ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                      }`}
                    placeholder="0"
                  />
                  {formErrors.stock && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {formErrors.stock}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Min. Stock <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                    min="0"
                    className={`w-full px-4 py-2.5 bg-[#1A1A1A] border rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all duration-200 ${formErrors.minStock ? 'border-red-500/50 bg-red-500/10' : 'border-[#333333] hover:border-[#444444]'
                      }`}
                    placeholder="0"
                  />
                  {formErrors.minStock && (
                    <p className="mt-1.5 text-sm text-red-400 flex items-center">
                      <AlertCircle className="h-3.5 w-3.5 mr-1" />
                      {formErrors.minStock}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profit Margin Preview */}
          {formData.price && formData.cost && parseFloat(formData.price) > parseFloat(formData.cost) && (
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-green-400">
                      Profit Margin: {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%
                    </h4>
                    <p className="text-sm text-green-400/70">
                      Profit per unit: ₱{(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">
                    ₱{(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
                  </div>
                  <div className="text-xs text-green-400/70">per unit</div>
                </div>
              </div>
            </div>
          )}

          {/* Form Errors */}
          {formErrors.submit && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-sm text-red-400 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                {formErrors.submit}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-[#333333]">
            <button
              type="button"
              onClick={handleCloseModal}
              disabled={isSubmitting || uploadingImage}
              className="px-5 py-2.5 bg-[#333333] text-gray-300 font-semibold rounded-xl hover:bg-[#444444] transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || uploadingImage}
              className="px-6 py-2.5 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white font-bold rounded-xl hover:brightness-110 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 shadow-lg shadow-[var(--color-primary)]/20"
            >
              {isSubmitting || uploadingImage ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{uploadingImage ? 'Uploading...' : (editingProduct ? 'Updating...' : 'Adding...')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{editingProduct ? 'Update Product' : 'Add Product'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ProductsManagement