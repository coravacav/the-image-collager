import { useState, useEffect, useCallback } from 'react';
import type { ImageSprite, ArrangementState, ArrangementParams, ViewMode } from './types';
import { extractColors } from './lib/colorExtraction';
import { arrangeImages, swapInGrid } from './lib/arrangement';
import { PokemonGrid } from './components/PokemonGrid';
import { ArrangementControls } from './components/ArrangementControls';
import { GridControls } from './components/GridControls';
import { SourceGridControls } from './components/SourceGridControls';
import { ViewModeToggle } from './components/ViewModeToggle';
import { BlueprintView } from './components/BlueprintView';

const DEFAULT_PARAMS: ArrangementParams = {
  sortAxis: 'hue',
  entropyFactor: 0.2,
  neighborRadius: 1,
  seed: 42,
};

function App() {
  const [images, setImages] = useState<ImageSprite[]>([]);
  const [arrangement, setArrangement] = useState<ArrangementState | null>(null);
  const [params, setParams] = useState<ArrangementParams>(DEFAULT_PARAMS);
  const [gridSize, setGridSize] = useState({ rows: 11, cols: 14 });
  const [sourceGrid, setSourceGrid] = useState({ rows: 8, cols: 19, lastRowCols: 18 });
  const [viewMode, setViewMode] = useState<ViewMode>('sprites');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Generate filenames based on source grid config
  const generateFilenames = useCallback(() => {
    const filenames: string[] = [];

    for (let row = 1; row <= sourceGrid.rows; row++) {
      const colCount = row === sourceGrid.rows ? sourceGrid.lastRowCols : sourceGrid.cols;
      for (let col = 1; col <= colCount; col++) {
        const rowStr = row.toString().padStart(2, '0');
        const colStr = col.toString().padStart(2, '0');
        filenames.push(`Pasted Layer-${rowStr}-${colStr}.png`);
      }
    }

    return filenames;
  }, [sourceGrid]);

  // Load and process all images
  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);

    const filenames = generateFilenames();
    const loaded: ImageSprite[] = [];

    for (let i = 0; i < filenames.length; i++) {
      const filename = filenames[i];
      const imagePath = `/pokemon/${filename}`;

      try {
        const colors = await extractColors(imagePath);
        loaded.push({
          filename,
          imagePath,
          colors,
        });
      } catch (error) {
        console.error(`Failed to process ${filename}:`, error);
      }

      setLoadingProgress(((i + 1) / filenames.length) * 100);
    }

    setImages(loaded);
    setIsLoading(false);
  }, [generateFilenames]);

  // Load images on mount and when source grid changes
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Generate arrangement when images load or params change
  useEffect(() => {
    if (images.length > 0) {
      const newArrangement = arrangeImages(
        images,
        gridSize.rows,
        gridSize.cols,
        params
      );
      setArrangement(newArrangement);
    }
  }, [images, gridSize, params]);

  const handleRegenerate = useCallback(() => {
    if (images.length > 0) {
      const newSeed = Math.floor(Math.random() * 10000);
      const newParams = { ...params, seed: newSeed };
      setParams(newParams);
      const newArrangement = arrangeImages(
        images,
        gridSize.rows,
        gridSize.cols,
        newParams
      );
      setArrangement(newArrangement);
    }
  }, [images, gridSize, params]);

  const handleSwap = useCallback((pos1: { row: number; col: number }, pos2: { row: number; col: number }) => {
    if (arrangement) {
      setArrangement(swapInGrid(arrangement, pos1, pos2));
    }
  }, [arrangement]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Loading Images...</h1>
        <div className="w-64 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-200"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        <p className="mt-2 text-gray-400">{Math.round(loadingProgress)}%</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Image Color Arranger</h1>
        <p className="text-gray-400">Arrange images by color for your painting blueprint</p>
      </header>

      <div className="flex gap-4">
        {/* Left sidebar - Controls */}
        <aside className="w-72 space-y-4 flex-shrink-0">
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <SourceGridControls
            sourceGrid={sourceGrid}
            onChange={setSourceGrid}
            imageCount={images.length}
          />
          <GridControls
            rows={gridSize.rows}
            cols={gridSize.cols}
            imageCount={images.length}
            onChange={setGridSize}
          />
          <ArrangementControls
            params={params}
            onChange={setParams}
            onRegenerate={handleRegenerate}
          />
        </aside>

        {/* Main content - Grid */}
        <main className="flex-1 min-w-0">
          {arrangement && (
            <PokemonGrid
              arrangement={arrangement}
              viewMode={viewMode}
              onSwap={handleSwap}
            />
          )}
        </main>

        {/* Right sidebar - Blueprint */}
        <aside className="w-72 flex-shrink-0">
          <BlueprintView arrangement={arrangement} />
        </aside>
      </div>
    </div>
  );
}

export default App;
