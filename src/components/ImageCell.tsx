import { useState, useRef } from 'react';
import type { ImageSprite, RGBColor } from '../types';
import { rgbToHex, hexToRgb } from '../lib/colorSpace';
import { getDisplayName } from '../lib/imageData';

interface Props {
  image: ImageSprite | null;
  isDragging: boolean;
  isDragOver: boolean;
  isHovered: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  colorOverrides?: Map<number, RGBColor>;
  onColorChange?: (colorIndex: number, rgb: RGBColor) => void;
}

export function ImageCell({
  image,
  isDragging,
  isDragOver,
  isHovered,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  colorOverrides,
  onColorChange,
}: Props) {
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  // Get the effective color (with override if present)
  const getEffectiveColor = (index: number): RGBColor => {
    if (!image) return { r: 0, g: 0, b: 0 };
    const override = colorOverrides?.get(index);
    return override ?? image.colors[index].rgb;
  };

  const handleColorClick = (e: React.MouseEvent, colorIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingColorIndex(colorIndex);
    // Trigger the hidden color input
    setTimeout(() => colorInputRef.current?.click(), 0);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingColorIndex !== null && onColorChange) {
      const rgb = hexToRgb(e.target.value);
      onColorChange(editingColorIndex, rgb);
    }
    setEditingColorIndex(null);
  };

  if (!image) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
        className={`
          aspect-square bg-gray-700 rounded opacity-30 cursor-grab active:cursor-grabbing
          ring-1 ring-white/20 transition-all duration-150
          ${isDragging ? 'opacity-10 scale-95' : ''}
          ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800 opacity-50' : ''}
        `}
      />
    );
  }

  const colors = image.colors;
  const displayName = getDisplayName(image.filename);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        relative aspect-square bg-gray-700 rounded cursor-grab active:cursor-grabbing
        ring-1 ring-white/20 group transition-all duration-150
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''}
        ${isHovered ? 'ring-2 ring-white/50 z-10' : ''}
      `}
    >
      {/* Hidden color input for the color picker */}
      <input
        ref={colorInputRef}
        type="color"
        className="sr-only"
        value={editingColorIndex !== null ? rgbToHex(getEffectiveColor(editingColorIndex)) : '#000000'}
        onChange={handleColorChange}
      />

      <img
        src={image.imagePath}
        alt={displayName}
        className="w-full h-full object-contain"
        draggable={false}
      />

      {/* Hover tooltip with larger color boxes and edit capability */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 rounded">
        <span className="text-xs font-bold pointer-events-none">{displayName}</span>
        <div className="flex gap-1 mt-1.5">
          {colors.map((_, i) => {
            const effectiveRgb = getEffectiveColor(i);
            const hasOverride = colorOverrides?.has(i);
            return (
              <div
                key={i}
                className={`
                  relative w-5 h-5 rounded-sm border cursor-pointer
                  hover:scale-110 transition-transform
                  ${hasOverride ? 'border-yellow-400 border-2' : 'border-white/40'}
                `}
                style={{ backgroundColor: rgbToHex(effectiveRgb) }}
                onClick={(e) => handleColorClick(e, i)}
                title={`Click to edit color (${rgbToHex(effectiveRgb)})`}
              >
                {/* Pencil icon on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 rounded-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
