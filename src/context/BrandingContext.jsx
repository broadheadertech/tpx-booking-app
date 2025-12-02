import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'

const CACHE_KEY = 'branding_global_cache'
const CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours
const FALLBACK_BRANDING = {
  display_name: '',
  primary_color: '#000000',
  accent_color: '#000000',
  bg_color: '#0A0A0A',
  text_color: '#FFFFFF',
  muted_color: '#333333',
  hero_image_url: '/landing/2.webp',
  feature_toggles: {
    kiosk: true,
    wallet: true,
    vouchers: true,
    referrals: false,
  },
}

const BrandingContext = createContext(null)

export const useBranding = () => {
  const ctx = useContext(BrandingContext)
  if (!ctx) throw new Error('useBranding must be used within a BrandingProvider')
  return ctx
}

const readCachedBranding = () => {
  if (typeof window === 'undefined') return null
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const parsed = JSON.parse(cached)
    
    // Check cache expiration
    if (parsed.cachedAt && Date.now() - parsed.cachedAt > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return parsed.data
  } catch {
    return null
  }
}

const writeCachedBranding = (branding) => {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: branding,
      cachedAt: Date.now()
    }))
  } catch (error) {
    console.warn('Failed to cache branding:', error)
  }
}

export const BrandingProvider = ({ children }) => {
  const [version, setVersion] = useState(0)
  const [branding, setBranding] = useState(() => readCachedBranding() || FALLBACK_BRANDING)
  const [applied, setApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const brandingQuery = useQuery(api.services.branding.getGlobalBranding, useMemo(() => ({ version }), [version]))

  const applyBrandingVariables = useCallback((source) => {
    const theme = { ...FALLBACK_BRANDING, ...source }
    if (typeof document === 'undefined') return
    const root = document.documentElement
    const applyVar = (name, value) => {
      if (value) root.style.setProperty(name, value)
    }

    applyVar('--color-primary', theme.primary_color)
    applyVar('--color-accent', theme.accent_color)
    applyVar('--color-bg', theme.bg_color)
    applyVar('--color-text', theme.text_color)
    applyVar('--color-muted', theme.muted_color)

    if (theme.favicon_url) {
      let link = document.querySelector("link[rel='icon']")
      if (!link) {
        link = document.createElement('link')
        link.setAttribute('rel', 'icon')
        document.head.appendChild(link)
      }
      link.setAttribute('href', theme.favicon_url)
    }
  }, [])

  useEffect(() => {
    if (brandingQuery === undefined) {
      setLoading(true)
      return
    }
    
    setLoading(false)
    
    if (!brandingQuery) {
      setError('Failed to load branding configuration')
      setBranding(FALLBACK_BRANDING)
      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CACHE_KEY)
        }
      } catch {
        // ignore
      }
      return
    }

    setError(null)
    setBranding((prev) => {
      const prevUpdated = prev?.updatedAt || 0
      const incomingUpdated = brandingQuery.updatedAt || 0
      if (!prev || incomingUpdated >= prevUpdated) {
        writeCachedBranding(brandingQuery)
        return brandingQuery
      }
      return prev
    })
  }, [brandingQuery])

  useEffect(() => {
    if (!branding) return
    applyBrandingVariables(branding)
    setApplied(true)
  }, [branding, applyBrandingVariables])

  const refresh = useCallback(() => {
    setVersion((prev) => prev + 1)
  }, [])

  const value = useMemo(() => ({
    branding,
    applied,
    loading,
    error,
    refresh,
  }), [branding, applied, loading, error, refresh])

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}