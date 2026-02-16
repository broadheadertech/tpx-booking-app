import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { FileText, User } from 'lucide-react'
import { normalizeCerts } from '../../utils/certifications'
import CertificationTag from '../common/CertificationTag'

const BioApprovalQueue = ({ branchId, onReviewBarber }) => {
  const pendingReviews = useQuery(
    api.services.barbers.getPendingBioReviews,
    branchId ? { branch_id: branchId } : "skip"
  )

  if (pendingReviews === undefined) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--color-primary)] border-t-transparent" />
      </div>
    )
  }

  if (!pendingReviews || pendingReviews.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
        <h3 className="text-sm font-medium text-white mb-1">No Pending Bio Reviews</h3>
        <p className="text-xs text-gray-500">All barber bios are up to date.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white">Pending Bio Reviews</h3>
        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
          {pendingReviews.length} pending
        </span>
      </div>

      {pendingReviews.map((review) => (
        <div
          key={review._id}
          className="bg-[#171717] rounded-xl p-4 border border-amber-500/20 hover:border-amber-500/40 transition-colors"
        >
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-lg bg-[#2A2A2A] flex items-center justify-center flex-shrink-0 overflow-hidden">
              {review.avatar ? (
                <img src={review.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-gray-500" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{review.full_name}</p>

              {/* Pending bio preview */}
              {review.pending_bio && (
                <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                  "{review.pending_bio}"
                </p>
              )}

              {/* Pending certifications */}
              {review.pending_certifications?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {normalizeCerts(review.pending_certifications).map((cert, i) => (
                    <CertificationTag key={i} cert={cert} size="xs" />
                  ))}
                </div>
              )}
            </div>

            {/* Review button */}
            <button
              onClick={() => onReviewBarber?.(review)}
              className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-medium hover:bg-amber-500/30 transition-colors flex-shrink-0"
            >
              Review
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

export default BioApprovalQueue
