/**
 * Simple in-memory cache utility for API responses
 * Provides TTL-based caching with automatic cleanup
 */
class SimpleCache {
  constructor(defaultTTL = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map()
    this.defaultTTL = defaultTTL
    this.cleanupInterval = null
    
    // Start periodic cleanup every 2 minutes
    this.startCleanup()
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    })
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }
    
    return item.value
  }

  /**
   * Check if a key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    return this.get(key) !== null
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   * @returns {object} Cache stats
   */
  getStats() {
    const now = Date.now()
    let validEntries = 0
    let expiredEntries = 0
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        expiredEntries++
      } else {
        validEntries++
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    }
  }

  /**
   * Start automatic cleanup of expired entries
   * @param {number} interval - Cleanup interval in milliseconds
   */
  startCleanup(interval = 2 * 60 * 1000) { // 2 minutes
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, interval)
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * Manually cleanup expired entries
   */
  cleanup() {
    const now = Date.now()
    let cleanedCount = 0
    
    for (const [key, item] of this.cache) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
        cleanedCount++
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`)
    }
  }

  /**
   * Clear cache entries matching a pattern
   * @param {string|RegExp} pattern - Pattern to match keys
   */
  clearPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern
    let clearedCount = 0
    
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key)
        clearedCount++
      }
    }
    
    console.log(`Cache pattern clear: removed ${clearedCount} entries matching ${pattern}`)
  }
}

// Create global cache instances for different use cases
export const apiCache = new SimpleCache(5 * 60 * 1000) // 5 minutes for API responses
export const shortCache = new SimpleCache(30 * 1000) // 30 seconds for frequently changing data
export const longCache = new SimpleCache(30 * 60 * 1000) // 30 minutes for static data

// Export the class for custom instances
export default SimpleCache

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    apiCache.stopCleanup()
    shortCache.stopCleanup()
    longCache.stopCleanup()
  })
}