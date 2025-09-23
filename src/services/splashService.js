import { SplashScreen } from "@capacitor/splash-screen";

class SplashService {
  constructor() {
    this.isVisible = false;
  }

  /**
   * Show the splash screen
   * @param {Object} options - Splash screen options
   */
  async show(options = {}) {
    try {
      const defaultOptions = {
        autoHide: false,
        showDuration: 3000,
        fadeInDuration: 500,
        fadeOutDuration: 500,
        backgroundColor: '#0a0a0a',
      };

      const config = { ...defaultOptions, ...options };

      await SplashScreen.show(config);
      this.isVisible = true;

      console.log("Splash screen shown");
    } catch (error) {
      console.error("Error showing splash screen:", error);
    }
  }

  /**
   * Hide the splash screen
   * @param {Object} options - Hide options
   */
  async hide(options = {}) {
    try {
      const defaultOptions = {
        fadeOutDuration: 500,
      };

      const config = { ...defaultOptions, ...options };

      await SplashScreen.hide(config);
      this.isVisible = false;

      console.log("Splash screen hidden");
    } catch (error) {
      console.error("Error hiding splash screen:", error);
      // Fallback: force hide after timeout
      setTimeout(() => {
        this.isVisible = false;
      }, 1000);
    }
  }

  /**
   * Auto hide splash screen after delay
   * @param {number} delay - Delay in milliseconds
   */
  async autoHide(delay = 2000) {
    setTimeout(async () => {
      if (this.isVisible) {
        await this.hide();
      }
    }, delay);
  }

  /**
   * Check if splash screen is currently visible
   * @returns {boolean}
   */
  isSplashVisible() {
    return this.isVisible;
  }

  /**
   * Initialize splash screen for app startup
   */
  async initialize() {
    try {
      // Show splash screen immediately
      await this.show({
        autoHide: false,
        fadeInDuration: 300,
      });

      // Auto hide after app loads
      await this.autoHide(2500);

      return true;
    } catch (error) {
      console.error("Failed to initialize splash screen:", error);
      return false;
    }
  }
}

// Export singleton instance
export const splashService = new SplashService();
export default splashService;
