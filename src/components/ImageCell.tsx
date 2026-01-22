import type { ImageSprite, ViewMode } from '../types';
import { rgbToHex } from '../lib/colorSpace';
import { getDisplayName } from '../lib/imageData';

interface Props {
  image: ImageSprite | null;
  viewMode: ViewMode;
  isDragging: boolean;
  isDragOver: boolean;
  isHovered: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

export function ImageCell({
  image,
  viewMode,
  isDragging,
  isDragOver,
  isHovered,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: Props) {
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
          transition-all duration-150
          ${isDragging ? 'opacity-10 scale-95' : ''}
          ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800 opacity-50' : ''}
        `}
      />
    );
  }

  const { main, second, third } = image.colors;
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
        group transition-all duration-150
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-800' : ''}
        ${isHovered ? 'ring-2 ring-white/50 z-10' : ''}
      `}
    >
      {viewMode === 'sprites' ? (
        <>
          {/* Sprite image */}
          <img
            src={image.imagePath}
            alt={displayName}
            className="w-full h-full object-contain"
            draggable={false}
          />

          {/* Color bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 flex h-2 rounded-b overflow-hidden">
            <div
              className="flex-1"
              style={{ backgroundColor: rgbToHex(main.rgb) }}
              title={`Main: ${main.position}`}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: rgbToHex(second.rgb) }}
              title={`2nd: ${second.position}`}
            />
            <div
              className="flex-1"
              style={{ backgroundColor: rgbToHex(third.rgb) }}
              title={`3rd: ${third.position}`}
            />
          </div>
        </>
      ) : (
        /* Color blob view - just the colors */
        <div className="w-full h-full flex flex-col rounded overflow-hidden">
          <div
            className="flex-[3]"
            style={{ backgroundColor: rgbToHex(main.rgb) }}
          />
          <div
            className="flex-[2]"
            style={{ backgroundColor: rgbToHex(second.rgb) }}
          />
          <div
            className="flex-1"
            style={{ backgroundColor: rgbToHex(third.rgb) }}
          />
        </div>
      )}

      {/* Hover tooltip */}
      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1 rounded pointer-events-none">
        <span className="text-xs font-bold">{displayName}</span>
        <div className="flex gap-0.5 mt-1">
          <div
            className="w-3 h-3 rounded-sm border border-white/30"
            style={{ backgroundColor: rgbToHex(main.rgb) }}
          />
          <div
            className="w-3 h-3 rounded-sm border border-white/30"
            style={{ backgroundColor: rgbToHex(second.rgb) }}
          />
          <div
            className="w-3 h-3 rounded-sm border border-white/30"
            style={{ backgroundColor: rgbToHex(third.rgb) }}
          />
        </div>
      </div>
    </div>
  );
}
