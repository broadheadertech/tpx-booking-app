import { saveAs } from 'file-saver';
import { toast } from 'react-hot-toast';

class DownloadService {
  constructor() {
    this.downloadQueue = [];
    this.activeDownloads = new Map();
  }

  /**
   * Download the TPX Barbershop APK
   * @param {Object} options - Download options
   * @returns {Promise<void>}
   */
  async downloadAPK(options = {}) {
    const {
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {},
      fileName = 'tipuo-app.apk',
      showToasts = true
    } = options;

    try {
      const apkPath = '/apk/tipuo-app.apk';
      const fullUrl = `${window.location.origin}${apkPath}`;

      if (showToasts) {
        toast.loading('Preparing download...', { id: 'apk-download' });
      }

      // Fetch the APK file
      const response = await fetch(fullUrl);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get content length for progress tracking
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;

      // Create reader for streaming download
      const reader = response.body.getReader();
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        chunks.push(value);
        loaded += value.length;

        // Report progress
        if (total > 0) {
          const progress = Math.round((loaded / total) * 100);
          onProgress(progress);
        }
      }

      // Combine chunks into a single Blob
      const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `TPX-Barbershop-${timestamp}.apk`;

      // Save the file
      saveAs(blob, finalFileName);

      if (showToasts) {
        toast.success('Download completed successfully!', { id: 'apk-download' });
      }

      onComplete();

    } catch (error) {
      console.error('Download failed:', error);

      if (showToasts) {
        toast.error('Download failed. Please try again.', { id: 'apk-download' });
      }

      onError(error);
      throw error;
    }
  }

  /**
   * Direct download using anchor tag (fallback method)
   * @param {string} fileName - Optional custom filename
   */
  directDownload(fileName = 'tipuo-app.apk') {
    try {
      const apkPath = '/apk/tipuo-app.apk';
      const fullUrl = `${window.location.origin}${apkPath}`;

      // Create temporary anchor element
      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = fileName;
      link.style.display = 'none';

      // Add to document, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Download started!');

    } catch (error) {
      console.error('Direct download failed:', error);
      toast.error('Download failed. Please try again.');
    }
  }

  /**
   * Check if APK file exists and is accessible
   * @returns {Promise<boolean>}
   */
  async checkAPKAvailability() {
    try {
      const apkPath = '/apk/tipuo-app.apk';
      const fullUrl = `${window.location.origin}${apkPath}`;

      const response = await fetch(fullUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      console.error('APK availability check failed:', error);
      return false;
    }
  }

  /**
   * Get APK file size
   * @returns {Promise<number>} Size in bytes
   */
  async getAPKSize() {
    try {
      const apkPath = '/apk/tipuo-app.apk';
      const fullUrl = `${window.location.origin}${apkPath}`;

      const response = await fetch(fullUrl, { method: 'HEAD' });

      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : 0;
      }

      return 0;
    } catch (error) {
      console.error('Failed to get APK size:', error);
      return 0;
    }
  }

  /**
   * Format file size to human readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Simulate download progress for UI feedback
   * @param {Function} onProgress - Progress callback
   * @param {number} duration - Simulation duration in ms
   * @returns {Promise<void>}
   */
  simulateDownload(onProgress, duration = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(100, (elapsed / duration) * 100);

        onProgress(Math.round(progress));

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Queue multiple downloads
   * @param {Array} downloads - Array of download configurations
   */
  queueDownloads(downloads) {
    downloads.forEach((config, index) => {
      this.downloadAPK({
        ...config,
        showToasts: false,
        onComplete: () => {
          toast.success(`Download ${index + 1} completed!`);
        }
      });
    });
  }

  /**
   * Cancel active download by ID
   * @param {string} downloadId - Download identifier
   */
  cancelDownload(downloadId) {
    if (this.activeDownloads.has(downloadId)) {
      const controller = this.activeDownloads.get(downloadId);
      controller.abort();
      this.activeDownloads.delete(downloadId);
      toast.info('Download cancelled');
    }
  }

  /**
   * Get download statistics
   * @returns {Object} Download statistics
   */
  getStats() {
    return {
      activeDownloads: this.activeDownloads.size,
      queuedDownloads: this.downloadQueue.length,
      totalDownloads: this.activeDownloads.size + this.downloadQueue.length
    };
  }
}

// Export singleton instance
export const downloadService = new DownloadService();
export default downloadService;
