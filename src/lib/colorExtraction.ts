import type { RGBColor, ColorPosition, RankedColor, ColorExtractionSettings } from '../types';
import { rgbToOklch, colorDistanceLab } from './colorSpace';

export const DEFAULT_COLOR_SETTINGS: ColorExtractionSettings = {
  numColors: 3,
  smartDetection: false,
  smartThreshold: 0.1,  // 10% of pixels
};

interface PixelData {
  color: RGBColor;
  x: number;
  y: number;
}

// Load image and extract pixel data, returning a blob URL for local caching
export async function extractPixelData(imagePath: string): Promise<{
  pixels: PixelData[];
  width: number;
  height: number;
  blobUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const pixels: PixelData[] = [];

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent pixels
        if (a < 128) continue;

        // Skip near-white
        if (r > 240 && g > 240 && b > 240) continue;

        // Skip near-black
        if (r < 15 && g < 15 && b < 15) continue;

        // Skip very desaturated grays
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const avg = (r + g + b) / 3;
        if (max - min < 20 && avg > 180) continue;

        const pixelIndex = i / 4;
        const x = pixelIndex % img.width;
        const y = Math.floor(pixelIndex / img.width);

        pixels.push({ color: { r, g, b }, x, y });
      }

      // Convert canvas to blob URL for local caching (no more network requests)
      canvas.toBlob((blob) => {
        if (blob) {
          const blobUrl = URL.createObjectURL(blob);
          resolve({ pixels, width: img.width, height: img.height, blobUrl });
        } else {
          // Fallback to original path if blob creation fails
          resolve({ pixels, width: img.width, height: img.height, blobUrl: imagePath });
        }
      }, 'image/png');
    };

    img.onerror = () => reject(new Error(`Failed to load image: ${imagePath}`));
    img.src = imagePath;
  });
}

// K-means++ initialization for better starting centroids
function initializeCentroidsKMeansPlusPlus(pixels: PixelData[], k: number): RGBColor[] {
  const centroids: RGBColor[] = [];

  // Pick first centroid randomly
  const firstIdx = Math.floor(Math.random() * pixels.length);
  centroids.push({ ...pixels[firstIdx].color });

  // Pick remaining centroids with probability proportional to distance squared
  for (let i = 1; i < k; i++) {
    const distances: number[] = pixels.map(p => {
      const minDist = Math.min(...centroids.map(c => colorDistanceLab(p.color, c)));
      return minDist * minDist;
    });

    const totalDist = distances.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalDist;

    for (let j = 0; j < pixels.length; j++) {
      random -= distances[j];
      if (random <= 0) {
        centroids.push({ ...pixels[j].color });
        break;
      }
    }

    // Fallback if we didn't pick one
    if (centroids.length === i) {
      centroids.push({ ...pixels[Math.floor(Math.random() * pixels.length)].color });
    }
  }

  return centroids;
}

// K-means clustering
function kMeansClustering(
  pixels: PixelData[],
  k: number = 3,
  maxIterations: number = 20
): { centroid: RGBColor; pixels: PixelData[] }[] {
  if (pixels.length < k) {
    // Not enough pixels, return what we have
    return pixels.map(p => ({ centroid: p.color, pixels: [p] }));
  }

  let centroids = initializeCentroidsKMeansPlusPlus(pixels, k);
  let clusters: PixelData[][] = Array.from({ length: k }, () => []);

  for (let iter = 0; iter < maxIterations; iter++) {
    // Clear clusters
    clusters = Array.from({ length: k }, () => []);

    // Assign each pixel to nearest centroid
    for (const pixel of pixels) {
      let minDist = Infinity;
      let closestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistanceLab(pixel.color, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      clusters[closestIdx].push(pixel);
    }

    // Update centroids
    const newCentroids = centroids.map((oldCentroid, i) => {
      const cluster = clusters[i];
      if (cluster.length === 0) return oldCentroid;

      return {
        r: Math.round(cluster.reduce((s, p) => s + p.color.r, 0) / cluster.length),
        g: Math.round(cluster.reduce((s, p) => s + p.color.g, 0) / cluster.length),
        b: Math.round(cluster.reduce((s, p) => s + p.color.b, 0) / cluster.length),
      };
    });

    centroids = newCentroids;
  }

  return centroids.map((centroid, i) => ({
    centroid,
    pixels: clusters[i],
  }));
}

// Determine the spatial position of a color cluster
function computeColorPosition(
  pixels: PixelData[],
  width: number,
  height: number
): ColorPosition {
  if (pixels.length === 0) return 'center';

  const avgX = pixels.reduce((s, p) => s + p.x, 0) / pixels.length;
  const avgY = pixels.reduce((s, p) => s + p.y, 0) / pixels.length;

  const midX = width / 2;
  const midY = height / 2;

  // Calculate distance from center
  const dx = avgX - midX;
  const dy = avgY - midY;

  // Threshold for being "center" (within 25% of image size from center)
  const threshold = Math.min(width, height) * 0.25;

  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return 'center';
  }

  // Determine primary direction
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  } else {
    return dy > 0 ? 'bottom' : 'top';
  }
}

// Extract all 5 colors from an image (always extracts max for caching)
export async function extractColors(imagePath: string): Promise<{
  allColors: RankedColor[];
  totalPixels: number;
  blobUrl: string;
}> {
  const { pixels, width, height, blobUrl } = await extractPixelData(imagePath);

  if (pixels.length === 0) {
    // Fallback for images with no valid pixels
    const defaultColor: RankedColor = {
      color: { l: 0.5, c: 0, h: 0 },
      rgb: { r: 128, g: 128, b: 128 },
      position: 'center',
      pixelCount: 0,
    };
    return { allColors: [defaultColor], totalPixels: 0, blobUrl };
  }

  // Always extract 5 colors for caching
  const clusters = kMeansClustering(pixels, 5);
  const totalPixels = pixels.length;

  // Sort by pixel count (most pixels = main color)
  const allColors = clusters
    .map(cluster => ({
      rgb: cluster.centroid,
      color: rgbToOklch(cluster.centroid),
      position: computeColorPosition(cluster.pixels, width, height),
      pixelCount: cluster.pixels.length,
    }))
    .sort((a, b) => b.pixelCount - a.pixelCount);

  return { allColors, totalPixels, blobUrl };
}

// Derive active colors from cached data based on current settings
export function deriveActiveColors(
  allColors: RankedColor[],
  totalPixels: number,
  settings: ColorExtractionSettings
): RankedColor[] {
  if (allColors.length === 0) {
    return [{
      color: { l: 0.5, c: 0, h: 0 },
      rgb: { r: 128, g: 128, b: 128 },
      position: 'center',
      pixelCount: 0,
    }];
  }

  if (settings.smartDetection) {
    // Filter to only colors that meet the threshold
    const thresholdCount = totalPixels * settings.smartThreshold;
    const filtered = allColors.filter(c => c.pixelCount >= thresholdCount);

    // Ensure at least one color
    return filtered.length > 0 ? filtered : [allColors[0]];
  } else {
    // Fixed number: take exactly numColors (pad with gray if needed)
    const result = [...allColors];
    while (result.length < settings.numColors) {
      result.push({
        color: { l: 0.5, c: 0, h: 0 },
        rgb: { r: 128, g: 128, b: 128 },
        position: 'center',
        pixelCount: 0,
      });
    }
    return result.slice(0, settings.numColors);
  }
}
