import { useState } from 'react'
import { X, Tag, Sparkles, Bug, Zap, AlertTriangle } from 'lucide-react'
import { APP_VERSION, LAST_DEPLOY, CHANGELOG } from '../../config/version'

const TAG_CONFIG = {
  feature:  { label: 'New',     icon: Sparkles,      bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  fix:      { label: 'Fix',     icon: Bug,           bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30' },
  improve:  { label: 'Improved',icon: Zap,           bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  breaking: { label: 'Breaking',icon: AlertTriangle, bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30' },
}

const ChangeBadge = ({ tag }) => {
  const cfg = TAG_CONFIG[tag] || TAG_CONFIG.improve
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  )
}

const ChangelogModal = ({ isOpen, onClose }) => {
  const [expandedVersion, setExpandedVersion] = useState(CHANGELOG[0]?.version)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#1A1A1A] border border-[#333] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#333]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)]/15 rounded-lg">
              <Tag className="w-5 h-5 text-[var(--color-primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Changelog</h2>
              <p className="text-xs text-gray-500">v{APP_VERSION} &middot; {LAST_DEPLOY}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#333] transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Version guide */}
        <div className="px-6 py-3 border-b border-[#333]/50 bg-[#111]">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Versioning:</strong>{' '}
            <span className="text-orange-400">Major</span> = big overhauls &middot;{' '}
            <span className="text-blue-400">Minor</span> = new features &middot;{' '}
            <span className="text-gray-400">Patch</span> = fixes & tweaks
          </p>
        </div>

        {/* Changelog list */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {CHANGELOG.map((release) => {
            const isExpanded = expandedVersion === release.version
            const isCurrent = release.version === APP_VERSION
            return (
              <div key={release.version} className={`rounded-xl border ${isCurrent ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/5' : 'border-[#333] bg-[#222]/50'}`}>
                <button
                  onClick={() => setExpandedVersion(isExpanded ? null : release.version)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-mono font-bold text-sm ${isCurrent ? 'text-[var(--color-primary)]' : 'text-white'}`}>
                      v{release.version}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{release.date}</span>
                    <span className={`text-gray-500 text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-2">
                    {release.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <ChangeBadge tag={change.tag} />
                        <span className="text-sm text-gray-300 leading-snug pt-0.5">{change.text}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ChangelogModal
