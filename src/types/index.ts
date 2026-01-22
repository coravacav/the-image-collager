export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface LABColor {
  l: number;
  a: number;
  b: number;
}

export interface OKLCHColor {
  l: number;  // Lightness 0-1
  c: number;  // Chroma 0-0.4+
  h: number;  // Hue 0-360
}

export type ColorPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface RankedColor {
  color: OKLCHColor;
  rgb: RGBColor;
  position: ColorPosition;
  pixelCount: number;
}

export interface ImageSprite {
  filename: string;
  imagePath: string;
  colors: RankedColor[];
  allColors: RankedColor[];  // Always 5 colors from k-means clustering
  totalPixels: number;       // Total non-filtered pixels for threshold calculation
}

export interface ColorExtractionSettings {
  numColors: number;  // 1-5
  smartDetection: boolean;
  smartThreshold: number;  // 0-1, percentage of pixels required for a color to be considered "primary"
}

export interface GridPosition {
  row: number;
  col: number;
}

export type ImageLocation =
  | { type: 'grid'; row: number; col: number }
  | { type: 'bucket'; index: number };

export interface SwapRecord {
  from: ImageLocation;
  to: ImageLocation;
}

export interface ArrangementState {
  grid: (ImageSprite | null)[][];
  bucket: ImageSprite[];
  rows: number;
  cols: number;
}

export type SortAxis = 'hue' | 'lightness' | 'chroma';

export interface ArrangementParams {
  sortAxis: SortAxis;
  entropyFactor: number;
  neighborRadius: number;
  squareSmoothing: boolean;
  seed: number;
}

export type ImageSourceMode = 'default' | 'custom';

// Maps "filename:colorIndex" to RGB override
export type ColorOverrides = Map<string, RGBColor>;
