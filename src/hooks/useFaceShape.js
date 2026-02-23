import { useMemo, useRef, useCallback } from 'react';

/**
 * Face Shape Classification from MediaPipe Face Mesh (468 landmarks)
 *
 * Key landmarks:
 *   10  — Forehead top center
 *   152 — Chin bottom
 *   234 — Left temple
 *   454 — Right temple
 *   172 — Left jaw angle
 *   397 — Right jaw angle
 *   54  — Left forehead
 *   284 — Right forehead
 *   132 — Left cheekbone
 *   361 — Right cheekbone
 */

const FACE_SHAPES = ['oval', 'round', 'square', 'heart', 'diamond', 'oblong'];

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function classifyFaceShape(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;

  // Measure key distances
  const foreheadWidth = distance(landmarks[54], landmarks[284]);
  const cheekboneWidth = distance(landmarks[132], landmarks[361]);
  const jawWidth = distance(landmarks[172], landmarks[397]);
  const faceLength = distance(landmarks[10], landmarks[152]);

  // Calculate ratios
  const lengthToWidth = faceLength / cheekboneWidth;
  const jawToCheek = jawWidth / cheekboneWidth;
  const foreheadToJaw = foreheadWidth / jawWidth;
  const foreheadToCheek = foreheadWidth / cheekboneWidth;

  // Score each shape
  const scores = {};

  // Oval: length > width, balanced jaw, smooth proportions
  scores.oval = 0;
  if (lengthToWidth > 1.2 && lengthToWidth < 1.6) scores.oval += 30;
  if (jawToCheek > 0.7 && jawToCheek < 0.9) scores.oval += 30;
  if (foreheadToJaw > 1.0 && foreheadToJaw < 1.3) scores.oval += 20;
  if (foreheadToCheek > 0.85 && foreheadToCheek < 1.05) scores.oval += 20;

  // Round: length ≈ width, wide soft jaw
  scores.round = 0;
  if (lengthToWidth > 0.9 && lengthToWidth < 1.2) scores.round += 30;
  if (jawToCheek > 0.85) scores.round += 30;
  if (Math.abs(foreheadToCheek - jawToCheek) < 0.1) scores.round += 20;
  if (cheekboneWidth > jawWidth * 0.95) scores.round += 20;

  // Square: length ≈ width, angular strong jaw (jaw ≈ cheekbones)
  scores.square = 0;
  if (lengthToWidth > 0.95 && lengthToWidth < 1.25) scores.square += 25;
  if (jawToCheek > 0.9) scores.square += 30;
  if (foreheadToCheek > 0.9 && foreheadToCheek < 1.1) scores.square += 25;
  if (Math.abs(foreheadWidth - jawWidth) / cheekboneWidth < 0.1) scores.square += 20;

  // Heart: wide forehead, narrow jaw, pointed chin
  scores.heart = 0;
  if (foreheadToJaw > 1.2) scores.heart += 35;
  if (foreheadToCheek > 0.95) scores.heart += 25;
  if (jawToCheek < 0.8) scores.heart += 25;
  if (lengthToWidth > 1.1 && lengthToWidth < 1.5) scores.heart += 15;

  // Diamond: wide cheekbones, narrow forehead + jaw
  scores.diamond = 0;
  if (foreheadToCheek < 0.85) scores.diamond += 30;
  if (jawToCheek < 0.8) scores.diamond += 30;
  if (cheekboneWidth > foreheadWidth && cheekboneWidth > jawWidth) scores.diamond += 25;
  if (lengthToWidth > 1.1 && lengthToWidth < 1.5) scores.diamond += 15;

  // Oblong: length >> width, straight sides
  scores.oblong = 0;
  if (lengthToWidth > 1.5) scores.oblong += 40;
  if (Math.abs(foreheadToCheek - jawToCheek) < 0.15) scores.oblong += 25;
  if (jawToCheek > 0.75 && jawToCheek < 0.95) scores.oblong += 20;
  if (foreheadToCheek > 0.85 && foreheadToCheek < 1.05) scores.oblong += 15;

  // Find best match
  const maxScore = Math.max(...Object.values(scores));
  const shape = Object.entries(scores).reduce((best, [s, sc]) =>
    sc > best[1] ? [s, sc] : best, ['oval', 0]
  )[0];

  // Confidence: normalize top score (100 = perfect match)
  const confidence = Math.min(1, maxScore / 100);

  return {
    shape,
    confidence,
    scores,
    measurements: {
      jaw_width: jawWidth,
      forehead_width: foreheadWidth,
      cheekbone_width: cheekboneWidth,
      face_length: faceLength,
    },
  };
}

// Recommendations per face shape
const FACE_SHAPE_INFO = {
  oval: {
    label: 'Oval',
    icon: '🥚',
    description: 'Balanced proportions, slightly longer than wide',
    bestStyles: ['Textured crop', 'Quiff', 'Pompadour', 'Side part'],
    avoidStyles: ['Very heavy bangs'],
  },
  round: {
    label: 'Round',
    icon: '🔵',
    description: 'Similar width and length, soft jawline',
    bestStyles: ['Faux hawk', 'High fade', 'Pompadour', 'Angular fringe'],
    avoidStyles: ['Flat sides', 'Bowl cuts'],
  },
  square: {
    label: 'Square',
    icon: '⬜',
    description: 'Strong angular jawline, similar width and length',
    bestStyles: ['French crop', 'Side part', 'Textured fringe', 'Medium length'],
    avoidStyles: ['Very short all over'],
  },
  heart: {
    label: 'Heart',
    icon: '💎',
    description: 'Wider forehead, narrow chin',
    bestStyles: ['Side-swept', 'Textured layers', 'Medium fringe', 'Taper fade'],
    avoidStyles: ['Slicked back tight'],
  },
  diamond: {
    label: 'Diamond',
    icon: '💠',
    description: 'Wide cheekbones, narrow forehead and jaw',
    bestStyles: ['Textured fringe', 'Side part', 'Curtain bangs', 'Messy top'],
    avoidStyles: ['Slicked back', 'Very short sides'],
  },
  oblong: {
    label: 'Oblong',
    icon: '📏',
    description: 'Noticeably longer than wide, straight sides',
    bestStyles: ['Side part', 'Classic taper', 'Textured crop', 'Fringe styles'],
    avoidStyles: ['Extra height on top', 'Very tight sides'],
  },
};

/**
 * useFaceShape — Classifies face shape from MediaPipe landmarks
 * @param {Array} landmarks - 468 face landmarks from useFaceMesh
 */
export default function useFaceShape(landmarks) {
  const historyRef = useRef([]);

  const result = useMemo(() => {
    if (!landmarks) return null;
    return classifyFaceShape(landmarks);
  }, [landmarks]);

  // Stabilize detection over multiple frames
  const getStableShape = useCallback(() => {
    if (!result) return null;

    historyRef.current.push(result.shape);
    if (historyRef.current.length > 15) {
      historyRef.current.shift();
    }

    // Need at least 10 frames
    if (historyRef.current.length < 10) return null;

    // Count occurrences
    const counts = {};
    historyRef.current.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    });

    // Most frequent shape (must be > 60% of frames)
    const [topShape, topCount] = Object.entries(counts).reduce(
      (best, [s, c]) => (c > best[1] ? [s, c] : best),
      ['', 0]
    );

    if (topCount / historyRef.current.length > 0.6) {
      return {
        ...result,
        shape: topShape,
        info: FACE_SHAPE_INFO[topShape],
      };
    }
    return null;
  }, [result]);

  const resetHistory = useCallback(() => {
    historyRef.current = [];
  }, []);

  return {
    instantResult: result,
    getStableShape,
    resetHistory,
    faceShapeInfo: FACE_SHAPE_INFO,
  };
}

export { classifyFaceShape, FACE_SHAPE_INFO, FACE_SHAPES };
