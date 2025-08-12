import { createContext, useContext, useEffect, useState } from 'react'
import authService from '../services/auth.js'

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

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = () => {
    try {
      const isAuth = authService.isAuthenticated()
      const userId = authService.getUserId()
      const userRole = authService.getUserRole()
      const isStaff = authService.getIsStaff()

      console.log('Checking auth status:', { isAuth, userId, userRole, isStaff })

      if (isAuth) {
        setIsAuthenticated(true)
        setUser({
          id: userId,
          role: userRole,
          is_staff: isStaff
        })
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setIsAuthenticated(false)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    try {
      const result = await authService.login(username, password)
      
      console.log('Login result:', result)
      
      if (result.success) {
        console.log('Login successful, setting user state:', {
          id: result.data.user_id,
          role: result.data.role,
          is_staff: result.data.is_staff
        })
        
        setIsAuthenticated(true)
        setUser({
          id: result.data.user_id,
          role: result.data.role,
          is_staff: result.data.is_staff
        })
      }
      
      return result
    } catch (error) {
      console.error('Login error:', error)
      return {
        success: false,
        error: 'Login failed. Please try again.'
      }
    }
  }

  const logout = () => {
    authService.logout()
    setIsAuthenticated(false)
    setUser(null)
  }

  const value = {
    isAuthenticated,
    user,
    loading,
    login,
    logout,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}