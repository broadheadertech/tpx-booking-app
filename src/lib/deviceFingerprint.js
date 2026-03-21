const STORAGE_KEY = 'kiosk_device_fingerprint'

export function getDeviceFingerprint() {
  let fp = localStorage.getItem(STORAGE_KEY)
  if (fp) return fp

  const components = [
    navigator.userAgent,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency,
    new Date().getTimezoneOffset(),
  ]

  const str = components.join('|')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }

  fp = 'KIOSK-' + Math.abs(hash).toString(36).toUpperCase()
  localStorage.setItem(STORAGE_KEY, fp)
  return fp
}
