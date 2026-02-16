import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Award, X } from 'lucide-react'

const CertificationLightbox = ({ cert, onClose }) => {
  const imageUrl = useQuery(
    api.services.barbers.getImageUrl,
    cert?.imageId ? { storageId: cert.imageId } : 'skip'
  )

  if (!cert) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-5 h-5 text-white" />
      </button>

      <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={cert.name}
            className="w-full max-h-[70vh] rounded-xl object-contain"
          />
        ) : (
          <div className="flex items-center justify-center h-40 bg-[#1A1A1A] rounded-xl border border-amber-500/20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-400 border-t-transparent" />
          </div>
        )}
        <div className="mt-4 text-center">
          <p className="text-white text-sm bg-black/50 px-4 py-2 rounded-lg inline-flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            {cert.name}
          </p>
        </div>
      </div>
    </div>
  )
}

export default CertificationLightbox
