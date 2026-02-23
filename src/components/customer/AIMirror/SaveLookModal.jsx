import { useState } from 'react';
import { X, Heart, Calendar, MessageSquare } from 'lucide-react';

/**
 * SaveLookModal — Save composite image with notes and Book CTA
 */
export default function SaveLookModal({
  isOpen,
  onClose,
  onSave,
  onBookStyle,
  compositeUrl,
  hairstyleName,
  compatibilityScore,
  saving = false,
}) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(notes);
    setNotes('');
  };

  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1A1A1A] rounded-t-3xl border-t border-white/10 p-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Save This Look</h3>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 text-white/60 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden bg-black mb-4">
          {compositeUrl ? (
            <img src={compositeUrl} alt="Your look" className="w-full aspect-[4/3] object-cover" />
          ) : (
            <div className="w-full aspect-[4/3] flex items-center justify-center text-white/20 text-sm">
              Generating preview...
            </div>
          )}
        </div>

        {/* Style info */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-medium">{hairstyleName || 'Unknown Style'}</p>
            {compatibilityScore != null && (
              <p className="text-white/40 text-xs">
                {compatibilityScore}% compatibility with your face shape
              </p>
            )}
          </div>
          <Heart size={18} className="text-pink-400" />
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-white/50 text-xs mb-1 flex items-center gap-1">
            <MessageSquare size={10} />
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Try this at my next visit..."
            maxLength={200}
            rows={2}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-white text-black font-semibold rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save to My Looks'}
          </button>
          {onBookStyle && (
            <button
              onClick={() => onBookStyle(hairstyleName)}
              className="flex items-center gap-1.5 px-4 py-3 bg-green-500/20 text-green-400 font-medium rounded-xl hover:bg-green-500/30 transition-colors border border-green-500/30"
            >
              <Calendar size={14} />
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
