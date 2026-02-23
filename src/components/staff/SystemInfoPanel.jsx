import { useState } from 'react'
import { Tag, Sparkles, Bug, Zap, AlertTriangle, Monitor, Calendar, GitBranch } from 'lucide-react'
import { APP_VERSION, LAST_DEPLOY, CHANGELOG, VERSION_INFO } from '../../config/version'

const TAG_CONFIG = {
  feature:  { label: 'New',      icon: Sparkles,      bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  fix:      { label: 'Fix',      icon: Bug,           bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30' },
  improve:  { label: 'Improved', icon: Zap,           bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30' },
  breaking: { label: 'Breaking', icon: AlertTriangle, bg: 'bg-orange-500/15',  text: 'text-orange-400',  border: 'border-orange-500/30' },
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

const SystemInfoPanel = () => {
  const [expandedVersions, setExpandedVersions] = useState([APP_VERSION])

  const toggleVersion = (version) => {
    setExpandedVersions(prev =>
      prev.includes(version) ? prev.filter(v => v !== version) : [...prev, version]
    )
  }

  // Count stats for current version
  const currentRelease = CHANGELOG.find(r => r.version === APP_VERSION)
  const featureCount = currentRelease?.changes.filter(c => c.tag === 'feature').length || 0
  const fixCount = currentRelease?.changes.filter(c => c.tag === 'fix').length || 0
  const improveCount = currentRelease?.changes.filter(c => c.tag === 'improve').length || 0

  return (
    <div className="space-y-6">
      {/* Current version card */}
      <div className="bg-gradient-to-br from-[var(--color-primary)]/10 to-[#1A1A1A] rounded-xl border border-[var(--color-primary)]/30 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[var(--color-primary)]/20 rounded-xl">
              <Tag className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">v{APP_VERSION}</h3>
              <p className="text-sm text-gray-400">Current Version</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#111]/60 rounded-lg p-3 border border-[#333]/50">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Last Deploy</span>
            </div>
            <span className="text-sm font-semibold text-white">{LAST_DEPLOY}</span>
          </div>
          <div className="bg-[#111]/60 rounded-lg p-3 border border-[#333]/50">
            <div className="flex items-center gap-2 mb-1">
              <Monitor className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Environment</span>
            </div>
            <span className="text-sm font-semibold text-white capitalize">{VERSION_INFO.environment}</span>
          </div>
          <div className="bg-[#111]/60 rounded-lg p-3 border border-[#333]/50">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Features</span>
            </div>
            <span className="text-sm font-semibold text-emerald-400">{featureCount}</span>
          </div>
          <div className="bg-[#111]/60 rounded-lg p-3 border border-[#333]/50">
            <div className="flex items-center gap-2 mb-1">
              <Bug className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[10px] text-gray-500 uppercase tracking-wider">Fixes</span>
            </div>
            <span className="text-sm font-semibold text-red-400">{fixCount}</span>
          </div>
        </div>
      </div>

      {/* Versioning guide */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-5">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[var(--color-primary)]" />
          Versioning Guide
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#111] border border-[#333]/50">
            <span className="text-orange-400 font-bold text-lg leading-none mt-0.5">X</span>
            <div>
              <p className="text-xs font-semibold text-orange-400">Major</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Breaking changes, system overhauls, new platforms</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#111] border border-[#333]/50">
            <span className="text-blue-400 font-bold text-lg leading-none mt-0.5">Y</span>
            <div>
              <p className="text-xs font-semibold text-blue-400">Minor</p>
              <p className="text-[11px] text-gray-500 mt-0.5">New features, new pages, significant additions</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#111] border border-[#333]/50">
            <span className="text-gray-400 font-bold text-lg leading-none mt-0.5">Z</span>
            <div>
              <p className="text-xs font-semibold text-gray-400">Patch</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Bug fixes, UI tweaks, small improvements</p>
            </div>
          </div>
        </div>
      </div>

      {/* Full changelog */}
      <div className="bg-[#1A1A1A] rounded-xl border border-[#333] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#333]">
          <h4 className="text-sm font-semibold text-white">Full Changelog</h4>
          <p className="text-xs text-gray-500 mt-0.5">{CHANGELOG.length} release{CHANGELOG.length !== 1 ? 's' : ''} tracked</p>
        </div>

        <div className="divide-y divide-[#333]/50">
          {CHANGELOG.map((release) => {
            const isExpanded = expandedVersions.includes(release.version)
            const isCurrent = release.version === APP_VERSION
            return (
              <div key={release.version}>
                <button
                  onClick={() => toggleVersion(release.version)}
                  className={`w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#222] transition-colors ${isCurrent ? 'bg-[var(--color-primary)]/5' : ''}`}
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
                    <span className="text-xs text-gray-600">{release.changes.length} change{release.changes.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{release.date}</span>
                    <span className={`text-gray-500 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>&#9654;</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 space-y-2.5">
                    {release.changes.map((change, i) => (
                      <div key={i} className="flex items-start gap-2.5 ml-2">
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

export default SystemInfoPanel
