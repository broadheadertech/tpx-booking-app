/**
 * Video Source Abstraction Layer
 *
 * Provides a unified interface for different video input sources.
 * The attendance kiosk uses this to get video frames for face detection,
 * regardless of whether the source is a browser camera, IP camera, or
 * a dedicated FR device.
 *
 * Each source must implement:
 *   start(videoElement) → Promise<boolean>  — Attach stream to the video element
 *   stop()                                  — Release resources
 *   getType()           → string            — Source identifier
 *
 * Supported sources (via ?source= URL param):
 *   "browser"  — Default. Uses navigator.mediaDevices.getUserMedia (front camera)
 *   "mjpeg"    — IP camera MJPEG stream. Requires ?stream=<URL>.
 *                Draws MJPEG frames to a hidden canvas piped into the video element.
 *   "rtsp"     — (Future) RTSP stream via WebRTC proxy or ffmpeg relay
 *   "device"   — (Future) Native SDK bridge for ZKTeco/Hikvision/Suprema terminals
 *
 * Usage:
 *   const source = createVideoSource('browser')
 *   const ok = await source.start(videoElement)
 *   // ... face detection runs on videoElement ...
 *   source.stop()
 */

// ── Browser Camera (default) ──

class BrowserCameraSource {
  constructor(options = {}) {
    this.stream = null
    this.facingMode = options.facingMode || 'user'
    this.width = options.width || 640
    this.height = options.height || 480
  }

  async start(videoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Camera not available. Requires HTTPS or localhost.')
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: this.facingMode,
        width: { ideal: this.width },
        height: { ideal: this.height },
      },
      audio: false,
    })

    videoElement.srcObject = this.stream
    await videoElement.play()
    return true
  }

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop())
      this.stream = null
    }
  }

  getType() { return 'browser' }
}

// ── MJPEG IP Camera Stream ──

class MJPEGSource {
  constructor(options = {}) {
    this.streamUrl = options.streamUrl
    this.img = null
    this.canvas = null
    this.intervalId = null
    this.fps = options.fps || 5
  }

  async start(videoElement) {
    if (!this.streamUrl) {
      throw new Error('MJPEG source requires a stream URL (?stream=<url>)')
    }

    // Create hidden img element for MJPEG stream
    this.img = document.createElement('img')
    this.img.crossOrigin = 'anonymous'
    this.img.style.display = 'none'
    document.body.appendChild(this.img)

    // Create canvas to pipe frames into a captureStream for the video element
    this.canvas = document.createElement('canvas')
    this.canvas.width = 640
    this.canvas.height = 480
    const ctx = this.canvas.getContext('2d')

    return new Promise((resolve, reject) => {
      this.img.onload = () => {
        // Once first frame loads, start drawing loop
        this.canvas.width = this.img.naturalWidth || 640
        this.canvas.height = this.img.naturalHeight || 480

        this.intervalId = setInterval(() => {
          ctx.drawImage(this.img, 0, 0)
        }, 1000 / this.fps)

        // Pipe canvas to video element via captureStream
        const canvasStream = this.canvas.captureStream(this.fps)
        videoElement.srcObject = canvasStream
        videoElement.play().then(() => resolve(true)).catch(reject)
      }

      this.img.onerror = () => {
        reject(new Error(`Failed to load MJPEG stream from: ${this.streamUrl}`))
      }

      this.img.src = this.streamUrl
    })
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    if (this.img) {
      this.img.remove()
      this.img = null
    }
    this.canvas = null
  }

  getType() { return 'mjpeg' }
}

// ── Factory ──

const SOURCE_TYPES = {
  browser: BrowserCameraSource,
  mjpeg: MJPEGSource,
  // Future: rtsp, device, etc.
}

/**
 * Create a video source instance.
 * @param {string} type - Source type: 'browser' | 'mjpeg'
 * @param {object} options - Source-specific options
 * @returns {BrowserCameraSource | MJPEGSource}
 */
export function createVideoSource(type = 'browser', options = {}) {
  const SourceClass = SOURCE_TYPES[type]
  if (!SourceClass) {
    console.warn(`Unknown video source "${type}", falling back to browser camera`)
    return new BrowserCameraSource(options)
  }
  return new SourceClass(options)
}

/**
 * Parse video source config from URL search params.
 * @param {URLSearchParams} params
 * @returns {{ type: string, options: object }}
 */
export function parseVideoSourceFromURL(params) {
  const type = params.get('source') || 'browser'
  const options = {}

  if (type === 'mjpeg') {
    options.streamUrl = params.get('stream')
    if (params.get('fps')) options.fps = parseInt(params.get('fps'), 10)
  }

  if (params.get('facing')) {
    options.facingMode = params.get('facing') // 'user' or 'environment'
  }

  return { type, options }
}
