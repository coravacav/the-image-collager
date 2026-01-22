import type { ImageLocation, SwapRecord, RGBColor } from '../types';

// State code format: v3:<imageSetHash>:<seed>:<inclusionBase64>:<swapsBase64>:<colorOverridesBase64>
// imageSetHash: hash of sorted filenames to detect mismatched image sets

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
  const inclusionBytes = packBits(inclusionMask);
  const swapBytes = encodeSwaps(swaps);
  const colorOverrideBytes = encodeColorOverrides(colorOverrides);

  const inclusionBase64 = toBase64(inclusionBytes);
  const swapsBase64 = toBase64(swapBytes);
  const colorOverridesBase64 = toBase64(colorOverrideBytes);

  return `v3:${imageSetHash}:${seed}:${inclusionBase64}:${swapsBase64}:${colorOverridesBase64}`;
}

// Decode a state code string back to data
export function decodeStateCode(code: string, filenames: string[]): StateCodeData | null {
  try {
    const parts = code.split(':');
    if (parts[0] !== 'v3' || parts.length !== 6) return null;

    const codeHash = parts[1];
    const currentHash = hashImageSet(filenames);
    const hashMismatch = codeHash !== currentHash;

    const seed = parseInt(parts[2], 10);
    if (isNaN(seed)) return null;

    const inclusionBytes = fromBase64(parts[3]);
    const inclusionMask = unpackBits(inclusionBytes, filenames.length);

    const swapBytes = fromBase64(parts[4]);
    const swaps = decodeSwaps(swapBytes);

    const colorOverrideBytes = fromBase64(parts[5]);
    const colorOverrides = decodeColorOverrides(colorOverrideBytes);

    return { seed, inclusionMask, swaps, colorOverrides, hashMismatch };
  } catch {
    return null;
  }
}

// Validate a state code format (doesn't check if it applies to current images)
export function isValidStateCode(code: string): boolean {
  const parts = code.split(':');
  if (parts[0] !== 'v3' || parts.length !== 6) return false;

  const seed = parseInt(parts[2], 10);
  if (isNaN(seed)) return false;

  return true;
}
