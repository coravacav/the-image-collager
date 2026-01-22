import { useState } from 'react';
import type { ArrangementState, ViewMode } from '../types';
import { PokemonCell } from './PokemonCell';

interface Props {
  arrangement: ArrangementState;
  viewMode: ViewMode;
  onSwap: (pos1: { row: number; col: number }, pos2: { row: number; col: number }) => void;
}

export function PokemonGrid({ arrangement, viewMode, onSwap }: Props) {
  const { grid, cols } = arrangement;
  const [draggedPos, setDraggedPos] = useState<{ row: number; col: number } | null>(null);
  const [dragOverPos, setDragOverPos] = useState<{ row: number; col: number } | null>(null);

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

  return (
    <div
      className="grid gap-1 bg-gray-800 p-2 rounded-lg"
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
      }}
    >
      {grid.map((row, r) =>
        row.map((image, c) => (
          <PokemonCell
            key={`${r}-${c}`}
            image={image}
            viewMode={viewMode}
            isDragging={draggedPos?.row === r && draggedPos?.col === c}
            isDragOver={dragOverPos?.row === r && dragOverPos?.col === c}
            onDragStart={() => handleDragStart(r, c)}
            onDragOver={(e) => handleDragOver(e, r, c)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(r, c)}
            onDragEnd={handleDragEnd}
          />
        ))
      )}
    </div>
  );
}
