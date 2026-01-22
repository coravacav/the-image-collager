import type { ImageSprite, ArrangementState, ArrangementParams, SortAxis, ImageLocation } from '../types';
import { colorDistanceOklch } from './colorSpace';

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Compute a sorting score based on the chosen axis
// Uses primary color for sorting, but arrangement optimization considers all colors
function computeColorScore(image: ImageSprite, axis: SortAxis): number {
  if (image.colors.length === 0) {
    return axis === 'lightness' ? 0.5 : 0;
  }

  const color = image.colors[0].color;

  switch (axis) {
    case 'hue':
      return color.h;
    case 'lightness':
      return color.l;
    case 'chroma':
      return color.c;
    default:
      return color.h;
  }
}

// Apply controlled randomness for "pockets of color"
function applyEntropy(
  sorted: ImageSprite[],
  entropy: number,
  rng: () => number
): ImageSprite[] {
  if (entropy === 0) return sorted;

  const result = [...sorted];
  const swapCount = Math.floor(sorted.length * entropy * 0.3);

  for (let i = 0; i < swapCount; i++) {
    const idx = Math.floor(rng() * result.length);
    const windowSize = Math.floor(5 + entropy * 15);
    const offset = Math.floor(rng() * windowSize * 2) - windowSize;
    const swapIdx = Math.max(0, Math.min(result.length - 1, idx + offset));

    [result[idx], result[swapIdx]] = [result[swapIdx], result[idx]];
  }

  return result;
}

// Find the minimum color distance between any pair of colors from two images
// This allows images sharing ANY similar color to be considered good neighbors
function minColorDistance(a: ImageSprite, b: ImageSprite): number {
  let minDist = Infinity;

  for (const colorA of a.colors) {
    for (const colorB of b.colors) {
      const dist = colorDistanceOklch(colorA.color, colorB.color);
      if (dist < minDist) {
        minDist = dist;
      }
    }
  }

  return minDist === Infinity ? 0 : minDist;
}

// Calculate how well a cell matches its neighbors (lower = better)
// When square=false, only orthogonal neighbors are considered (cross pattern)
// When square=true, all neighbors in the square are considered
function neighborEnergy(
  grid: (ImageSprite | null)[][],
  row: number,
  col: number,
  radius: number,
  square: boolean
): number {
  const cell = grid[row][col];
  if (!cell || cell.colors.length === 0) return 0;

  let totalDist = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;
      // Skip diagonal neighbors if not using square mode
      if (!square && dr !== 0 && dc !== 0) continue;

      const nr = row + dr;
      const nc = col + dc;

      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
        const neighbor = grid[nr][nc];
        if (neighbor && neighbor.colors.length > 0) {
          totalDist += minColorDistance(cell, neighbor);
          count++;
        }
      }
    }
  }

  return count > 0 ? totalDist / count : 0;
}

// Simulated annealing to improve local color smoothness
function optimizeLocalSmoothness(
  grid: (ImageSprite | null)[][],
  radius: number,
  square: boolean,
  rng: () => number,
  iterations: number = 1000
): void {
  if (radius === 0) return;

  const rows = grid.length;
  const cols = grid[0].length;

  // Find all non-null positions
  const positions: [number, number][] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c]) positions.push([r, c]);
    }
  }

  if (positions.length < 2) return;

  for (let i = 0; i < iterations; i++) {
    // Pick two random positions
    const idx1 = Math.floor(rng() * positions.length);
    const idx2 = Math.floor(rng() * positions.length);
    if (idx1 === idx2) continue;

    const [r1, c1] = positions[idx1];
    const [r2, c2] = positions[idx2];

    // Calculate current energy
    const currentEnergy =
      neighborEnergy(grid, r1, c1, radius, square) +
      neighborEnergy(grid, r2, c2, radius, square);

    // Swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];

    // Calculate new energy
    const newEnergy =
      neighborEnergy(grid, r1, c1, radius, square) +
      neighborEnergy(grid, r2, c2, radius, square);

    // Accept if better, or with probability based on temperature
    const temperature = 1 - i / iterations;
    if (newEnergy > currentEnergy && rng() > temperature * 0.5) {
      // Reject - swap back
      [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];
    }
  }
}

// Main arrangement function
export function arrangeImages(
  images: ImageSprite[],
  rows: number,
  cols: number,
  params: ArrangementParams,
  inclusionMask?: boolean[]
): ArrangementState {
  const rng = seededRandom(params.seed);

  // Score and sort
  const scored = images.map((img, i) => ({
    image: img,
    index: i,
    score: computeColorScore(img, params.sortAxis),
  }));
  scored.sort((a, b) => a.score - b.score);

  // Apply inclusion mask if provided - filter to only included images
  let gridImages: ImageSprite[];
  let bucketImages: ImageSprite[];

  if (inclusionMask && inclusionMask.length === images.length) {
    // Separate images based on inclusion mask (in sorted order)
    gridImages = [];
    bucketImages = [];
    for (const s of scored) {
      if (inclusionMask[s.index]) {
        gridImages.push(s.image);
      } else {
        bucketImages.push(s.image);
      }
    }
  } else {
    // No mask - put what fits in grid, rest in bucket
    const totalCells = rows * cols;
    const sorted = scored.map(s => s.image);
    gridImages = sorted.slice(0, totalCells);
    bucketImages = sorted.slice(totalCells);
  }

  // Apply entropy to grid images
  const shuffled = applyEntropy(gridImages, params.entropyFactor, rng);

  // Create grid
  const grid: (ImageSprite | null)[][] = Array.from(
    { length: rows },
    () => Array(cols).fill(null)
  );

  // Place images into grid (left-to-right, top-to-bottom)
  let idx = 0;
  for (let r = 0; r < rows && idx < shuffled.length; r++) {
    for (let c = 0; c < cols && idx < shuffled.length; c++) {
      grid[r][c] = shuffled[idx++];
    }
  }

  // Optimize local smoothness
  if (params.neighborRadius > 0) {
    optimizeLocalSmoothness(grid, params.neighborRadius, params.squareSmoothing, rng, 2000);
  }

  return { grid, bucket: bucketImages, rows, cols };
}

// Swap two images in the grid (legacy - use applySwap for unified handling)
export function swapInGrid(
  arrangement: ArrangementState,
  pos1: { row: number; col: number },
  pos2: { row: number; col: number }
): ArrangementState {
  const newGrid = arrangement.grid.map(row => [...row]);

  const temp = newGrid[pos1.row][pos1.col];
  newGrid[pos1.row][pos1.col] = newGrid[pos2.row][pos2.col];
  newGrid[pos2.row][pos2.col] = temp;

  return {
    ...arrangement,
    grid: newGrid,
  };
}

// Unified swap function for grid↔grid, grid↔bucket, bucket↔bucket
export function applySwap(
  arrangement: ArrangementState,
  from: ImageLocation,
  to: ImageLocation
): ArrangementState {
  const newGrid = arrangement.grid.map(row => [...row]);
  const newBucket = [...arrangement.bucket];

  // Get images at both locations
  let fromImage: ImageSprite | null;
  let toImage: ImageSprite | null;

  if (from.type === 'grid') {
    fromImage = newGrid[from.row]?.[from.col] ?? null;
  } else {
    fromImage = newBucket[from.index] ?? null;
  }

  if (to.type === 'grid') {
    toImage = newGrid[to.row]?.[to.col] ?? null;
  } else {
    toImage = newBucket[to.index] ?? null;
  }

  // Apply the swap
  if (from.type === 'grid') {
    newGrid[from.row][from.col] = toImage;
  } else {
    if (toImage) {
      newBucket[from.index] = toImage;
    } else {
      // If swapping with null/empty grid cell, remove from bucket
      newBucket.splice(from.index, 1);
    }
  }

  if (to.type === 'grid') {
    newGrid[to.row][to.col] = fromImage;
  } else {
    if (fromImage) {
      if (to.index < newBucket.length) {
        newBucket[to.index] = fromImage;
      } else {
        // Append to bucket if index is beyond current length
        newBucket.push(fromImage);
      }
    }
  }

  return {
    ...arrangement,
    grid: newGrid,
    bucket: newBucket,
  };
}

// Get image at a location
export function getImageAtLocation(
  arrangement: ArrangementState,
  location: ImageLocation
): ImageSprite | null {
  if (location.type === 'grid') {
    return arrangement.grid[location.row]?.[location.col] ?? null;
  } else {
    return arrangement.bucket[location.index] ?? null;
  }
}
