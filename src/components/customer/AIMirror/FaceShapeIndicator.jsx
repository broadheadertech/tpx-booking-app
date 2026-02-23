import { FACE_SHAPE_INFO } from '../../../hooks/useFaceShape';

/**
 * FaceShapeIndicator — Reusable badge showing detected face shape
 */
export default function FaceShapeIndicator({ shape, confidence, size = 'default', showDetails = false }) {
  if (!shape) return null;

  const info = FACE_SHAPE_INFO[shape];
  if (!info) return null;

  const confidencePct = Math.round((confidence || 0) * 100);

  if (size === 'compact') {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
        <span className="text-sm">{info.icon}</span>
        <span className="text-xs font-medium text-white">{info.label}</span>
        <span className="text-[10px] text-white/60">{confidencePct}%</span>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] rounded-2xl p-4 border border-white/10">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
          {info.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-lg">{info.label}</span>
            <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
              {confidencePct}% match
            </span>
          </div>
          <p className="text-white/50 text-xs mt-0.5">{info.description}</p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="mb-2">
            <p className="text-[10px] text-green-400/70 uppercase tracking-wider font-medium mb-1">Best Styles</p>
            <div className="flex flex-wrap gap-1">
              {info.bestStyles.map((style) => (
                <span key={style} className="text-[11px] px-2 py-0.5 bg-green-500/10 text-green-300 rounded-full border border-green-500/20">
                  {style}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-red-400/70 uppercase tracking-wider font-medium mb-1">Avoid</p>
            <div className="flex flex-wrap gap-1">
              {info.avoidStyles.map((style) => (
                <span key={style} className="text-[11px] px-2 py-0.5 bg-red-500/10 text-red-300 rounded-full border border-red-500/20">
                  {style}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
