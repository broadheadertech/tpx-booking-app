import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCart } from '../../context/CartContext'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Star,
  Plus,
  Home,
  Scissors,
  Wallet,
  User,
  Package,
  Zap,
  Truck,
  BadgeCheck,
  ChevronRight,
  Receipt,
  Heart,
  SlidersHorizontal,
  TrendingUp,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react'
import WalkthroughOverlay from '../../components/common/WalkthroughOverlay'
import { customerShopSteps } from '../../config/walkthroughSteps'
import ShoppingCartDrawer from '../../components/customer/shop/ShoppingCartDrawer'
import ProductDetailModal from '../../components/customer/shop/ProductDetailModal'
import OrderHistory from '../../components/customer/shop/OrderHistory'
import WishlistPage from '../../components/customer/shop/WishlistPage'

// Category items with icons
const CATEGORY_ITEMS = [
  { id: 'all', label: 'All', icon: '✨' },
  { id: 'hair-care', label: 'Hair Care', icon: '💇' },
  { id: 'beard-care', label: 'Beard', icon: '🧔' },
  { id: 'shaving', label: 'Shaving', icon: '🪒' },
  { id: 'tools', label: 'Tools', icon: '✂️' },
  { id: 'accessories', label: 'Extras', icon: '🎁' },
]

// Shop page tabs
const SHOP_TABS = [
  { id: 'shop', label: 'Shop', icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', icon: Heart },
  { id: 'orders', label: 'Orders', icon: Receipt },
]

// Sort options
const SORT_OPTIONS = [
  { id: 'default', label: 'Default', icon: SlidersHorizontal },
  { id: 'price-low', label: 'Price: Low to High', icon: ArrowUpNarrowWide },
  { id: 'price-high', label: 'Price: High to Low', icon: ArrowDownNarrowWide },
  { id: 'popular', label: 'Popular', icon: TrendingUp },
]

// Bottom nav
const NAV_SECTIONS = [
  { id: 'home', label: 'Home', icon: Home, path: '/customer/dashboard' },
  { id: 'booking', label: 'Book', icon: Scissors, path: '/customer/booking' },
  { id: 'wallet', label: 'Pay', icon: Wallet, path: '/customer/wallet' },
  { id: 'shop', label: 'Shop', icon: ShoppingBag, path: '/customer/shop' },
  { id: 'profile', label: 'Account', icon: User, path: '/customer/profile' },
]

function Shop() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { items, itemCount, addItem, openCart } = useCart()
  const { user } = useCurrentUser()

  // Tab state with URL sync
  const [activeTab, setActiveTab] = useState(() => {
    const tabParam = searchParams.get('tab')
    return SHOP_TABS.find(t => t.id === tabParam)?.id || 'shop'
  })

  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addedProductId, setAddedProductId] = useState(null)
  const [activeBanner, setActiveBanner] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [sortBy, setSortBy] = useState('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false)
  const [hideNavbar, setHideNavbar] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const lastScrollY = useRef(0)

  // Hide navbar on scroll down, show on scroll up
  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY
    const scrollingDown = currentScrollY > lastScrollY.current
    const scrollThreshold = 10 // Minimum scroll distance to trigger

    if (Math.abs(currentScrollY - lastScrollY.current) > scrollThreshold) {
      setHideNavbar(scrollingDown && currentScrollY > 100)
    }
    lastScrollY.current = currentScrollY
  }, [])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Fetch products from admin catalog (central warehouse)
  const catalogProducts = useQuery(api.services.productCatalog.getCatalogProducts) || []

  // Fetch managed banners from admin settings
  const managedBanners = useQuery(api.services.shopBanners.getActiveBanners) || []

  // Normalize catalog products to match expected format
  const products = useMemo(() => {
    return catalogProducts.map(p => ({
      ...p,
      imageUrl: p.resolvedImageUrl || p.image_url,
      status: p.is_active ? 'active' : 'inactive',
    }))
  }, [catalogProducts])

  // Search suggestions (show top 5 matching products)
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return []
    const query = searchQuery.toLowerCase()
    return products
      .filter(p => p.status === 'active' && p.stock > 0)
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [products, searchQuery])

  // Wishlist functionality
  const wishlistIds = useQuery(
    api.services.wishlist.getUserWishlistIds,
    user?._id ? { user_id: user._id } : 'skip'
  ) || []
  const toggleWishlist = useMutation(api.services.wishlist.toggleWishlist)
  const [togglingWishlistId, setTogglingWishlistId] = useState(null)

  const handleToggleWishlist = async (productId, e) => {
    e?.stopPropagation()
    if (!user) return
    setTogglingWishlistId(productId)
    try {
      await toggleWishlist({
        user_id: user._id,
        product_id: productId,
      })
    } finally {
      setTogglingWishlistId(null)
    }
  }

  const isWishlisted = (productId) => wishlistIds.includes(productId)

  // Sync tab with URL
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && SHOP_TABS.find(t => t.id === tabParam)) {
      setActiveTab(tabParam)
    }
  }, [searchParams])

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    const newParams = new URLSearchParams(searchParams)
    if (tabId === 'shop') {
      newParams.delete('tab')
    } else {
      newParams.set('tab', tabId)
    }
    setSearchParams(newParams, { replace: true })
  }

  // Note: Banner auto-rotation is now handled inside BannerCarousel component
  // based on the actual number of promo banners available

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.status === 'active' && p.stock > 0)

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    switch (sortBy) {
      case 'price-low':
        filtered = [...filtered].sort((a, b) => a.price - b.price)
        break
      case 'price-high':
        filtered = [...filtered].sort((a, b) => b.price - a.price)
        break
      case 'popular':
        // Sort by a pseudo-popularity score (can be enhanced with real data)
        filtered = [...filtered].sort((a, b) => (b.stock || 0) - (a.stock || 0))
        break
      default:
        // Keep default order
        break
    }

    return filtered
  }, [products, selectedCategory, searchQuery, sortBy])

  // Flash sale products - featured items with active promos
  const flashSaleProducts = useMemo(() => {
    const now = Date.now()
    return products.filter(p => {
      // Must be active, in stock, and featured
      if (p.status !== 'active' || p.stock <= 0) return false
      if (!p.is_featured || !p.discount_percent) return false
      // Check if promo is active (within date range if set)
      if (p.promo_start && now < p.promo_start) return false
      if (p.promo_end && now > p.promo_end) return false
      // Check quantity limit not exceeded
      if (p.promo_quantity_limit && (p.promo_quantity_sold || 0) >= p.promo_quantity_limit) return false
      return true
    }).slice(0, 6)
  }, [products])

  // Handle add to cart
  const handleAddToCart = (product, quantity = 1) => {
    addItem(product, quantity)
    setAddedProductId(product._id)
    setTimeout(() => setAddedProductId(null), 1500)
  }

  // Handle add from modal
  const handleModalAddToCart = (product, quantity) => {
    handleAddToCart(product, quantity)
  }

  const isInCart = (productId) => items.some(i => i.product._id === productId)

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0A0A]/98 backdrop-blur-2xl">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Search Bar - only show in shop tab */}
            {activeTab === 'shop' ? (
              <div data-tour="shop-search" className="flex-1 relative">
                <div className="flex items-center gap-2 bg-[#1A1A1A] rounded-xl px-4 py-3">
                  <Search className="w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSearchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="p-1 rounded-full hover:bg-[#2A2A2A]"
                    >
                      <span className="text-gray-400 text-xs">✕</span>
                    </button>
                  )}
                </div>

                {/* Search Suggestions Dropdown */}
                {showSearchSuggestions && searchSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-xl z-50 overflow-hidden">
                    {searchSuggestions.map((product) => (
                      <button
                        key={product._id}
                        onClick={() => {
                          setSelectedProduct(product)
                          setShowSearchSuggestions(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-[#2A2A2A] transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] overflow-hidden flex-shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{product.name}</p>
                          <p className="text-xs text-[var(--color-primary)] font-semibold">
                            ₱{product.price.toLocaleString()}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'wishlist' ? (
              <div className="flex-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-lg font-bold text-white">My Wishlist</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Receipt className="w-4 h-4 text-green-400" />
                </div>
                <span className="text-lg font-bold text-white">My Orders</span>
              </div>
            )}
            {/* Cart Button */}
            <button
              data-tour="shop-cart"
              onClick={openCart}
              className="relative w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center"
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-[var(--color-primary)] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1">
                  {itemCount}
                </span>
              )}
            </button>
            <button onClick={() => setShowTutorial(true)} className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-gray-500 hover:text-white transition-colors" title="Show tutorial">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-md mx-auto px-4 pb-3">
          <div data-tour="shop-tabs" className="flex bg-[#1A1A1A] rounded-2xl p-1">
            {SHOP_TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-b border-[#1A1A1A]" />
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto pb-28">
        {/* Shop Tab Content */}
        {activeTab === 'shop' && (
          <>
            {/* Banner Carousel */}
            <BannerCarousel
              products={products}
              managedBanners={managedBanners}
              activeBanner={activeBanner}
              setActiveBanner={setActiveBanner}
            />

            {/* Category Grid */}
            <div data-tour="shop-categories" className="px-4 py-4">
              <div className="grid grid-cols-6 gap-2">
                {CATEGORY_ITEMS.map((cat) => {
                  const isActive = selectedCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/50'
                          : 'bg-[#1A1A1A] border border-transparent'
                      }`}
                    >
                      <span className="text-xl">{cat.icon}</span>
                      <span className={`text-[9px] font-medium leading-tight text-center ${
                        isActive ? 'text-[var(--color-primary)]' : 'text-gray-400'
                      }`}>
                        {cat.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Flash Sale Section */}
            {flashSaleProducts.length > 0 && selectedCategory === 'all' && !searchQuery && (
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--color-primary)] rounded-lg">
                      <Zap className="w-4 h-4 text-white" />
                      <span className="text-sm font-bold text-white">Flash Sale</span>
                    </div>
                    <CountdownTimer />
                  </div>
                  <button className="text-xs font-semibold text-[var(--color-primary)] flex items-center">
                    See All <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {flashSaleProducts.map((product) => (
                    <FlashSaleCard
                      key={product._id}
                      product={product}
                      onAdd={() => handleAddToCart(product)}
                      isAdded={addedProductId === product._id}
                      inCart={isInCart(product._id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Section Title with Sort */}
            <div className="px-4 pt-2 pb-3">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-white">
                  {selectedCategory === 'all' ? 'All Products' : CATEGORY_ITEMS.find(c => c.id === selectedCategory)?.label}
                </h2>
                <span className="text-xs text-gray-500">{filteredProducts.length} items</span>
              </div>

              {/* Sort Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] text-sm text-gray-300 hover:border-[#3A3A3A] transition-colors"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>{SORT_OPTIONS.find(o => o.id === sortBy)?.label || 'Sort'}</span>
                </button>

                {/* Sort Menu Dropdown */}
                {showSortMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowSortMenu(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-56 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] shadow-xl z-50 overflow-hidden">
                      {SORT_OPTIONS.map((option) => {
                        const Icon = option.icon
                        const isActive = sortBy === option.id
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setSortBy(option.id)
                              setShowSortMenu(false)
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                              isActive
                                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                                : 'text-gray-300 hover:bg-[#2A2A2A]'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{option.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Products Grid */}
            <div data-tour="shop-products" className="px-4">
              {filteredProducts.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((product, idx) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      index={idx}
                      onAdd={() => handleAddToCart(product)}
                      isAdded={addedProductId === product._id}
                      inCart={isInCart(product._id)}
                      onClick={() => setSelectedProduct(product)}
                      isWishlisted={isWishlisted(product._id)}
                      onToggleWishlist={(e) => handleToggleWishlist(product._id, e)}
                      isTogglingWishlist={togglingWishlistId === product._id}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Wishlist Tab Content */}
        {activeTab === 'wishlist' && (
          <WishlistPage />
        )}

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (
          <OrderHistory />
        )}
      </div>

      {/* Cart Drawer */}
      <ShoppingCartDrawer />

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleModalAddToCart}
        isInCart={selectedProduct ? isInCart(selectedProduct._id) : false}
        isWishlisted={selectedProduct ? isWishlisted(selectedProduct._id) : false}
        onToggleWishlist={() => selectedProduct && handleToggleWishlist(selectedProduct._id)}
        isTogglingWishlist={selectedProduct && togglingWishlistId === selectedProduct._id}
      />

      {/* Bottom Navigation - Hidden when scrolling down or modal is open */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D0D] border-t border-[#1A1A1A] safe-area-inset-bottom transition-transform duration-300 ${
        hideNavbar || selectedProduct ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-5 p-1 pb-2 md:p-2 md:pb-3">
            {NAV_SECTIONS.map((section) => {
              const Icon = section.icon
              const isActive = section.id === 'shop'
              return (
                <button
                  key={section.id}
                  onClick={() => navigate(section.path)}
                  className={`flex flex-col items-center justify-center py-2 md:py-3 transition-colors ${
                    isActive ? 'text-[var(--color-primary)]' : 'text-gray-600 hover:text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  <span className="text-[10px] md:text-xs mt-1 font-medium">{section.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <WalkthroughOverlay steps={customerShopSteps} isVisible={showTutorial} onComplete={() => setShowTutorial(false)} onSkip={() => setShowTutorial(false)} />
    </div>
  )
}

// Countdown Timer
function CountdownTimer() {
  const [time, setTime] = useState({ h: 2, m: 45, s: 30 })

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(prev => {
        let { h, m, s } = prev
        s--
        if (s < 0) { s = 59; m-- }
        if (m < 0) { m = 59; h-- }
        if (h < 0) { h = 23; m = 59; s = 59 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const pad = (n) => n.toString().padStart(2, '0')

  return (
    <div className="flex items-center gap-1">
      <span className="w-6 h-6 bg-[#1A1A1A] rounded flex items-center justify-center text-[11px] font-bold text-white">
        {pad(time.h)}
      </span>
      <span className="text-gray-500 font-bold text-xs">:</span>
      <span className="w-6 h-6 bg-[#1A1A1A] rounded flex items-center justify-center text-[11px] font-bold text-white">
        {pad(time.m)}
      </span>
      <span className="text-gray-500 font-bold text-xs">:</span>
      <span className="w-6 h-6 bg-[#1A1A1A] rounded flex items-center justify-center text-[11px] font-bold text-white">
        {pad(time.s)}
      </span>
    </div>
  )
}

// Banner Carousel - Shows managed banners + auto-generated product promos (flash sales always show)
function BannerCarousel({ products, managedBanners = [], activeBanner, setActiveBanner }) {
  const navigate = useNavigate()
  const trackBannerClick = useMutation(api.services.shopBanners.trackBannerClick)

  // Only show admin-managed banners (no auto-generated flash sales)
  const bannerData = useMemo(() => {
    // Return only banners created by admin in Banner Management
    return managedBanners.map(banner => ({
      _id: banner._id,
      title: banner.title,
      subtitle: banner.subtitle,
      badge: banner.badge,
      gradient: banner.gradient || 'from-[var(--color-primary)] to-orange-600',
      imageUrl: banner.imageUrl,
      product: banner.product,
      link_type: banner.link_type,
      link_url: banner.link_url,
      isManaged: true,
    }))
  }, [managedBanners])

  // Handle banner click with tracking
  const handleBannerClick = async (banner) => {
    // Track click for managed banners
    if (banner.isManaged && banner._id) {
      try {
        await trackBannerClick({ banner_id: banner._id })
      } catch (err) {
        console.error('Failed to track banner click:', err)
      }
    }

    // Handle link navigation
    if (banner.link_type === 'external' && banner.link_url) {
      window.open(banner.link_url, '_blank', 'noopener,noreferrer')
    } else if (banner.link_type === 'category' && banner.link_url) {
      // Filter by category (handled by parent component)
    } else if (banner.link_type === 'product' && banner.product) {
      // Could open product detail modal
    }
  }

  // Auto-rotate based on actual number of banners
  useEffect(() => {
    if (bannerData.length <= 1) return
    const timer = setInterval(() => {
      setActiveBanner(prev => (prev + 1) % bannerData.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [bannerData.length, setActiveBanner])

  // Don't render if no banners
  if (bannerData.length === 0) return null

  // Get display image (managed banner image or product image)
  const getBannerImage = (banner) => {
    if (banner.isManaged && banner.imageUrl) return banner.imageUrl
    return banner.product?.imageUrl
  }

  // Get button text based on link type
  const getButtonText = (banner) => {
    if (banner.link_type === 'external') return 'Learn More'
    if (banner.link_type === 'category') return 'View Category'
    return 'Shop Now'
  }

  return (
    <div className="px-4 pt-4">
      <div className="relative h-40 rounded-2xl overflow-hidden">
        {bannerData.map((banner, idx) => {
          const bannerImage = getBannerImage(banner)
          return (
            <div
              key={banner._id || idx}
              onClick={() => handleBannerClick(banner)}
              className={`absolute inset-0 flex transition-all duration-500 ease-out bg-gradient-to-r ${banner.gradient} ${
                banner.isManaged && banner.link_type !== 'none' ? 'cursor-pointer' : ''
              } ${
                idx === activeBanner
                  ? 'opacity-100 translate-x-0'
                  : idx < activeBanner
                  ? 'opacity-0 -translate-x-full'
                  : 'opacity-0 translate-x-full'
              }`}
            >
              <div className="flex-1 flex flex-col justify-center px-5">
                {banner.badge && (
                  <span className="inline-block w-fit px-2 py-0.5 bg-white/20 rounded text-[10px] font-bold text-white mb-2">
                    {banner.badge}
                  </span>
                )}
                <h3 className="text-xl font-black text-white leading-tight">{banner.title}</h3>
                {banner.subtitle && (
                  <p className="text-sm text-white/80 mt-1 line-clamp-1">{banner.subtitle}</p>
                )}
                {banner.link_type !== 'none' && (
                  <button className="mt-3 w-fit px-4 py-2 bg-white rounded-full text-xs font-bold text-gray-900 active:scale-95 transition-transform">
                    {getButtonText(banner)}
                  </button>
                )}
              </div>
              <div className="w-40 h-full flex items-center justify-center p-2 pr-4">
                {bannerImage ? (
                  <div className="relative w-28 h-28">
                    {/* Glow effect behind */}
                    <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl scale-90" />
                    {/* Image container */}
                    <div className="relative w-full h-full rounded-2xl bg-white/95 p-2 shadow-2xl border border-white/50 overflow-hidden">
                      <img
                        src={bannerImage}
                        alt=""
                        className="w-full h-full object-cover rounded-xl"
                      />
                    </div>
                    {/* Discount badge on product */}
                    {banner.product?.discount_percent && (
                      <div className="absolute -top-1 -right-1 bg-red-500 px-1.5 py-0.5 rounded-lg shadow-lg">
                        <span className="text-[10px] font-bold text-white">-{banner.product.discount_percent}%</span>
                      </div>
                    )}
                    {/* Shine effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
                  </div>
                ) : (
                  <div className="relative w-28 h-28">
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl scale-90" />
                    <div className="relative w-full h-full rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <ShoppingBag className="w-10 h-10 text-white/80" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div className="absolute bottom-2 inset-x-0 flex justify-center items-center gap-1">
          {bannerData.map((_, idx) => (
            <span
              key={idx}
              onClick={() => setActiveBanner(idx)}
              className={`block rounded-full cursor-pointer transition-all ${
                idx === activeBanner ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Flash Sale Card
function FlashSaleCard({ product, onAdd, isAdded, inCart }) {
  const [imgError, setImgError] = useState(false)

  // Use real discount values from product
  const discount = product.discount_percent || 0
  // Calculate original price: use explicit original_price, or calculate from current price + discount
  const originalPrice = product.original_price || (discount > 0 ? Math.round(product.price / (1 - discount / 100)) : product.price)

  // Calculate progress for quantity-limited promos
  const quantitySold = product.promo_quantity_sold || 0
  const quantityLimit = product.promo_quantity_limit || 100
  const progressPercent = Math.min((quantitySold / quantityLimit) * 100, 100)
  const remaining = Math.max(quantityLimit - quantitySold, 0)

  return (
    <div className="flex-shrink-0 w-32 bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#2A2A2A]">
      <div className="relative aspect-square bg-[#2A2A2A]">
        {product.imageUrl && !imgError ? (
          <img src={product.imageUrl} alt="" className="w-full h-full object-cover" onError={() => setImgError(true)} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-600" />
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 right-2 bg-[var(--color-primary)] px-1.5 py-0.5 rounded-lg">
            <span className="text-[10px] font-bold text-white">-{discount}%</span>
          </div>
        )}
        {product.promo_label && (
          <div className="absolute top-2 left-2 bg-red-500 px-1.5 py-0.5 rounded-lg">
            <span className="text-[9px] font-bold text-white">{product.promo_label}</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-[var(--color-primary)] font-bold text-sm">₱{product.price.toLocaleString()}</p>
        {originalPrice > product.price && (
          <p className="text-[10px] text-gray-500 line-through">₱{originalPrice.toLocaleString()}</p>
        )}
        <div className="mt-2 h-1.5 bg-[#2A2A2A] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[9px] text-gray-500 mt-1">
          {product.promo_quantity_limit
            ? `${remaining} left`
            : `${quantitySold} sold`}
        </p>
      </div>
    </div>
  )
}

// Product Card
function ProductCard({ product, index, onAdd, isAdded, inCart, onClick, isWishlisted, onToggleWishlist, isTogglingWishlist }) {
  const [imgError, setImgError] = useState(false)

  // Use real discount values from product - check if promo is active
  const now = Date.now()
  const isPromoActive = product.discount_percent &&
    (!product.promo_start || now >= product.promo_start) &&
    (!product.promo_end || now <= product.promo_end) &&
    (!product.promo_quantity_limit || (product.promo_quantity_sold || 0) < product.promo_quantity_limit)

  const discount = isPromoActive ? product.discount_percent : null
  // Calculate original price: use explicit original_price, or calculate from current price + discount
  const originalPrice = isPromoActive
    ? (product.original_price || Math.round(product.price / (1 - product.discount_percent / 100)))
    : null
  const soldCount = product.promo_quantity_sold || 0
  const rating = product.rating || 4.8
  const hasFreeship = product.free_shipping || index % 2 === 0

  const formatSold = (n) => n >= 1000 ? `${(n/1000).toFixed(1)}K` : n

  return (
    <div
      className="bg-[#1A1A1A] rounded-2xl overflow-hidden border border-[#2A2A2A] cursor-pointer active:scale-[0.98] transition-transform"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-[#2A2A2A]">
        {product.imageUrl && !imgError ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Wishlist Heart Button */}
        <button
          onClick={onToggleWishlist}
          disabled={isTogglingWishlist}
          className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            isWishlisted
              ? 'bg-red-500/90'
              : 'bg-black/40 backdrop-blur-sm hover:bg-black/60'
          } ${isTogglingWishlist ? 'scale-90' : ''}`}
        >
          <Heart
            className={`w-4 h-4 transition-all ${
              isWishlisted ? 'text-white fill-white' : 'text-white'
            }`}
          />
        </button>

        {discount && (
          <div className="absolute top-2 right-2 bg-[var(--color-primary)] px-2 py-1 rounded-lg">
            <span className="text-xs font-bold text-white">-{discount}%</span>
          </div>
        )}

        {/* Promo Label Badge */}
        {isPromoActive && product.promo_label && (
          <div className="absolute top-10 right-2 bg-red-500 px-2 py-0.5 rounded-lg">
            <span className="text-[10px] font-bold text-white">{product.promo_label}</span>
          </div>
        )}

        <div className="absolute bottom-2 left-2 flex gap-1">
          {/* Low Stock Badge */}
          {product.stock <= 5 && product.stock > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500/90 text-[8px] font-bold text-white rounded flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />
              Only {product.stock} left
            </span>
          )}
          {hasFreeship && product.stock > 5 && (
            <span className="px-1.5 py-0.5 bg-green-500/90 text-[8px] font-bold text-white rounded">
              Free Ship
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          className={`absolute bottom-2 right-2 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isAdded || inCart ? 'bg-green-500' : 'bg-[#1A1A1A]/80 backdrop-blur'
          }`}
        >
          {isAdded || inCart ? (
            <BadgeCheck className="w-5 h-5 text-white" />
          ) : (
            <Plus className="w-5 h-5 text-white" />
          )}
        </button>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="px-1.5 py-0.5 bg-[var(--color-primary)] rounded text-[8px] font-bold text-white">Mall</span>
          <span className="text-[10px] text-gray-500 truncate">{product.brand || 'TipunoX'}</span>
        </div>

        <p className="text-sm text-white font-medium line-clamp-2 min-h-[40px] leading-tight mb-2">
          {product.name}
        </p>

        <div className="flex items-baseline gap-1.5 mb-2">
          <span className="text-base font-bold text-[var(--color-primary)]">
            ₱{product.price.toLocaleString()}
          </span>
          {originalPrice && (
            <span className="text-[10px] text-gray-500 line-through">
              ₱{originalPrice.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-[10px] text-gray-400 font-medium">{rating}</span>
          <span className="text-[10px] text-gray-600">•</span>
          <span className="text-[10px] text-gray-500">{formatSold(soldCount)} sold</span>
        </div>
      </div>
    </div>
  )
}

// Empty State
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-20 h-20 rounded-2xl bg-[#1A1A1A] flex items-center justify-center mb-4">
        <Package className="w-10 h-10 text-gray-600" />
      </div>
      <p className="text-gray-400 font-medium mb-1">No products found</p>
      <p className="text-sm text-gray-600">Try a different category</p>
    </div>
  )
}

export default Shop
