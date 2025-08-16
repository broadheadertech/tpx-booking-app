import axios from 'axios'

const API_BASE_URL = 'https://tpx-web-service.onrender.com/api'

class ApiService {
  constructor() {
    this.axios = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false,
    })
    
    console.log('API Service initialized with baseURL:', API_BASE_URL)

    this.axios.interceptors.request.use(
      (config) => {
        // List of public endpoints that don't require authentication
        const publicEndpoints = ['/login/', '/register/', '/token/refresh/']
        const isPublicEndpoint = publicEndpoints.some(endpoint => 
          config.url?.includes(endpoint)
        )
        
        // Only add auth token for non-public endpoints
        if (!isPublicEndpoint) {
          const token = this.getAccessToken()
          if (token) {
            config.headers.Authorization = `Bearer ${token}`
          }
        }
        
        console.log('Making API request:', {
          url: `${config.baseURL}${config.url}`,
          method: config.method?.toUpperCase(),
          headers: config.headers,
          data: config.data,
          isPublicEndpoint
        })
        
        return config
      },
      (error) => {
        console.error('Request interceptor error:', error)
        return Promise.reject(error)
      }
    )

    this.axios.interceptors.response.use(
      (response) => {
        console.log('API Response:', {
          status: response.status,
          statusText: response.statusText,
          data: response.data
        })
        return response
      },
      async (error) => {
        console.error('API Response error:', error)
        
        const isTimeout = error?.code === 'ECONNABORTED'
        if (isTimeout) {
          const enriched = Object.assign(
            new Error('Request timed out. Please try again.'),
            { code: 'ECONNABORTED', isNetwork: true, original: error }
          )
          return Promise.reject(enriched)
        }

        if (error.response) {
          const errorData = error.response.data
          
          // Handle token expiration - try to refresh token
          if (error.response.status === 401 && errorData?.code === 'token_not_valid') {
            console.log('Token expired, attempting to refresh...')
            
            try {
              const refreshToken = localStorage.getItem('refresh_token')
              if (refreshToken) {
                // Create a new axios instance without interceptors for refresh request
                const refreshAxios = axios.create({
                  baseURL: API_BASE_URL,
                  timeout: 10000,
                  headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                  }
                })
                
                const refreshResponse = await refreshAxios.post('/token/refresh/', {
                  refresh: refreshToken
                })
                
                if (refreshResponse.data.access) {
                  // Update stored token
                  localStorage.setItem('access_token', refreshResponse.data.access)
                  
                  // Retry original request with new token
                  const originalRequest = error.config
                  originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`
                  
                  console.log('Token refreshed successfully, retrying original request...')
                  return this.axios(originalRequest)
                }
              }
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError)
              // Clear invalid tokens and user data
              localStorage.removeItem('access_token')
              localStorage.removeItem('refresh_token')
              localStorage.removeItem('user_role')
              localStorage.removeItem('is_staff')
              localStorage.removeItem('user_id')
              localStorage.removeItem('username')
              
              // Show user-friendly error message
              alert('Your session has expired. Please log in again.')
              
              // Redirect to login
              window.location.href = '/auth/login'
              return Promise.reject(Object.assign(
                new Error('Authentication expired. Please log in again.'),
                { status: 401 }
              ))
            }
          }
          
          // Handle validation errors (like registration field errors)
          if (error.response.status === 400 && typeof errorData === 'object' && !errorData.detail) {
            const fieldErrors = []
            for (const [field, messages] of Object.entries(errorData)) {
              if (Array.isArray(messages)) {
                fieldErrors.push(`${field}: ${messages.join(', ')}`)
              }
            }
            return Promise.reject(Object.assign(
              new Error(fieldErrors.length > 0 ? fieldErrors.join('; ') : 'Validation error'),
              { status: 400, data: errorData }
            ))
          }
          
          const errorMessage = errorData?.detail || 
                              errorData?.message || 
                              `HTTP error! status: ${error.response.status}`
          return Promise.reject(Object.assign(new Error(errorMessage), { status: error.response.status, data: errorData }))
        } else if (error.request) {
          return Promise.reject(Object.assign(
            new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.'),
            { code: 'NETWORK_ERROR', isNetwork: true, original: error }
          ))
        } else {
          return Promise.reject(new Error('An unexpected error occurred'))
        }
      }
    )
  }

  async get(endpoint, config = {}) {
    const response = await this.axios.get(endpoint, config)
    return response.data
  }

  async post(endpoint, data = {}, config = {}) {
    const response = await this.axios.post(endpoint, data, config)
    return response.data
  }

  async put(endpoint, data = {}, config = {}) {
    const response = await this.axios.put(endpoint, data, config)
    return response.data
  }

  async patch(endpoint, data = {}, config = {}) {
    const response = await this.axios.patch(endpoint, data, config)
    return response.data
  }

  async delete(endpoint, config = {}) {
    const response = await this.axios.delete(endpoint, config)
    return response.data
  }

  getAccessToken() {
    return localStorage.getItem('access_token')
  }
}

export default new ApiService()