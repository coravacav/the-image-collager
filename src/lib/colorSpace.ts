import type { RGBColor, LABColor, OKLCHColor } from '../types';

// sRGB to linear RGB
function srgbToLinear(x: number): number {
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

// Linear RGB to sRGB (kept for potential future use)
// function linearToSrgb(x: number): number {
//   return x <= 0.0031308 ? x * 12.92 : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
// }

// RGB (0-255) to XYZ
function rgbToXyz(rgb: RGBColor): { x: number; y: number; z: number } {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);

  return {
    x: r * 0.4124564 + g * 0.3575761 + b * 0.1804375,
    y: r * 0.2126729 + g * 0.7151522 + b * 0.0721750,
    z: r * 0.0193339 + g * 0.1191920 + b * 0.9503041,
  };
}

// XYZ to LAB
export function rgbToLab(rgb: RGBColor): LABColor {
  const xyz = rgbToXyz(rgb);

  // D65 white point
  const xn = 0.95047;
  const yn = 1.0;
  const zn = 1.08883;

  const fx = xyz.x / xn > 0.008856 ? Math.cbrt(xyz.x / xn) : (7.787 * xyz.x / xn) + 16 / 116;
  const fy = xyz.y / yn > 0.008856 ? Math.cbrt(xyz.y / yn) : (7.787 * xyz.y / yn) + 16 / 116;
  const fz = xyz.z / zn > 0.008856 ? Math.cbrt(xyz.z / zn) : (7.787 * xyz.z / zn) + 16 / 116;

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

// RGB to OKLCH
export function rgbToOklch(rgb: RGBColor): OKLCHColor {
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);

  // Linear RGB to LMS
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  // LMS to OKLab
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
  const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + bOk * bOk);
  let H = Math.atan2(bOk, a) * 180 / Math.PI;
  if (H < 0) H += 360;

  return { l: L, c: C, h: H };
}

// OKLCH to CSS color string
export function oklchToCss(color: OKLCHColor, alpha: number = 1): string {
  return `oklch(${(color.l * 100).toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)} / ${alpha})`;
}

// RGB to CSS hex
export function rgbToHex(rgb: RGBColor): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

// CSS hex to RGB
export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

// Color distance in LAB space (perceptually uniform)
export function colorDistanceLab(c1: RGBColor, c2: RGBColor): number {
  const lab1 = rgbToLab(c1);
  const lab2 = rgbToLab(c2);

  return Math.sqrt(
    Math.pow(lab1.l - lab2.l, 2) +
    Math.pow(lab1.a - lab2.a, 2) +
    Math.pow(lab1.b - lab2.b, 2)
  );
}

// Color distance in OKLCH space
export function colorDistanceOklch(c1: OKLCHColor, c2: OKLCHColor): number {
  // Handle hue wraparound
  let hueDiff = Math.abs(c1.h - c2.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;

  return Math.sqrt(
    Math.pow((c1.l - c2.l) * 100, 2) +
    Math.pow((c1.c - c2.c) * 100, 2) +
    Math.pow(hueDiff, 2)
  );
}
