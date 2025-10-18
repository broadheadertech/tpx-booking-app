import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Helper function to parse Convex error messages
function parseConvexError(error) {
  try {
    if (error?.message) {
      // Try to parse JSON error from Convex
      const parsed = JSON.parse(error.message)
      if (parsed.message) {
        return {
          message: parsed.message,
          details: parsed.details || '',
          action: parsed.action || '',
          code: parsed.code || ''
        }
      }
    }
  } catch (e) {
    // Not a JSON error, return as-is
  }
  
  // Return a friendly message for unparseable errors
  return {
    message: error?.message || 'An unexpected error occurred',
    details: 'Please try again or contact support if the problem persists.',
    action: '',
    code: ''
  }
}

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
      // Keep loading true until query completes
    } else {
      // No stored token, we can safely set loading to false
      setLoading(false)
      setIsAuthenticated(false)
      setUser(null)
    }
  }, [])

  // Query current user - only call when we have a session token
  const currentUser = useQuery(
    api.services.auth.getCurrentUser,
    sessionToken ? { sessionToken } : "skip"
  )

  // Mutations
  const loginMutation = useMutation(api.services.auth.loginUser)
  const facebookLoginAction = useAction(api.services.auth.loginWithFacebook)
  const logoutMutation = useMutation(api.services.auth.logoutUser)
  const requestPasswordResetMutation = useMutation(api.services.auth.requestPasswordReset)
  const sendPasswordResetEmailAction = useAction(api.services.auth.sendPasswordResetEmail)
  const resetPasswordMutation = useMutation(api.services.auth.resetPassword)

  useEffect(() => {
    // Only process when we have a session token and the query has completed
    if (sessionToken && currentUser !== undefined) {
      setLoading(false)
      if (currentUser) {
        // Valid session and user data
        setIsAuthenticated(true)
        setUser({
          _id: currentUser._id,
          id: currentUser._id, // Keep both for compatibility
          username: currentUser.username,
          email: currentUser.email,
          nickname: currentUser.nickname,
          mobile_number: currentUser.mobile_number,
          role: currentUser.role,
          avatar: currentUser.avatar,
          is_staff: currentUser.role === 'staff' || currentUser.role === 'admin' || currentUser.role === 'super_admin' || currentUser.role === 'branch_admin',
          branch_id: currentUser.branch_id
        })
      } else {
        // Invalid session, clear it
        setIsAuthenticated(false)
        setUser(null)
        setSessionToken(null)
        localStorage.removeItem('session_token')
      }
    }
    // If sessionToken exists but currentUser is undefined, keep loading
    // If no sessionToken, loading state is handled in the first useEffect
  }, [currentUser, sessionToken])

  const login = async (email, password) => {
    try {
      const result = await loginMutation({ email, password })

      if (result && result.sessionToken && result.user) {
        // Store session token
        localStorage.setItem('session_token', result.sessionToken)
        setSessionToken(result.sessionToken)

        // Set user state immediately
        const userData = {
          _id: result.user._id,
          id: result.user._id, // Keep both for compatibility
          username: result.user.username,
          email: result.user.email,
          nickname: result.user.nickname,
          mobile_number: result.user.mobile_number,
          role: result.user.role,
          avatar: result.user.avatar,
          is_staff: result.user.role === 'staff' || result.user.role === 'admin' || result.user.role === 'super_admin' || result.user.role === 'branch_admin',
          branch_id: result.user.branch_id
        }
        setIsAuthenticated(true)
        setUser(userData)

        return {
          success: true,
          data: userData
        }
      }

      return {
        success: false,
        error: 'Invalid email or password'
      }
    } catch (error) {
      console.error('Login error:', error)
      const parsedError = parseConvexError(error)
      
      return {
        success: false,
        error: parsedError.message,
        details: parsedError.details,
        action: parsedError.action
      }
    }
  }

  const loginWithFacebook = async (accessToken) => {
    try {
      const result = await facebookLoginAction({ access_token: accessToken })
      if (result?.sessionToken && result?.user) {
        localStorage.setItem('session_token', result.sessionToken)
        setSessionToken(result.sessionToken)
        const userData = {
          _id: result.user._id,
          id: result.user._id,
          username: result.user.username,
          email: result.user.email,
          nickname: result.user.nickname,
          mobile_number: result.user.mobile_number,
          role: result.user.role,
          avatar: result.user.avatar,
          is_staff: result.user.role === 'staff' || result.user.role === 'admin' || result.user.role === 'super_admin' || result.user.role === 'branch_admin',
          branch_id: result.user.branch_id
        }
        setIsAuthenticated(true)
        setUser(userData)
        return { success: true, data: userData }
      }
      return { success: false, error: 'Facebook login failed' }
    } catch (err) {
      console.error('Facebook login error:', err)
      let errorMessage = err.message || 'Facebook login failed'
      
      // Check if it's related to email service configuration
      if (err.message && err.message.includes('development mode')) {
        errorMessage = 'Facebook authentication failed. Email service is in development mode.'
      }
      
      return { success: false, error: errorMessage }
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

  const requestPasswordReset = async (email) => {
    try {
      const result = await requestPasswordResetMutation({ email })
      
      if (result.success && result.token && result.email) {
        // Send email with reset link
        const emailResult = await sendPasswordResetEmailAction({
          email: result.email,
          token: result.token
        });
        
        if (!emailResult.success) {
          console.error('Failed to send reset email:', emailResult.error);
        }
      }
      
      return { success: true }
    } catch (error) {
      console.error('Request password reset error:', error)
      return { success: false, error: error.message || 'Failed to request reset' }
    }
  }

  const resetPassword = async (token, newPassword) => {
    try {
      const res = await resetPasswordMutation({ token, new_password: newPassword })
      return { success: true }
    } catch (error) {
      console.error('Reset password error:', error)
      return { success: false, error: error.message || 'Failed to reset password' }
    }
  }

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    loginWithFacebook,
    sessionToken,
    requestPasswordReset,
    resetPassword
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      user,
      loading,
      login,
      logout,
      loginWithFacebook,
      sessionToken,
      requestPasswordReset,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  )
}
