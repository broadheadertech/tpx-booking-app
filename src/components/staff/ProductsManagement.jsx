import React, { useState, useEffect } from 'react'
import { Package, DollarSign, TrendingUp, TrendingDown, Plus, Edit, Trash2, Search, Filter, RefreshCw, Save, X, AlertCircle, Image, ShoppingCart, BarChart3 } from 'lucide-react'
import Modal from '../common/Modal'
import Button from '../common/Button'

const ProductsManagement = ({ onRefresh }) => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
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
    imageUrl: '',
    status: 'active'
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mock products data
  const mockProducts = [
    {
      id: 1,
      name: 'Premium Hair Pomade',
      description: 'High-hold, medium-shine pomade for classic styling',
      price: 450,
      cost: 200,
      category: 'hair-care',
      brand: 'TPX Professional',
      sku: 'TPX-POM-001',
      stock: 25,
      minStock: 10,
      imageUrl: '/api/placeholder/300/300',
      status: 'active',
      soldThisMonth: 15,
      createdAt: '2024-01-15'
    },
    {
      id: 2,
      name: 'Beard Oil - Sandalwood',
      description: 'Nourishing beard oil with sandalwood scent',
      price: 350,
      cost: 150,
      category: 'beard-care',
      brand: 'TPX Professional',
      sku: 'TPX-BO-002',
      stock: 8,
      minStock: 15,
      imageUrl: '/api/placeholder/300/300',
      status: 'active',
      soldThisMonth: 22,
      createdAt: '2024-01-10'
    },
    {
      id: 3,
      name: 'Professional Scissors',
      description: 'High-quality stainless steel cutting scissors',
      price: 2500,
      cost: 1200,
      category: 'tools',
      brand: 'Jaguar',
      sku: 'JAG-SC-003',
      stock: 5,
      minStock: 3,
      imageUrl: '/api/placeholder/300/300',
      status: 'active',
      soldThisMonth: 2,
      createdAt: '2024-01-05'
    },
    {
      id: 4,
      name: 'Aftershave Balm',
      description: 'Soothing aftershave balm with aloe vera',
      price: 280,
      cost: 120,
      category: 'shaving',
      brand: 'TPX Professional',
      sku: 'TPX-AB-004',
      stock: 0,
      minStock: 12,
      imageUrl: '/api/placeholder/300/300',
      status: 'out-of-stock',
      soldThisMonth: 18,
      createdAt: '2024-01-01'
    },
    {
      id: 5,
      name: 'Hair Wax - Strong Hold',
      description: 'Matte finish hair wax for textured styles',
      price: 380,
      cost: 180,
      category: 'hair-care',
      brand: 'TPX Professional',
      sku: 'TPX-WAX-005',
      stock: 32,
      minStock: 8,
      imageUrl: '/api/placeholder/300/300',
      status: 'active',
      soldThisMonth: 28,
      createdAt: '2023-12-20'
    }
  ]

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProducts(mockProducts)
    } catch (error) {
      console.error('Error loading products:', error)
    } finally {
      setLoading(false)
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
      (!editingProduct || p.id !== editingProduct.id)
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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        stock: parseInt(formData.stock),
        minStock: parseInt(formData.minStock)
      }
      
      if (editingProduct) {
        // Update existing product
        setProducts(prev => prev.map(product => 
          product.id === editingProduct.id 
            ? { ...product, ...productData, id: editingProduct.id }
            : product
        ))
      } else {
        // Create new product
        const newProduct = {
          ...productData,
          id: Date.now(),
          soldThisMonth: 0,
          createdAt: new Date().toISOString().split('T')[0]
        }
        setProducts(prev => [newProduct, ...prev])
      }
      
      handleCloseModal()
    } catch (error) {
      console.error('Error saving product:', error)
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
      imageUrl: product.imageUrl || '',
      status: product.status
    })
    setEditingProduct(product)
    setShowCreateModal(true)
  }

  const handleDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return
    
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setProducts(prev => prev.filter(product => product.id !== productId))
    } catch (error) {
      console.error('Error deleting product:', error)
    } finally {
      setLoading(false)
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
      imageUrl: '',
      status: 'active'
    })
    setFormErrors({})
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

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hair-care': return '💇'
      case 'beard-care': return '🧔'
      case 'shaving': return '🪒'
      case 'tools': return '✂️'
      case 'accessories': return '🎒'
      default: return '📦'
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
          <h2 className="text-3xl font-black text-gray-900">Products & Inventory</h2>
          <p className="text-gray-600 mt-1">Manage your barbershop products and track inventory</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => { loadProducts(); onRefresh?.() }}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New Product</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Package className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">In Stock</p>
              <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lowStock}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Inventory Value</p>
              <p className="text-2xl font-bold text-purple-600">₱{stats.totalValue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Sold This Month</p>
              <p className="text-2xl font-bold text-orange-600">{stats.totalSold}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
            <div key={i} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="animate-pulse">
                <div className="h-32 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
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
              <div key={product.id} className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                {/* Product Image */}
                <div className="h-48 bg-gray-100 flex items-center justify-center relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-6xl">{getCategoryIcon(product.category)}</div>
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium border ${stockStatus.bg} ${stockStatus.text} ${stockStatus.border}`}>
                    {stockStatus.label}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                      <p className="text-xs text-gray-500">{product.brand}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 text-xs mb-3 line-clamp-2">{product.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">SKU:</span>
                      <span className="font-mono text-gray-700">{product.sku}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Stock:</span>
                      <span className={`font-semibold ${
                        product.stock === 0 ? 'text-red-600' : 
                        product.stock <= product.minStock ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {product.stock} units
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Sold:</span>
                      <span className="text-gray-700">{product.soldThisMonth} this month</span>
                    </div>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Stock Level</span>
                      <span>{Math.round((product.stock / (product.minStock * 2)) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          product.stock === 0 ? 'bg-red-500' :
                          product.stock <= product.minStock ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((product.stock / (product.minStock * 2)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-orange-600">₱{product.price.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Cost: ₱{product.cost.toLocaleString()}</div>
                      <div className="text-xs text-green-600">+{profitMargin}% margin</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 capitalize">{product.category.replace('-', ' ')}</span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
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
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter product name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.name}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Describe the product"
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (₱) *
              </label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.price ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.price && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.price}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cost Price (₱) *
              </label>
              <input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                min="0"
                step="0.01"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.cost ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {formErrors.cost && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.cost}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="hair-care">Hair Care</option>
                <option value="beard-care">Beard Care</option>
                <option value="shaving">Shaving</option>
                <option value="tools">Tools</option>
                <option value="accessories">Accessories</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brand *
              </label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.brand ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Product brand"
              />
              {formErrors.brand && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.brand}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono ${
                  formErrors.sku ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="PROD-001"
              />
              {formErrors.sku && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.sku}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stock *
              </label>
              <input
                type="number"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.stock ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {formErrors.stock && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.stock}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Stock *
              </label>
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData(prev => ({ ...prev, minStock: e.target.value }))}
                min="0"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                  formErrors.minStock ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {formErrors.minStock && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {formErrors.minStock}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Image URL
              </label>
              <input
                type="url"
                value={formData.imageUrl}
                onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="https://example.com/image.jpg"
              />
            </div>
          </div>

          {/* Profit Margin Preview */}
          {formData.price && formData.cost && parseFloat(formData.price) > parseFloat(formData.cost) && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Profit Margin: {(((parseFloat(formData.price) - parseFloat(formData.cost)) / parseFloat(formData.price)) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Profit per unit: ₱{(parseFloat(formData.price) - parseFloat(formData.cost)).toFixed(2)}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingProduct ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ProductsManagement