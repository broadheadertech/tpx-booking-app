import { useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, AlertCircle, Loader2 } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useCurrentUser } from '../../hooks/useCurrentUser'

const ImageUploadInput = ({ label, value, onChange, disabled, placeholder = 'Click to upload image' }) => {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(value || '')
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)
  const { sessionToken } = useCurrentUser()
  
  const generateUploadUrl = useMutation(api.services.branding.generateUploadUrl)
  const getImageUrl = useMutation(api.services.branding.getImageUrl)

  const validateFile = (file) => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif']
    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload JPG, PNG, WebP, SVG, or GIF.'
    }

    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return 'File too large. Maximum size is 5MB.'
    }

    return null
  }

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')

    // Validate
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setUploading(true)

    try {
      // Generate upload URL (convert null to undefined for Convex validation)
      const uploadUrl = await generateUploadUrl({ sessionToken: sessionToken || undefined })

      // Upload file
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      const { storageId } = await result.json()

      // Get the URL for the uploaded file
      const imageUrl = await getImageUrl({ sessionToken: sessionToken || undefined, storageId })

      // Update preview and notify parent
      setPreview(imageUrl)
      onChange(imageUrl)

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError(err.message || 'Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleClear = () => {
    setPreview('')
    onChange('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        
        <div className="mt-2">
          {preview ? (
            // Preview mode
            <div className="relative">
              <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-20 w-20 rounded-lg border border-white/10 object-contain bg-white/5"
                  onError={() => setError('Failed to load image preview')}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{preview}</p>
                  <p className="text-xs text-gray-400 mt-1">Image uploaded successfully</p>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-red-400"
                    title="Remove image"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Upload mode
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,image/gif"
                onChange={handleFileSelect}
                disabled={disabled || uploading}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || uploading}
                className="w-full flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-6 py-8 transition hover:border-white/30 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
                    <p className="text-sm font-medium text-white">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-[var(--color-primary)]/10 p-4">
                      <ImageIcon className="h-6 w-6 text-[var(--color-primary)]" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-white">
                        <span className="text-[var(--color-primary)]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        JPG, PNG, WebP, SVG or GIF (max 5MB)
                      </p>
                    </div>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Manual URL input fallback */}
        {!preview && (
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-2">Or enter URL manually:</p>
            <input
              type="text"
              value={value || ''}
              onChange={(e) => {
                onChange(e.target.value)
                setPreview(e.target.value)
              }}
              disabled={disabled || uploading}
              placeholder={placeholder}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/60 disabled:opacity-60"
            />
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2">
            <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
      </label>
    </div>
  )
}

export default ImageUploadInput
