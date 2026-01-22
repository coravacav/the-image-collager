import { useState, useRef } from 'react';
import type { ImageSprite, ViewMode, ImageLocation, RGBColor } from '../types';
import { rgbToHex, hexToRgb } from '../lib/colorSpace';
import { getDisplayName } from '../lib/imageData';

interface Props {
  images: ImageSprite[];
  viewMode: ViewMode;
  onSwap: (from: ImageLocation, to: ImageLocation) => void;
  draggedLocation: ImageLocation | null;
  onDragStart: (location: ImageLocation) => void;
  onDragEnd: () => void;
  colorOverrides: Map<string, RGBColor>;
  onColorChange: (filename: string, colorIndex: number, rgb: RGBColor) => void;
}

export function ImageBucket({
  images,
  viewMode,
  onSwap,
  draggedLocation,
  onDragStart,
  onDragEnd,
  colorOverrides,
  onColorChange,
}: Props) {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Get color overrides map for a specific image
  const getImageColorOverrides = (image: ImageSprite): Map<number, RGBColor> => {
    const map = new Map<number, RGBColor>();
    for (const [key, rgb] of colorOverrides) {
      const [filename, indexStr] = key.split(':');
      if (filename === image.filename) {
        map.set(parseInt(indexStr, 10), rgb);
      }
    }
    return map;
  };

  const handleDragStart = (index: number) => {
    onDragStart({ type: 'bucket', index });
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => {
    if (draggedLocation) {
      const to: ImageLocation = { type: 'bucket', index };
      // Don't swap if dropping on self
      if (draggedLocation.type === 'bucket' && draggedLocation.index === index) {
        setDragOverIndex(null);
        return;
      }
      onSwap(draggedLocation, to);
    }
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    onDragEnd();
  };

  // Handle drop on the bucket container itself (for adding to end)
  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedLocation && draggedLocation.type === 'grid') {
      // Dropping from grid to bucket - add to end
      onSwap(draggedLocation, { type: 'bucket', index: images.length });
    }
  };

  if (images.length === 0 && !draggedLocation) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 mt-4">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
      >
        <span className={`transform transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>
          ▶
        </span>
        <span>Bucket ({images.length} images)</span>
      </button>

      {!isCollapsed && (
        <div
          className="flex flex-wrap gap-2 min-h-[60px] p-2 bg-gray-700/50 rounded"
          onDragOver={handleContainerDragOver}
          onDrop={handleContainerDrop}
        >
          {images.length === 0 ? (
            <div className="w-full text-center text-gray-500 text-sm py-4">
              Drag images here to remove from grid
            </div>
          ) : (
            images.map((image, index) => {
              const isDragging = draggedLocation?.type === 'bucket' && draggedLocation.index === index;
              const isDragOver = dragOverIndex === index;

              return (
                <BucketItem
                  key={`${image.filename}-${index}`}
                  image={image}
                  viewMode={viewMode}
                  isDragging={isDragging}
                  isDragOver={isDragOver}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(index)}
                  onDragEnd={handleDragEnd}
                  colorOverrides={getImageColorOverrides(image)}
                  onColorChange={(colorIndex, rgb) => onColorChange(image.filename, colorIndex, rgb)}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

interface BucketItemProps {
  image: ImageSprite;
  viewMode: ViewMode;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
  colorOverrides: Map<number, RGBColor>;
  onColorChange: (colorIndex: number, rgb: RGBColor) => void;
}

function BucketItem({
  image,
  viewMode,
  isDragging,
  isDragOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  colorOverrides,
  onColorChange,
}: BucketItemProps) {
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const colors = image.colors;
  const displayName = getDisplayName(image.filename);

  // Get effective color (with override if present)
  const getEffectiveColor = (index: number): RGBColor => {
    return colorOverrides.get(index) ?? colors[index].rgb;
  };

  // Calculate flex weights for color blob view (decreasing importance)
  const getFlexWeight = (index: number, total: number): number => {
    if (total === 1) return 1;
    return total - index;
  };

  const handleColorClick = (e: React.MouseEvent, colorIndex: number) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingColorIndex(colorIndex);
    setTimeout(() => colorInputRef.current?.click(), 0);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingColorIndex !== null) {
      const rgb = hexToRgb(e.target.value);
      onColorChange(editingColorIndex, rgb);
    }
    setEditingColorIndex(null);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`
        relative w-12 h-12 bg-gray-700 rounded cursor-grab active:cursor-grabbing
        ring-1 ring-white/20 group transition-all duration-150
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''}
      `}
    >
      {/* Hidden color input */}
      <input
        ref={colorInputRef}
        type="color"
        className="sr-only"
        value={editingColorIndex !== null ? rgbToHex(getEffectiveColor(editingColorIndex)) : '#000000'}
        onChange={handleColorChange}
      />

      {viewMode === 'sprites' ? (
        <img
          src={image.imagePath}
          alt={displayName}
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="w-full h-full flex flex-col rounded overflow-hidden">
          {colors.map((_, i) => (
            <div
              key={i}
              style={{
                flex: getFlexWeight(i, colors.length),
                backgroundColor: rgbToHex(getEffectiveColor(i)),
              }}
            />
          ))}
        </div>
      )}

      {/* Hover tooltip with color edit */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center rounded z-10">
        <span className="text-[10px] font-bold text-center px-0.5 pointer-events-none">{displayName}</span>
        <div className="flex gap-0.5 mt-1">
          {colors.map((_, i) => {
            const effectiveRgb = getEffectiveColor(i);
            const hasOverride = colorOverrides.has(i);
            return (
              <div
                key={i}
                className={`
                  w-3 h-3 rounded-sm cursor-pointer hover:scale-110 transition-transform
                  ${hasOverride ? 'border border-yellow-400' : 'border border-white/40'}
                `}
                style={{ backgroundColor: rgbToHex(effectiveRgb) }}
                onClick={(e) => handleColorClick(e, i)}
                title="Click to edit"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
