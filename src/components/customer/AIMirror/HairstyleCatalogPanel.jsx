import { useState, useMemo } from 'react';
import { Search, X, Star, TrendingUp, Filter } from 'lucide-react';

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'fade', label: 'Fade' },
  { id: 'undercut', label: 'Undercut' },
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
  { id: 'long', label: 'Long' },
  { id: 'buzz', label: 'Buzz' },
  { id: 'textured', label: 'Textured' },
];

/**
 * HairstyleCatalogPanel — Bottom sheet grid of hairstyles sorted by face compatibility
 */
export default function HairstyleCatalogPanel({
  hairstyles = [],
  selectedId,
  onSelect,
  faceShape,
  isOpen,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const filtered = useMemo(() => {
    let items = [...hairstyles];

    if (activeCategory !== 'all') {
      items = items.filter((h) => h.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          (h.style_tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    return items;
  }, [hairstyles, activeCategory, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[60vh] bg-[#0F0F0F]/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 flex flex-col">
      {/* Handle bar */}
      <div className="flex justify-center pt-2 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Header */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">
          Hairstyles
          {faceShape && (
            <span className="text-white/40 font-normal ml-1">
              for {faceShape} face
            </span>
          )}
        </h3>
        <button onClick={onClose} className="p-1.5 rounded-full bg-white/10 text-white/60 hover:text-white">
          <X size={14} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pb-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search styles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-colors ${
              activeCategory === cat.id
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center text-white/30 text-xs py-8">No hairstyles found</div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((style) => {
              const isSelected = selectedId === style._id;
              const score = style.compatibilityScore ?? style.face_shape_scores?.[faceShape] ?? null;

              return (
                <button
                  key={style._id}
                  onClick={() => onSelect(style)}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                    isSelected
                      ? 'border-white shadow-lg shadow-white/10 scale-[1.02]'
                      : 'border-transparent hover:border-white/20'
                  }`}
                >
                  <div className="aspect-[3/4] bg-white/5">
                    <img
                      src={style.thumbnailUrl || style.overlayUrl}
                      alt={style.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Name + score overlay */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 pt-4">
                    <p className="text-[10px] text-white font-medium truncate">{style.name}</p>
                    {score !== null && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <Star size={8} className={score >= 70 ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'} />
                        <span className={`text-[9px] ${score >= 70 ? 'text-yellow-400' : 'text-white/40'}`}>
                          {score}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Trending badge */}
                  {style.try_count > 50 && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-500/80 rounded-full">
                      <TrendingUp size={8} className="text-white" />
                      <span className="text-[8px] text-white font-medium">Hot</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
