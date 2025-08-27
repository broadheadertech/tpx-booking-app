import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionToken, setSessionToken] = useState(null)

  // Get stored session token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('session_token')
    if (storedToken) {
      setSessionToken(storedToken)
      // Don't set loading to false here - wait for the query to complete
    } else {
      setLoading(false)
    }
  }, [])

  // Query current user - always call the hook but only when we have a session token
  const currentUser = useQuery(
    api.services.auth.getCurrentUser,
    sessionToken ? { sessionToken } : { sessionToken: null }
  )

  // Mutations
  const loginMutation = useMutation(api.services.auth.loginUser)
  const logoutMutation = useMutation(api.services.auth.logoutUser)

  useEffect(() => {
    // Only process currentUser result if we have a session token
    if (sessionToken && currentUser !== undefined) {
      setLoading(false)
      if (currentUser) {
        setIsAuthenticated(true)
        setUser({
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          nickname: currentUser.nickname,
          mobile_number: currentUser.mobile_number,
          role: currentUser.role,
          is_staff: currentUser.role === 'staff' || currentUser.role === 'admin'
        })
      } else {
        // Invalid session, clear it
        setIsAuthenticated(false)
        setUser(null)
        setSessionToken(null)
        localStorage.removeItem('session_token')
      }
    } else if (!sessionToken) {
      // No session token, we're done loading
      setLoading(false)
    }
  }, [currentUser, sessionToken])

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email })

      const result = await loginMutation({ email, password })

      console.log('Login result:', result)

      if (result) {
        // Store session token
        localStorage.setItem('session_token', result.sessionToken)
        setSessionToken(result.sessionToken)

        // Set user state immediately
        setIsAuthenticated(true)
        setUser({
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          nickname: result.user.nickname,
          mobile_number: result.user.mobile_number,
          role: result.user.role,
          is_staff: result.user.role === 'staff' || result.user.role === 'admin'
        })

        return {
          success: true,
          data: result.user
        }
      }

      return {
        success: false,
        error: 'Login failed'
      }
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: error.message || 'Login failed. Please try again.'
      }
    }
  }

  const logout = async () => {
    try {
      if (sessionToken) {
        await logoutMutation({ sessionToken })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Clear local state regardless of API call success
      localStorage.removeItem('session_token')
      setSessionToken(null)
      setIsAuthenticated(false)
      setUser(null)
    }
  }

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    sessionToken
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}