import { createContext, useContext, useState, useCallback, useMemo } from 'react'

const CartContext = createContext(null)

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within a CartProvider')
  return ctx
}

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)

  // Add item to cart
  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product._id === product._id)
      if (existingIndex >= 0) {
        // Update quantity if item exists
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity
        }
        return updated
      }
      // Add new item
      return [...prev, { product, quantity }]
    })
  }, [])

  // Remove item from cart
  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(item => item.product._id !== productId))
  }, [])

  // Update item quantity
  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    setItems(prev => prev.map(item =>
      item.product._id === productId
        ? { ...item, quantity }
        : item
    ))
  }, [removeItem])

  // Clear cart
  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  // Toggle cart drawer
  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev)
  }, [])

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])

  // Calculate totals
  const totals = useMemo(() => {
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => {
      const price = item.product.price || 0
      return sum + (price * item.quantity)
    }, 0)
    return { itemCount, subtotal }
  }, [items])

  const value = {
    items,
    itemCount: totals.itemCount,
    subtotal: totals.subtotal,
    isCartOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    toggleCart,
    openCart,
    closeCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}

export default CartContext
