import React, { useState, useEffect } from 'react'
import { Search, Image, ExternalLink } from 'lucide-react'

const HaircutImageSearch = ({ searchQuery = '', onImageSelect = null }) => {
  const [searchTerm, setSearchTerm] = useState(searchQuery)
  const [images, setImages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Google Custom Search Engine ID from the provided snippet
  const SEARCH_ENGINE_ID = '732e1b0a9174d4473'
  const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_IMAGES_API_KEY

  useEffect(() => {
    if (searchQuery) {
      setSearchTerm(searchQuery)
      handleSearch(searchQuery)
    }
  }, [searchQuery])

  const handleSearch = async (query = searchTerm) => {
    if (!query.trim()) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Use Google Custom Search API with the provided search engine ID
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${SEARCH_ENGINE_ID}&q=${encodeURIComponent(query + ' men haircut hairstyle')}&searchType=image&num=8&safe=active&imgType=photo&imgSize=medium`
      
      const response = await fetch(searchUrl)
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.items && data.items.length > 0) {
        const imageResults = data.items.map((item, index) => ({
          id: index,
          url: item.link,
          thumbnail: item.image.thumbnailLink,
          title: item.title,
          source: item.displayLink,
          snippet: item.snippet
        }))
        setImages(imageResults)
      } else {
        setImages([])
        setError('No images found for this search term')
      }
    } catch (err) {
      console.error('Image search failed:', err)
      setError('Failed to search for images. Please check your API configuration.')
      setImages([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleImageClick = (image) => {
    if (onImageSelect) {
      onImageSelect(image)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex items-center space-x-2 mb-4">
        <Image className="w-5 h-5 text-[#FF8C42]" />
        <h3 className="text-white font-medium">Haircut Image Search</h3>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for haircut styles..."
          className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-600/30 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF8C42]/50 focus:border-[#FF8C42]/50 transition-colors"
        />
        <button
          onClick={() => handleSearch()}
          disabled={isLoading || !searchTerm.trim()}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <div className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
            isLoading || !searchTerm.trim()
              ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
              : 'bg-[#FF8C42] hover:bg-[#FF7A2B] text-white cursor-pointer'
          }`}>
            {isLoading ? 'Searching...' : 'Search'}
          </div>
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#FF8C42] border-t-transparent"></div>
            <span className="text-gray-300 text-sm">Searching for haircut images...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
          {!GOOGLE_API_KEY && (
            <p className="text-red-300 text-xs mt-2">
              Please configure VITE_GOOGLE_IMAGES_API_KEY in your .env.local file
            </p>
          )}
        </div>
      )}

      {/* Image Results Grid */}
      {images.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            Found {images.length} haircut images for "{searchTerm}"
          </p>
          <div className="grid grid-cols-2 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative bg-gray-800/30 rounded-xl overflow-hidden border border-gray-600/30 hover:border-[#FF8C42]/50 transition-all duration-200 cursor-pointer"
                onClick={() => handleImageClick(image)}
              >
                <div className="aspect-square relative">
                  <img
                    src={image.thumbnail}
                    alt={image.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.target.parentElement.innerHTML = `
                        <div class="w-full h-full flex items-center justify-center bg-gray-700/50">
                          <div class="text-gray-400 text-xs text-center p-2">
                            <div class="w-8 h-8 mx-auto mb-2 opacity-50">
                              <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                              </svg>
                            </div>
                            Image unavailable
                          </div>
                        </div>
                      `
                    }}
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                  
                  {/* External link icon */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="bg-black/50 rounded-full p-1">
                      <ExternalLink className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
                
                {/* Image Info */}
                <div className="p-3">
                  <p className="text-white text-xs font-medium truncate mb-1">
                    {image.title}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {image.source}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!isLoading && !error && images.length === 0 && searchTerm && (
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 opacity-50">
            <Image className="w-full h-full text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm">
            No haircut images found for "{searchTerm}"
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Try different search terms like "fade", "undercut", or "pompadour"
          </p>
        </div>
      )}

      {/* API Attribution */}
      <div className="text-center pt-4 border-t border-gray-700/30">
        <p className="text-gray-500 text-xs">
          Powered by Google Custom Search API
        </p>
      </div>
    </div>
  )
}

export default HaircutImageSearch