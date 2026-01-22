import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageSprite, ArrangementState, ArrangementParams, ViewMode, ImageSourceMode } from './types';
import { extractColors } from './lib/colorExtraction';
import { arrangeImages, swapInGrid } from './lib/arrangement';
import { ImageGrid } from './components/ImageGrid';
import { ArrangementControls } from './components/ArrangementControls';
import { GridControls } from './components/GridControls';
import { ViewModeToggle } from './components/ViewModeToggle';
import { BlueprintView } from './components/BlueprintView';
import { ImageSourceControls } from './components/ImageSourceControls';
import { ImageUploadModal } from './components/ImageUploadModal';

// Auto-discover all pokemon images at build time
const pokemonImages = import.meta.glob('/public/pokemon/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const DEFAULT_PARAMS: ArrangementParams = {
  sortAxis: 'hue',
  entropyFactor: 0.2,
  neighborRadius: 1,
  seed: 42,
  scatterEmpty: false,
};

// Get sorted list of pokemon image paths from the glob
const defaultImagePaths = Object.keys(pokemonImages)
  .map(path => path.replace('/public', ''))
  .sort();

function App() {
  const [images, setImages] = useState<ImageSprite[]>([]);
  const [arrangement, setArrangement] = useState<ArrangementState | null>(null);
  const [params, setParams] = useState<ArrangementParams>(DEFAULT_PARAMS);
  const [gridSize, setGridSize] = useState({ rows: 11, cols: 14 });
  const [viewMode, setViewMode] = useState<ViewMode>('sprites');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [imageSourceMode, setImageSourceMode] = useState<ImageSourceMode>('default');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const customBlobUrlsRef = useRef<string[]>([]);

  // Load and process all images
  const loadImages = useCallback(async () => {
    setIsLoading(true);
    setLoadingProgress(0);

    const loaded: ImageSprite[] = [];

    for (let i = 0; i < defaultImagePaths.length; i++) {
      const imagePath = defaultImagePaths[i];
      const filename = imagePath.split('/').pop() || imagePath;

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

      setLoadingProgress(((i + 1) / defaultImagePaths.length) * 100);
    }

    setImages(loaded);
    setIsLoading(false);
  }, []);

  // Load images on mount
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

  // Process custom uploaded images
  const processCustomImages = useCallback(async (files: File[]) => {
    setIsProcessingUpload(true);
    setIsLoading(true);
    setLoadingProgress(0);

    // Revoke old blob URLs
    customBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    customBlobUrlsRef.current = [];

    const loaded: ImageSprite[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const blobUrl = URL.createObjectURL(file);
      customBlobUrlsRef.current.push(blobUrl);

      try {
        const colors = await extractColors(blobUrl);
        loaded.push({
          filename: file.name,
          imagePath: blobUrl,
          colors,
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
      }

      setLoadingProgress(((i + 1) / files.length) * 100);
    }

    setImages(loaded);
    setImageSourceMode('custom');
    setIsUploadModalOpen(false);
    setIsProcessingUpload(false);
    setIsLoading(false);

    // Auto-calculate grid size based on image count
    const count = loaded.length;
    const cols = Math.ceil(Math.sqrt(count * 1.4));
    const rows = Math.ceil(count / cols);
    setGridSize({ rows, cols });
  }, []);

  // Reset to default Pokemon images
  const handleResetToDefault = useCallback(() => {
    // Revoke custom blob URLs
    customBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    customBlobUrlsRef.current = [];

    setImageSourceMode('default');
    setGridSize({ rows: 11, cols: 14 });
    loadImages();
  }, [loadImages]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      customBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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
          <ImageSourceControls
            mode={imageSourceMode}
            onUploadClick={() => setIsUploadModalOpen(true)}
            onResetToDefault={handleResetToDefault}
          />
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <GridControls
            rows={gridSize.rows}
            cols={gridSize.cols}
            imageCount={images.length}
            scatterEmpty={params.scatterEmpty}
            onChange={setGridSize}
            onScatterEmptyChange={(value) => setParams(p => ({ ...p, scatterEmpty: value }))}
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
            <ImageGrid
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

      {/* Upload Modal */}
      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onConfirm={processCustomImages}
        isProcessing={isProcessingUpload}
      />
    </div>
  );
}

export default App;
