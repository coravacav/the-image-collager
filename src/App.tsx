import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { ImageSprite, ArrangementState, ArrangementParams, ViewMode, ImageSourceMode, ImageLocation, SwapRecord, ColorExtractionSettings, RGBColor } from './types';
import { extractColors, DEFAULT_COLOR_SETTINGS } from './lib/colorExtraction';
import { arrangeImages, applySwap } from './lib/arrangement';
import { encodeStateCode, decodeStateCode, ColorOverrideEntry } from './lib/stateEncoding';
import { ImageGrid } from './components/ImageGrid';
import { ArrangementControls } from './components/ArrangementControls';
import { GridControls } from './components/GridControls';
import { ViewModeToggle } from './components/ViewModeToggle';
import { BlueprintView } from './components/BlueprintView';
import { ImageUploadModal } from './components/ImageUploadModal';
import { ImageBucket } from './components/ImageBucket';
import { StateCodeInput } from './components/StateCodeInput';
import { ColorExtractionControls } from './components/ColorExtractionControls';

// Auto-discover all pokemon images at build time
const pokemonImages = import.meta.glob('/public/pokemon/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const DEFAULT_PARAMS: ArrangementParams = {
  sortAxis: 'hue',
  entropyFactor: 0.2,
  neighborRadius: 1,
  squareSmoothing: false,
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
  const [colorSettings, setColorSettings] = useState<ColorExtractionSettings>(DEFAULT_COLOR_SETTINGS);
  const customBlobUrlsRef = useRef<string[]>([]);
  const lastLoadedPathsRef = useRef<string[]>([]);

  // State for drag-drop coordination and state code
  const [draggedLocation, setDraggedLocation] = useState<ImageLocation | null>(null);
  const [swaps, setSwaps] = useState<SwapRecord[]>([]);
  const [inclusionMask, setInclusionMask] = useState<boolean[]>([]);
  // Color overrides: Map<"filename:colorIndex", RGBColor>
  const [colorOverrides, setColorOverrides] = useState<Map<string, RGBColor>>(new Map());
  // Warning for image set mismatch
  const [hashMismatchWarning, setHashMismatchWarning] = useState(false);

  // Load and process all images
  const loadImages = useCallback(async (settings: ColorExtractionSettings = colorSettings) => {
    setIsLoading(true);
    setLoadingProgress(0);
    lastLoadedPathsRef.current = defaultImagePaths;

    const loaded: ImageSprite[] = [];

    for (let i = 0; i < defaultImagePaths.length; i++) {
      const imagePath = defaultImagePaths[i];
      const filename = imagePath.split('/').pop() || imagePath;

      try {
        const { colors, blobUrl } = await extractColors(imagePath, settings);
        loaded.push({
          filename,
          imagePath: blobUrl, // Use blob URL for local caching (no network requests on regenerate)
          colors,
        });
      } catch (error) {
        console.error(`Failed to process ${filename}:`, error);
      }

      setLoadingProgress(((i + 1) / defaultImagePaths.length) * 100);
    }

    setImages(loaded);
    setHashMismatchWarning(false);
    setIsLoading(false);
  }, [colorSettings]);

  // Load images on mount
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // Generate arrangement when images load or params change
  useEffect(() => {
    if (images.length > 0) {
      const totalCells = gridSize.rows * gridSize.cols;
      // Create initial inclusion mask: first N images are in grid
      const newInclusionMask = images.map((_, i) => i < totalCells);
      setInclusionMask(newInclusionMask);
      setSwaps([]);

      const newArrangement = arrangeImages(
        images,
        gridSize.rows,
        gridSize.cols,
        params,
        newInclusionMask
      );
      setArrangement(newArrangement);
    }
  }, [images, gridSize, params]);

  const handleRegenerate = useCallback(() => {
    if (images.length > 0) {
      const newSeed = Math.floor(Math.random() * 10000);
      const newParams = { ...params, seed: newSeed };
      setParams(newParams);

      const totalCells = gridSize.rows * gridSize.cols;
      const newInclusionMask = images.map((_, i) => i < totalCells);
      setInclusionMask(newInclusionMask);
      setSwaps([]);
      setHashMismatchWarning(false);

      const newArrangement = arrangeImages(
        images,
        gridSize.rows,
        gridSize.cols,
        newParams,
        newInclusionMask
      );
      setArrangement(newArrangement);
    }
  }, [images, gridSize, params]);

  // Unified swap handler for grid↔grid, grid↔bucket, bucket↔bucket
  const handleSwap = useCallback((from: ImageLocation, to: ImageLocation) => {
    if (arrangement) {
      const newArrangement = applySwap(arrangement, from, to);
      setArrangement(newArrangement);

      // Record the swap
      setSwaps(prev => [...prev, { from, to }]);

      // Update inclusion mask based on what moved where
      setInclusionMask(prev => {
        const newMask = [...prev];
        // Find which images are now in grid vs bucket
        const gridImages = new Set<string>();
        for (const row of newArrangement.grid) {
          for (const img of row) {
            if (img) gridImages.add(img.filename);
          }
        }
        // Update mask based on current positions
        for (let i = 0; i < images.length; i++) {
          newMask[i] = gridImages.has(images[i].filename);
        }
        return newMask;
      });
    }
  }, [arrangement, images]);

  const handleDragStart = useCallback((location: ImageLocation) => {
    setDraggedLocation(location);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedLocation(null);
  }, []);

  // Handle color override changes
  const handleColorChange = useCallback((filename: string, colorIndex: number, rgb: RGBColor) => {
    setColorOverrides(prev => {
      const next = new Map(prev);
      const key = `${filename}:${colorIndex}`;
      next.set(key, rgb);
      return next;
    });
  }, []);

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
      const fileBlobUrl = URL.createObjectURL(file);

      try {
        const { colors, blobUrl } = await extractColors(fileBlobUrl, colorSettings);
        // Revoke the file blob URL since we now have a canvas-based blob URL
        URL.revokeObjectURL(fileBlobUrl);
        customBlobUrlsRef.current.push(blobUrl);
        loaded.push({
          filename: file.name,
          imagePath: blobUrl,
          colors,
        });
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error);
        URL.revokeObjectURL(fileBlobUrl);
      }

      setLoadingProgress(((i + 1) / files.length) * 100);
    }

    setImages(loaded);
    setHashMismatchWarning(false);
    setImageSourceMode('custom');
    setIsUploadModalOpen(false);
    setIsProcessingUpload(false);
    setIsLoading(false);

    // Auto-calculate grid size based on image count
    const count = loaded.length;
    const cols = Math.ceil(Math.sqrt(count * 1.4));
    const rows = Math.ceil(count / cols);
    setGridSize({ rows, cols });
  }, [colorSettings]);

  // Reset to default Pokemon images
  const handleResetToDefault = useCallback(() => {
    // Revoke custom blob URLs
    customBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    customBlobUrlsRef.current = [];

    setImageSourceMode('default');
    setGridSize({ rows: 11, cols: 14 });
    loadImages();
  }, [loadImages]);

  // Handle color settings change - re-extract colors with new settings
  const handleColorSettingsChange = useCallback((newSettings: ColorExtractionSettings) => {
    setColorSettings(newSettings);
    // Re-load images with new color settings
    if (imageSourceMode === 'default') {
      loadImages(newSettings);
    }
    // For custom images, we'd need to store the original files to re-process
    // For now, custom images will only apply new settings on next upload
  }, [imageSourceMode, loadImages]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      customBlobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Convert color overrides map to array format for encoding
  const colorOverrideEntries = useMemo((): ColorOverrideEntry[] => {
    const entries: ColorOverrideEntry[] = [];
    for (const [key, rgb] of colorOverrides) {
      const [filename, colorIndexStr] = key.split(':');
      const imageIndex = images.findIndex(img => img.filename === filename);
      if (imageIndex !== -1) {
        entries.push({
          imageIndex,
          colorIndex: parseInt(colorIndexStr, 10),
          rgb,
        });
      }
    }
    return entries;
  }, [colorOverrides, images]);

  // Generate state code from current state
  const stateCode = useMemo(() => {
    if (images.length === 0) return '';
    const filenames = images.map(img => img.filename);
    return encodeStateCode(filenames, params.seed, inclusionMask, swaps, colorOverrideEntries);
  }, [params.seed, inclusionMask, swaps, colorOverrideEntries, images]);

  // Apply a pasted state code
  const handleApplyCode = useCallback((code: string) => {
    const filenames = images.map(img => img.filename);
    const decoded = decodeStateCode(code, filenames);
    if (!decoded) return;

    // Show warning if image set doesn't match
    setHashMismatchWarning(decoded.hashMismatch);

    // Update seed
    const newParams = { ...params, seed: decoded.seed };
    setParams(newParams);

    // Update inclusion mask
    setInclusionMask(decoded.inclusionMask);

    // Generate base arrangement with new params and mask
    let newArrangement = arrangeImages(
      images,
      gridSize.rows,
      gridSize.cols,
      newParams,
      decoded.inclusionMask
    );

    // Apply recorded swaps
    for (const swap of decoded.swaps) {
      newArrangement = applySwap(newArrangement, swap.from, swap.to);
    }

    setArrangement(newArrangement);
    setSwaps(decoded.swaps);

    // Apply color overrides
    const newColorOverrides = new Map<string, RGBColor>();
    for (const override of decoded.colorOverrides) {
      const image = images[override.imageIndex];
      if (image) {
        const key = `${image.filename}:${override.colorIndex}`;
        newColorOverrides.set(key, override.rgb);
      }
    }
    setColorOverrides(newColorOverrides);
  }, [images, gridSize, params]);

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
      <header className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Image Color Arranger</h1>
          <p className="text-gray-400">Arrange images by color for your painting blueprint</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Upload Custom Images
        </button>
      </header>

      <div className="flex gap-4">
        {/* Left sidebar - Controls */}
        <aside className="w-72 space-y-4 flex-shrink-0">
          {imageSourceMode === 'custom' && (
            <button
              onClick={handleResetToDefault}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            >
              Reset to Default Images
            </button>
          )}
          <ColorExtractionControls
            settings={colorSettings}
            onChange={handleColorSettingsChange}
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
            <>
              <ImageGrid
                arrangement={arrangement}
                viewMode={viewMode}
                onSwap={handleSwap}
                draggedLocation={draggedLocation}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                colorOverrides={colorOverrides}
                onColorChange={handleColorChange}
              />
              <ImageBucket
                images={arrangement.bucket}
                viewMode={viewMode}
                onSwap={handleSwap}
                draggedLocation={draggedLocation}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                colorOverrides={colorOverrides}
                onColorChange={handleColorChange}
              />
            </>
          )}
        </main>

        {/* Right sidebar - Blueprint */}
        <aside className="w-72 flex-shrink-0 space-y-4">
          <BlueprintView arrangement={arrangement} />
          <StateCodeInput
            stateCode={stateCode}
            onApplyCode={handleApplyCode}
            hashMismatchWarning={hashMismatchWarning}
            onDismissWarning={() => setHashMismatchWarning(false)}
          />
          {colorOverrides.size > 0 && (
            <button
              onClick={() => setColorOverrides(new Map())}
              className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Color Overrides ({colorOverrides.size})
            </button>
          )}
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
