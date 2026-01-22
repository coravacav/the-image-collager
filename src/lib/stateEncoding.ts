import type { ImageLocation, SwapRecord, RGBColor } from '../types';

// State code format: <seed4>:<inclusionBase64>:<swapsBase64>:<colorOverridesBase64>:<imageSetHash>
// seed4: 4-character base36 seed (36^4 = 1,679,616 combinations)
// imageSetHash: hash of sorted filenames to detect mismatched image sets (at end for readability)

// Max seed value for 4 base36 characters
export const MAX_SEED = 36 ** 4 - 1; // 1,679,615

// Convert seed number to 4-character base36 string
export function seedToString(seed: number): string {
  return seed.toString(36).padStart(4, '0');
}

// Convert 4-character base36 string to seed number
export function stringToSeed(str: string): number {
  return parseInt(str, 36);
}

// Generate a random seed
export function randomSeed(): number {
  return Math.floor(Math.random() * (MAX_SEED + 1));
}

// Simple hash function for image set (djb2 algorithm)
export function hashImageSet(filenames: string[]): string {
  const sorted = [...filenames].sort();
  const combined = sorted.join('|');
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
    hash = hash >>> 0; // Convert to unsigned 32-bit
  }
  return hash.toString(36); // Base36 for compact representation
}
// - seed: the random seed number
// - inclusionBase64: bitmap of which images are in grid (1) vs bucket (0)
// - swapsBase64: encoded list of swaps applied after base arrangement

// Pack an array of booleans into a Uint8Array (bit packing)
export function packBits(bits: boolean[]): Uint8Array {
  const byteCount = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(byteCount);

  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) {
      bytes[Math.floor(i / 8)] |= (1 << (7 - (i % 8)));
    }
  }

  return bytes;
}

// Unpack a Uint8Array back into an array of booleans
export function unpackBits(bytes: Uint8Array, count: number): boolean[] {
  const bits: boolean[] = [];

  for (let i = 0; i < count; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = 7 - (i % 8);
    bits.push(byteIndex < bytes.length && (bytes[byteIndex] & (1 << bitIndex)) !== 0);
  }

  return bits;
}

// Encode a location as 2 bytes: type (1 bit) + index/row,col (15 bits)
function encodeLocation(loc: ImageLocation): [number, number] {
  if (loc.type === 'bucket') {
    // Type 0 = bucket, 15 bits for index
    return [0, loc.index & 0x7FFF];
  } else {
    // Type 1 = grid, 7 bits for row, 8 bits for col
    const packed = ((loc.row & 0x7F) << 8) | (loc.col & 0xFF);
    return [1, packed];
  }
}

// Decode a location from type and packed value
function decodeLocation(type: number, packed: number): ImageLocation {
  if (type === 0) {
    return { type: 'bucket', index: packed };
  } else {
    return {
      type: 'grid',
      row: (packed >> 8) & 0x7F,
      col: packed & 0xFF,
    };
  }
}

// Encode swaps as bytes: each swap = 6 bytes (type1, val1_hi, val1_lo, type2, val2_hi, val2_lo)
export function encodeSwaps(swaps: SwapRecord[]): Uint8Array {
  if (swaps.length === 0) return new Uint8Array(0);

  const bytes = new Uint8Array(swaps.length * 6);

  for (let i = 0; i < swaps.length; i++) {
    const [type1, val1] = encodeLocation(swaps[i].from);
    const [type2, val2] = encodeLocation(swaps[i].to);

    bytes[i * 6 + 0] = type1;
    bytes[i * 6 + 1] = (val1 >> 8) & 0xFF;
    bytes[i * 6 + 2] = val1 & 0xFF;
    bytes[i * 6 + 3] = type2;
    bytes[i * 6 + 4] = (val2 >> 8) & 0xFF;
    bytes[i * 6 + 5] = val2 & 0xFF;
  }

  return bytes;
}

// Decode swaps from bytes
export function decodeSwaps(bytes: Uint8Array): SwapRecord[] {
  if (bytes.length === 0) return [];

  const swaps: SwapRecord[] = [];

  for (let i = 0; i + 5 < bytes.length; i += 6) {
    const type1 = bytes[i];
    const val1 = (bytes[i + 1] << 8) | bytes[i + 2];
    const type2 = bytes[i + 3];
    const val2 = (bytes[i + 4] << 8) | bytes[i + 5];

    swaps.push({
      from: decodeLocation(type1, val1),
      to: decodeLocation(type2, val2),
    });
  }

  return swaps;
}

// Color override format: each override = 6 bytes
// - imageIndex (2 bytes): index in sorted image list
// - colorIndex (1 byte): which color slot (0-4)
// - R, G, B (3 bytes): the override color

export interface ColorOverrideEntry {
  imageIndex: number;
  colorIndex: number;
  rgb: RGBColor;
}

export function encodeColorOverrides(overrides: ColorOverrideEntry[]): Uint8Array {
  if (overrides.length === 0) return new Uint8Array(0);

  const bytes = new Uint8Array(overrides.length * 6);

  for (let i = 0; i < overrides.length; i++) {
    const { imageIndex, colorIndex, rgb } = overrides[i];
    bytes[i * 6 + 0] = (imageIndex >> 8) & 0xFF;
    bytes[i * 6 + 1] = imageIndex & 0xFF;
    bytes[i * 6 + 2] = colorIndex & 0xFF;
    bytes[i * 6 + 3] = rgb.r & 0xFF;
    bytes[i * 6 + 4] = rgb.g & 0xFF;
    bytes[i * 6 + 5] = rgb.b & 0xFF;
  }

  return bytes;
}

export function decodeColorOverrides(bytes: Uint8Array): ColorOverrideEntry[] {
  if (bytes.length === 0) return [];

  const overrides: ColorOverrideEntry[] = [];

  for (let i = 0; i + 5 < bytes.length; i += 6) {
    overrides.push({
      imageIndex: (bytes[i] << 8) | bytes[i + 1],
      colorIndex: bytes[i + 2],
      rgb: {
        r: bytes[i + 3],
        g: bytes[i + 4],
        b: bytes[i + 5],
      },
    });
  }

  return overrides;
}

// Convert Uint8Array to URL-safe base64
function toBase64(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert URL-safe base64 to Uint8Array
function fromBase64(str: string): Uint8Array {
  // Handle empty string
  if (!str) return new Uint8Array(0);

  // Restore standard base64 characters
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);

  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return new Uint8Array(0);
  }
}

export interface StateCodeData {
  seed: number;
  inclusionMask: boolean[];
  swaps: SwapRecord[];
  colorOverrides: ColorOverrideEntry[];
  hashMismatch: boolean;
}

// Encode state to a state code string
export function encodeStateCode(
  filenames: string[],
  seed: number,
  inclusionMask: boolean[],
  swaps: SwapRecord[],
  colorOverrides: ColorOverrideEntry[] = []
): string {
  const imageSetHash = hashImageSet(filenames);

  // If all images are included, use empty string for compactness
  const allIncluded = inclusionMask.every(v => v);
  const inclusionBase64 = allIncluded ? '' : toBase64(packBits(inclusionMask));

  const swapsBase64 = toBase64(encodeSwaps(swaps));
  const colorOverridesBase64 = toBase64(encodeColorOverrides(colorOverrides));

  return `${seedToString(seed)}:${inclusionBase64}:${swapsBase64}:${colorOverridesBase64}:${imageSetHash}`;
}

// Decode a state code string back to data
export function decodeStateCode(code: string, filenames: string[]): StateCodeData | null {
  try {
    const parts = code.split(':');
    if (parts.length !== 5) return null;

    const seed = stringToSeed(parts[0]);
    if (isNaN(seed) || seed < 0 || seed > MAX_SEED) return null;

    // Empty inclusion string means all images included
    const inclusionMask = parts[1]
      ? unpackBits(fromBase64(parts[1]), filenames.length)
      : filenames.map(() => true);

    const swapBytes = fromBase64(parts[2]);
    const swaps = decodeSwaps(swapBytes);

    const colorOverrideBytes = fromBase64(parts[3]);
    const colorOverrides = decodeColorOverrides(colorOverrideBytes);

    const codeHash = parts[4];
    const currentHash = hashImageSet(filenames);
    const hashMismatch = codeHash !== currentHash;

    return { seed, inclusionMask, swaps, colorOverrides, hashMismatch };
  } catch {
    return null;
  }
}

// Validate a state code format (doesn't check if it applies to current images)
export function isValidStateCode(code: string): boolean {
  const parts = code.split(':');
  if (parts.length !== 5) return false;

  // Seed should be alphanumeric (base36)
  if (!/^[0-9a-z]+$/i.test(parts[0])) return false;

  const seed = stringToSeed(parts[0]);
  if (isNaN(seed) || seed < 0 || seed > MAX_SEED) return false;

  return true;
}
