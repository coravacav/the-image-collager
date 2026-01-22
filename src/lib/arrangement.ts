import type { ImageSprite, ArrangementState, ArrangementParams, SortAxis } from '../types';
import { colorDistanceOklch } from './colorSpace';

// Seeded random number generator for reproducibility
function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
}

// Compute a sorting score based on the chosen axis
function computeColorScore(image: ImageSprite, axis: SortAxis): number {
  const color = image.colors.main.color;

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

// Calculate how well a cell matches its neighbors (lower = better)
function neighborEnergy(
  grid: (ImageSprite | null)[][],
  row: number,
  col: number,
  radius: number
): number {
  const cell = grid[row][col];
  if (!cell) return 0;

  let totalDist = 0;
  let count = 0;

  for (let dr = -radius; dr <= radius; dr++) {
    for (let dc = -radius; dc <= radius; dc++) {
      if (dr === 0 && dc === 0) continue;

      const nr = row + dr;
      const nc = col + dc;

      if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
        const neighbor = grid[nr][nc];
        if (neighbor) {
          totalDist += colorDistanceOklch(cell.colors.main.color, neighbor.colors.main.color);
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
      neighborEnergy(grid, r1, c1, radius) +
      neighborEnergy(grid, r2, c2, radius);

    // Swap
    [grid[r1][c1], grid[r2][c2]] = [grid[r2][c2], grid[r1][c1]];

    // Calculate new energy
    const newEnergy =
      neighborEnergy(grid, r1, c1, radius) +
      neighborEnergy(grid, r2, c2, radius);

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
  params: ArrangementParams
): ArrangementState {
  const rng = seededRandom(params.seed);

  // Score and sort
  const scored = images.map(img => ({
    image: img,
    score: computeColorScore(img, params.sortAxis),
  }));
  scored.sort((a, b) => a.score - b.score);

  // Extract sorted images
  const sorted = scored.map(s => s.image);

  // Apply entropy
  const shuffled = applyEntropy(sorted, params.entropyFactor, rng);

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
    optimizeLocalSmoothness(grid, params.neighborRadius, rng, 2000);
  }

  return { grid, rows, cols };
}

// Swap two images in the grid
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
