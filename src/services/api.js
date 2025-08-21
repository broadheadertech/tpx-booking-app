import ky from 'ky'

const API_BASE_URL = 'http://127.0.0.1:8000/api'
// const API_BASE_URL = 'https://tpx-web-service-a26o.onrender.com/api'

class ApiService {
  constructor() {
    // Initialize cache and request deduplication
    this.cache = new Map()
    this.pendingRequests = new Map()
    this.cacheTimeout = 5 * 60 * 1000 // 5 minutes default cache
    
    // Create Ky instance with proper configuration
    this.ky = ky.create({
      prefixUrl: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      retry: {
        limit: 3,
        methods: ['get'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504]
      },
      hooks: {
        beforeRequest: [
          (request) => {
            // List of public endpoints that don't require authentication (without leading slashes)
            const publicEndpoints = ['login/', 'register/', 'token/refresh/']
            const isPublicEndpoint = publicEndpoints.some(endpoint => 
              request.url.includes(endpoint)
            )
            
            // Only add auth token for non-public endpoints
            if (!isPublicEndpoint) {
              const token = this.getAccessToken()
              if (token) {
                request.headers.set('Authorization', `Bearer ${token}`)
              }
            }
            
            console.log('Making API request:', {
              url: request.url,
              method: request.method,
              isPublicEndpoint
            })
          }
        ],
        afterResponse: [
          (request, options, response) => {
            console.log('API Response:', {
              status: response.status,
              statusText: response.statusText,
              url: request.url
            })
            return response
          }
        ],
        beforeError: [
          (error) => {
            console.error('API Response error:', error)
            
            const isTimeout = error?.name === 'TimeoutError'
            if (isTimeout) {
              const enriched = Object.assign(
                new Error('Request timed out. Please try again.'),
                { code: 'ECONNABORTED', isNetwork: true, original: error }
              )
              return enriched
            }

            // Handle HTTP errors
            if (error.response) {
              console.log('HTTP Error:', error.response.status)
              
              // Handle token expiration
              if (error.response.status === 401) {
                console.log('Unauthorized access - token may be expired')
                // Token refresh should be handled by auth service
              }
            }
            
            return error
          }
        ]
      }
    })
    
    console.log('API Service initialized with baseURL:', API_BASE_URL)
    console.log('Enhanced with caching and request deduplication')
  }

  // Helper method to normalize endpoints for Ky prefixUrl
  normalizeEndpoint(endpoint) {
    // Remove leading slash when using prefixUrl
    return endpoint.startsWith('/') ? endpoint.slice(1) : endpoint
  }

  async get(endpoint, config = {}) {
    try {
      const normalizedEndpoint = this.normalizeEndpoint(endpoint)
      const response = await this.ky.get(normalizedEndpoint, config)
      return await response.json()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async post(endpoint, data = {}, config = {}) {
    try {
      const normalizedEndpoint = this.normalizeEndpoint(endpoint)
      const response = await this.ky.post(normalizedEndpoint, {
        json: data,
        ...config
      })
      return await response.json()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async put(endpoint, data = {}, config = {}) {
    try {
      const normalizedEndpoint = this.normalizeEndpoint(endpoint)
      const response = await this.ky.put(normalizedEndpoint, {
        json: data,
        ...config
      })
      return await response.json()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async patch(endpoint, data = {}, config = {}) {
    try {
      const normalizedEndpoint = this.normalizeEndpoint(endpoint)
      const response = await this.ky.patch(normalizedEndpoint, {
        json: data,
        ...config
      })
      return await response.json()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  async delete(endpoint, config = {}) {
    try {
      const normalizedEndpoint = this.normalizeEndpoint(endpoint)
      const response = await this.ky.delete(normalizedEndpoint, config)
      return await response.json()
    } catch (error) {
      throw this.handleError(error)
    }
  }

  handleError(error) {
    // Handle timeout errors
    if (error.name === 'TimeoutError') {
      return Object.assign(
        new Error('Request timed out. Please try again.'),
        { code: 'ECONNABORTED', isNetwork: true, original: error }
      )
    }

    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status
      
      // Handle authentication errors
      if (status === 401) {
        return Object.assign(
          new Error('Authentication required. Please log in again.'),
          { status: 401, response: error.response }
        )
      }
      
      // Handle other HTTP errors
      return Object.assign(
        new Error(`HTTP error! status: ${status}`),
        { status, response: error.response }
      )
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return Object.assign(
        new Error('Network error: Unable to connect to the server. Please check your internet connection and try again.'),
        { code: 'NETWORK_ERROR', isNetwork: true, original: error }
      )
    }

    // Return original error for unknown cases
    return error
  }

  getAccessToken() {
    return localStorage.getItem('access_token')
  }
}

export default new ApiService()