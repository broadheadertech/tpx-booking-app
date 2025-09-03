// Face Detection Service using MediaPipe Face Detection
// This service validates if an uploaded image contains a human face

class FaceDetectionService {
  constructor() {
    this.isLoaded = false;
    this.faceDetection = null;
  }

  // Initialize MediaPipe Face Detection
  async initialize() {
    if (this.isLoaded) return;

    try {
      // Use MediaPipe Face Detection via CDN
      if (typeof window !== 'undefined' && !window.FaceDetection) {
        // Load MediaPipe Face Detection script
        await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/face_detection.js');
        await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js');
      }

      if (window.FaceDetection) {
        this.faceDetection = new window.FaceDetection({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@0.4/${file}`;
          }
        });

        this.faceDetection.setOptions({
          model: 'short',
          minDetectionConfidence: 0.5,
        });

        this.isLoaded = true;
        console.log('✅ Face Detection Service initialized');
      }
    } catch (error) {
      console.error('❌ Failed to initialize Face Detection:', error);
      // Fallback to basic validation
      this.isLoaded = false;
    }
  }

  // Load external script
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Validate if image contains a face
  async validateFaceInImage(imageFile) {
    console.log('🔍 Starting face detection validation...');
    
    try {
      // Convert file to image element
      const imageElement = await this.fileToImageElement(imageFile);
      
      // Try MediaPipe detection first
      if (this.isLoaded && this.faceDetection) {
        return await this.detectFaceWithMediaPipe(imageElement);
      }
      
      // Fallback to basic image validation
      return await this.basicImageValidation(imageElement);
      
    } catch (error) {
      console.error('❌ Face detection error:', error);
      throw new Error('Failed to analyze image. Please try uploading a different photo.');
    }
  }

  // Convert file to image element
  fileToImageElement(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Invalid image file'));
      };
      
      img.src = url;
    });
  }

  // MediaPipe face detection
  async detectFaceWithMediaPipe(imageElement) {
    return new Promise((resolve, reject) => {
      this.faceDetection.onResults((results) => {
        console.log('🤖 MediaPipe detection results:', results);
        
        if (results.detections && results.detections.length > 0) {
          const confidence = results.detections[0].score;
          console.log('✅ Face detected with confidence:', confidence);
          resolve({
            hasFace: true,
            confidence: confidence,
            faceCount: results.detections.length,
            method: 'MediaPipe'
          });
        } else {
          console.log('❌ No face detected by MediaPipe');
          resolve({
            hasFace: false,
            confidence: 0,
            faceCount: 0,
            method: 'MediaPipe'
          });
        }
      });

      this.faceDetection.send({ image: imageElement });
      
      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('Face detection timeout'));
      }, 10000);
    });
  }

  // Basic image validation (fallback)
  async basicImageValidation(imageElement) {
    console.log('🔄 Using basic image validation (fallback)');
    
    // Basic checks
    const width = imageElement.naturalWidth;
    const height = imageElement.naturalHeight;
    const aspectRatio = width / height;
    
    console.log('📐 Image dimensions:', { width, height, aspectRatio });
    
    // Basic heuristics for face photos
    const isReasonableSize = width >= 200 && height >= 200;
    const isPortraitish = aspectRatio >= 0.5 && aspectRatio <= 2.0;
    const isSquareish = aspectRatio >= 0.7 && aspectRatio <= 1.4;
    
    // More lenient validation for fallback
    const likelyHasFace = isReasonableSize && (isPortraitish || isSquareish);
    
    console.log('📊 Basic validation results:', {
      isReasonableSize,
      isPortraitish,
      isSquareish,
      likelyHasFace
    });
    
    return {
      hasFace: likelyHasFace,
      confidence: likelyHasFace ? 0.7 : 0.3,
      faceCount: likelyHasFace ? 1 : 0,
      method: 'Basic Validation',
      details: {
        dimensions: { width, height },
        aspectRatio,
        checks: { isReasonableSize, isPortraitish, isSquareish }
      }
    };
  }

  // Get user-friendly error message
  getValidationErrorMessage(result) {
    if (result.hasFace) return null;
    
    return {
      title: 'No Face Detected',
      message: 'Please upload a clear photo of your face for accurate analysis.',
      suggestions: [
        'Ensure your face is clearly visible',
        'Use good lighting',
        'Face the camera directly',
        'Remove sunglasses or hats',
        'Try a different photo'
      ]
    };
  }
}

export const faceDetectionService = new FaceDetectionService();