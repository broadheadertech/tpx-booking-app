/**
 * Mirror Overlay Service — Canvas overlay engine for hairstyle try-on
 *
 * Positions a transparent hairstyle PNG on top of a video feed using
 * face mesh landmarks for alignment. Generates composite images for saving.
 */

/**
 * Key anchor landmarks for hairstyle positioning:
 *   10  — Forehead top center (top of hairstyle)
 *   152 — Chin (bottom reference)
 *   234 — Left temple
 *   454 — Right temple
 *   54  — Left forehead edge
 *   284 — Right forehead edge
 */

/**
 * Draw the video frame to canvas
 */
export function drawVideoFrame(ctx, video, canvas) {
  ctx.save();
  // Mirror the video for selfie mode
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

/**
 * Calculate overlay position from face landmarks
 * Returns { x, y, width, height, rotation } for the hairstyle image
 */
export function calculateOverlayPosition(landmarks, canvasWidth, canvasHeight) {
  if (!landmarks || landmarks.length < 468) return null;

  // Convert normalized coords to pixel coords
  const toPixel = (lm) => ({
    x: (1 - lm.x) * canvasWidth, // Mirror for selfie
    y: lm.y * canvasHeight,
  });

  const foreheadTop = toPixel(landmarks[10]);
  const chin = toPixel(landmarks[152]);
  const leftTemple = toPixel(landmarks[234]);
  const rightTemple = toPixel(landmarks[454]);
  const leftForehead = toPixel(landmarks[54]);
  const rightForehead = toPixel(landmarks[284]);

  // Face dimensions
  const faceWidth = Math.abs(rightTemple.x - leftTemple.x);
  const faceHeight = Math.abs(chin.y - foreheadTop.y);

  // Hairstyle should be wider than the face and extend above forehead
  const overlayWidth = faceWidth * 1.6;
  const overlayHeight = faceHeight * 0.9;

  // Center X between temples
  const centerX = (leftTemple.x + rightTemple.x) / 2;

  // Position Y: top of forehead, shifted up to show hair above head
  const topY = foreheadTop.y - overlayHeight * 0.55;

  // Calculate rotation from temple angle
  const dx = rightTemple.x - leftTemple.x;
  const dy = rightTemple.y - leftTemple.y;
  const rotation = Math.atan2(dy, dx);

  return {
    x: centerX - overlayWidth / 2,
    y: topY,
    width: overlayWidth,
    height: overlayHeight,
    rotation,
    centerX,
    centerY: topY + overlayHeight / 2,
  };
}

/**
 * Draw hairstyle overlay on canvas
 */
export function drawHairstyleOverlay(ctx, overlayImage, position, opacity = 0.9) {
  if (!overlayImage || !position) return;

  ctx.save();

  // Apply rotation around center point
  ctx.translate(position.centerX, position.centerY);
  ctx.rotate(position.rotation);
  ctx.globalAlpha = opacity;

  ctx.drawImage(
    overlayImage,
    -position.width / 2,
    -(position.centerY - position.y),
    position.width,
    position.height
  );

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Draw face shape debug visualization (optional, for development)
 */
export function drawLandmarkDebug(ctx, landmarks, canvasWidth, canvasHeight) {
  if (!landmarks) return;

  const keyPoints = [10, 152, 234, 454, 54, 284, 172, 397, 132, 361];

  ctx.save();
  keyPoints.forEach((idx) => {
    const lm = landmarks[idx];
    const x = (1 - lm.x) * canvasWidth;
    const y = lm.y * canvasHeight;

    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#00ff00';
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.fillText(idx.toString(), x + 5, y - 5);
  });
  ctx.restore();
}

/**
 * Generate a composite image (video frame + hairstyle overlay)
 * Returns a Blob
 */
export async function generateCompositeImage(
  video,
  landmarks,
  overlayImage,
  width = 640,
  height = 480
) {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');

  // Draw video frame
  drawVideoFrame(ctx, video, offscreen);

  // Draw hairstyle overlay
  const position = calculateOverlayPosition(landmarks, width, height);
  if (position && overlayImage) {
    drawHairstyleOverlay(ctx, overlayImage, position);
  }

  return new Promise((resolve) => {
    offscreen.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
  });
}

/**
 * Load an image from URL and return an HTMLImageElement
 */
export function loadOverlayImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * Full render loop: video + overlay + optional debug
 */
export function renderFrame(ctx, video, canvas, landmarks, overlayImage, showDebug = false) {
  drawVideoFrame(ctx, video, canvas);

  if (landmarks) {
    const position = calculateOverlayPosition(landmarks, canvas.width, canvas.height);
    if (position && overlayImage) {
      drawHairstyleOverlay(ctx, overlayImage, position);
    }
    if (showDebug) {
      drawLandmarkDebug(ctx, landmarks, canvas.width, canvas.height);
    }
  }
}
