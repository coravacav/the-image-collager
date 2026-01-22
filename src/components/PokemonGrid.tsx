import { useState } from 'react';
import type { ArrangementState, ViewMode, ImageSprite } from '../types';
import { PokemonCell } from './PokemonCell';
import { rgbToHex } from '../lib/colorSpace';

interface Props {
  arrangement: ArrangementState;
  viewMode: ViewMode;
  onSwap: (pos1: { row: number; col: number }, pos2: { row: number; col: number }) => void;
}

export function PokemonGrid({ arrangement, viewMode, onSwap }: Props) {
  const { grid, cols } = arrangement;
  const [draggedPos, setDraggedPos] = useState<{ row: number; col: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ row: number; col: number } | null>(null);
  const [hoveredPos, setHoveredPos] = useState<{ row: number; col: number } | null>(null);

  const handleDragStart = (row: number, col: number) => {
    setDraggedPos({ row, col });
  };

  const handleDragOver = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    setDragOverPos({ row, col });
  };

  const handleDragLeave = () => {
    setDragOverPos(null);
  };

  const handleDrop = (row: number, col: number) => {
    if (draggedPos && (draggedPos.row !== row || draggedPos.col !== col)) {
      onSwap(draggedPos, { row, col });
    }
    setDraggedPos(null);
    setDragOverPos(null);
  };

  const handleDragEnd = () => {
    setDraggedPos(null);
    setDragOverPos(null);
  };

  // Get neighbor at offset from hovered position
  const getNeighbor = (dr: number, dc: number): ImageSprite | null => {
    if (!hoveredPos) return null;
    const nr = hoveredPos.row + dr;
    const nc = hoveredPos.col + dc;
    if (nr >= 0 && nr < grid.length && nc >= 0 && nc < grid[0].length) {
      return grid[nr][nc];
    }
    return null;
  };

  const hoveredImage = hoveredPos ? grid[hoveredPos.row]?.[hoveredPos.col] : null;

  // Calculate connection bar positions
  const renderConnectionBars = () => {
    if (!hoveredPos || !hoveredImage) return null;

    const neighbors = [
      { dr: -1, dc: 0, direction: 'top' },
      { dr: 1, dc: 0, direction: 'bottom' },
      { dr: 0, dc: -1, direction: 'left' },
      { dr: 0, dc: 1, direction: 'right' },
    ];

    return neighbors.map(({ dr, dc, direction }) => {
      const neighbor = getNeighbor(dr, dc);
      if (!neighbor) return null;

      const hoveredColor = rgbToHex(hoveredImage.colors.main.rgb);
      const neighborColor = rgbToHex(neighbor.colors.main.rgb);

      // Calculate position based on grid cell size
      // We'll use CSS to position these
      const row = hoveredPos.row;
      const col = hoveredPos.col;

      let style: React.CSSProperties = {
        position: 'absolute',
        zIndex: 20,
        pointerEvents: 'none',
      };

      // Position and size based on direction
      if (direction === 'top') {
        style = {
          ...style,
          gridRow: row + 1,
          gridColumn: col + 1,
          top: '-4px',
          left: '20%',
          right: '20%',
          height: '8px',
          transform: 'translateY(-50%)',
        };
      } else if (direction === 'bottom') {
        style = {
          ...style,
          gridRow: row + 1,
          gridColumn: col + 1,
          bottom: '-4px',
          left: '20%',
          right: '20%',
          height: '8px',
          transform: 'translateY(50%)',
        };
      } else if (direction === 'left') {
        style = {
          ...style,
          gridRow: row + 1,
          gridColumn: col + 1,
          left: '-4px',
          top: '20%',
          bottom: '20%',
          width: '8px',
          transform: 'translateX(-50%)',
        };
      } else if (direction === 'right') {
        style = {
          ...style,
          gridRow: row + 1,
          gridColumn: col + 1,
          right: '-4px',
          top: '20%',
          bottom: '20%',
          width: '8px',
          transform: 'translateX(50%)',
        };
      }

      const isVertical = direction === 'top' || direction === 'bottom';
      const gradientDirection = isVertical
        ? (direction === 'top' ? 'to top' : 'to bottom')
        : (direction === 'left' ? 'to left' : 'to right');

      return (
        <div
          key={direction}
          className="rounded-full shadow-lg border border-white/20"
          style={{
            ...style,
            background: `linear-gradient(${gradientDirection}, ${hoveredColor} 50%, ${neighborColor} 50%)`,
          }}
        />
      );
    });
  };

  return (
    <div
      className="grid gap-1 bg-gray-800 p-2 rounded-lg relative"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {grid.map((row, r) =>
        row.map((image, c) => (
          <div
            key={`${r}-${c}`}
            className="relative"
            onMouseEnter={() => setHoveredPos({ row: r, col: c })}
            onMouseLeave={() => setHoveredPos(null)}
          >
            <PokemonCell
              image={image}
              viewMode={viewMode}
              isDragging={draggedPos?.row === r && draggedPos?.col === c}
              isDragOver={dragOverPos?.row === r && dragOverPos?.col === c}
              isHovered={hoveredPos?.row === r && hoveredPos?.col === c}
              onDragStart={() => handleDragStart(r, c)}
              onDragOver={(e) => handleDragOver(e, r, c)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(r, c)}
              onDragEnd={handleDragEnd}
            />
            {/* Connection bars for hovered cell */}
            {hoveredPos?.row === r && hoveredPos?.col === c && renderConnectionBars()}
          </div>
        ))
      )}
    </div>
  );
}
