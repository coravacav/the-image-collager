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
  colors: {
    main: RankedColor;
    second: RankedColor;
    third: RankedColor;
  };
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface ArrangementState {
  grid: (ImageSprite | null)[][];
  rows: number;
  cols: number;
}

export type SortAxis = 'hue' | 'lightness' | 'chroma';

export interface ArrangementParams {
  sortAxis: SortAxis;
  entropyFactor: number;
  neighborRadius: number;
  seed: number;
}

export type ViewMode = 'sprites' | 'colors';

export type ImageSourceMode = 'default' | 'custom';
