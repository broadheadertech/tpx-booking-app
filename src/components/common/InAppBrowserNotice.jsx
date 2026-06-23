import { useState } from 'react'
import { AlertTriangle, Copy, Check } from 'lucide-react'

/**
 * Detect common in-app / embedded browsers (Messenger, Facebook, Instagram,
 * Line, TikTok, etc.). Google blocks OAuth sign-in inside these webviews with
 * "Error 403: disallowed_useragent", so we warn the user to open in their real
 * browser — or just use email/password, which works fine in a webview.
 */
export function isInAppBrowser() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  return /FBAN|FBAV|FB_IAB|FBIOS|Messenger|Instagram|Line\/|MicroMessenger|Twitter|TikTok|Snapchat|Pinterest|\bGSA\b/i.test(ua)
}

export default function InAppBrowserNotice() {
  const [copied, setCopied] = useState(false)
  if (!isInAppBrowser()) return null

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard may be unavailable in some webviews — ignore
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
        <div className="text-sm">
          <p className="font-semibold text-amber-100">Open in your browser to use Google sign-in</p>
          <p className="mt-1 text-amber-200/90 leading-relaxed">
            You're in an in-app browser (e.g. Messenger). Google blocks its sign-in here.
            Tap the <span className="font-semibold">•••</span> menu and choose{' '}
            <span className="font-semibold">"Open in Browser"</span> — or just sign in with your
            <span className="font-semibold"> email &amp; password</span> below, which works here.
          </p>
          <button
            onClick={copyLink}
            className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-100 text-xs font-medium hover:bg-amber-500/30 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Link copied — paste in your browser' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  )
}
