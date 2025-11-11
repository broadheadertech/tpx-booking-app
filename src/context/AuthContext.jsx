import { createContext, useContext, useEffect, useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Helper function to extract JSON from error message
function extractJSON(message) {
  if (!message) return null;
  
  // Find JSON object start
  const jsonStart = message.indexOf('{');
  if (jsonStart === -1) return null;
  
  // Find where JSON ends (before " at " or end of string)
  const atIndex = message.indexOf(' at ', jsonStart);
  const endIndex = atIndex !== -1 ? atIndex : message.length;
  
  // Extract JSON string
  let jsonStr = message.substring(jsonStart, endIndex).trim();
  
  // Remove trailing punctuation if present
  jsonStr = jsonStr.replace(/[.,;:]$/, '');
  
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === 'object' && parsed.message) {
      return parsed;
    }
  } catch (e) {
    // Try to find complete JSON by matching braces
    let braceCount = 0;
    let jsonEnd = jsonStart;
    for (let i = jsonStart; i < message.length; i++) {
      if (message[i] === '{') braceCount++;
      if (message[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
    if (jsonEnd > jsonStart) {
      try {
        const parsed = JSON.parse(message.substring(jsonStart, jsonEnd));
        if (parsed && typeof parsed === 'object' && parsed.message) {
          return parsed;
        }
      } catch (e2) {
        // Failed to parse
      }
    }
  }
  
  return null;
}

// Helper function to clean Convex metadata from error messages
function cleanConvexError(message) {
  if (!message) return '';
  
  // First, try to extract JSON error if present
  const jsonData = extractJSON(message);
  if (jsonData && jsonData.message) {
    return jsonData.message;
  }
  
  let cleaned = message;
  
  // Remove Convex metadata patterns: [CONVEX M(...)]
  cleaned = cleaned.replace(/\[CONVEX M\([^\]]+\)\]/g, '');
  
  // Remove Request ID patterns: [Request ID: ...]
  cleaned = cleaned.replace(/\[Request ID: [^\]]+\]/g, '');
  
  // Remove "Server Error Uncaught Error:" prefix
  cleaned = cleaned.replace(/Server Error Uncaught Error:\s*/gi, '');
  
  // Remove stack traces (lines starting with "at")
  cleaned = cleaned.replace(/\s*at\s+[^\n]+/g, '');
  
  // Remove "Called by client" text
  cleaned = cleaned.replace(/\s*Called by client\s*/gi, '');
  
  // Try to extract JSON error again after cleaning (in case it was embedded)
  const jsonDataAfter = extractJSON(cleaned);
  if (jsonDataAfter && jsonDataAfter.message) {
    return jsonDataAfter.message;
  }
  
  // Clean up extra whitespace and newlines
  cleaned = cleaned.trim().replace(/\s+/g, ' ');
  
  return cleaned;
}

// Helper function to parse Convex error messages
function parseConvexError(error) {
  try {
    if (error?.message) {
      // First, try to extract structured JSON error
      const jsonData = extractJSON(error.message);
      if (jsonData && jsonData.message && jsonData.code) {
        return {
          message: jsonData.message,
          details: jsonData.details || '',
          action: jsonData.action || '',
          code: jsonData.code || ''
        }
      }
      
      // Clean Convex metadata
      const cleanedMessage = cleanConvexError(error.message);
      
      // Try to parse JSON error from cleaned message (structured error format)
      try {
        const parsed = JSON.parse(cleanedMessage)
        if (parsed.message && parsed.code) {
          return {
            message: parsed.message,
            details: parsed.details || '',
            action: parsed.action || '',
            code: parsed.code || ''
          }
        }
      } catch (jsonError) {
        // Not JSON, check if it's a human-readable string
        // Map common error patterns to user-friendly messages
        const message = cleanedMessage.toLowerCase()
        
        // Authentication errors
        if (message.includes('email') && message.includes('already exists')) {
          return {
            message: 'An account with this email already exists.',
            details: 'This email address is already registered in our system.',
            action: 'Try signing in instead, or use a different email address to create a new account.',
            code: 'AUTH_EMAIL_EXISTS'
          }
        }
        if (message.includes('username') && message.includes('already exists')) {
          return {
            message: 'This username is already taken.',
            details: 'Someone else is already using this username.',
            action: 'Please choose a different username for your account.',
            code: 'AUTH_USERNAME_EXISTS'
          }
        }
        if (message.includes('invalid') && (message.includes('password') || message.includes('credential'))) {
          return {
            message: 'The email or password you entered is incorrect.',
            details: 'Please check your email and password and try again.',
            action: 'Double-check your credentials or use the "Forgot Password" option if needed.',
            code: 'AUTH_INVALID_CREDENTIALS'
          }
        }
        if (message.includes('inactive') || message.includes('deactivated')) {
          return {
            message: 'Your account has been deactivated.',
            details: 'This account is currently inactive and cannot be used to sign in.',
            action: 'Please contact our support team to reactivate your account.',
            code: 'AUTH_ACCOUNT_INACTIVE'
          }
        }
        if (message.includes('session') && message.includes('expired')) {
          return {
            message: 'Your session has expired.',
            details: 'For security reasons, you need to sign in again.',
            action: 'Please sign in again to continue using the application.',
            code: 'AUTH_SESSION_EXPIRED'
          }
        }
        if (message.includes('branch') && message.includes('required')) {
          return {
            message: 'Branch assignment is required.',
            details: 'Staff, barbers, branch admins, and admins must be assigned to a branch.',
            action: 'Please contact an administrator to assign you to a branch.',
            code: 'VALIDATION_ERROR'
          }
        }
        if (message.includes('reset') && (message.includes('expired') || message.includes('invalid'))) {
          return {
            message: 'Password reset link is invalid or expired.',
            details: 'Your password reset link has expired or is invalid.',
            action: 'Please request a new password reset link.',
            code: 'AUTH_INVALID_CREDENTIALS'
          }
        }
        if (message.includes('facebook') && (message.includes('invalid') || message.includes('failed'))) {
          return {
            message: 'Facebook login failed.',
            details: 'Unable to authenticate with Facebook. The token may be invalid or expired.',
            action: 'Please try logging in again or use email/password instead.',
            code: 'AUTH_INVALID_CREDENTIALS'
          }
        }
        
        // Default fallback for unparseable errors
        return {
          message: cleanedMessage || 'An unexpected error occurred',
          details: 'Please try again or contact support if the problem persists.',
          action: '',
          code: 'OPERATION_FAILED'
        }
      }
    }
  } catch (e) {
    // Fallback for any parsing errors
    console.error('Error parsing Convex error:', e)
  }
  
  // Return a friendly message for unparseable errors
  const cleanedMessage = error?.message ? cleanConvexError(error.message) : 'An unexpected error occurred';
  return {
    message: cleanedMessage || 'An unexpected error occurred',
    details: 'Please try again or contact support if the problem persists.',
    action: '',
    code: 'OPERATION_FAILED'
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
