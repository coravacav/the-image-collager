import { useState, useCallback, useRef, useEffect } from 'react';
import { Modal } from './Modal';

interface PreviewImage {
  file: File;
  previewUrl: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void;
  isProcessing: boolean;
}

export function ImageUploadModal({ isOpen, onClose, onConfirm, isProcessing }: Props) {
  const [previews, setPreviews] = useState<PreviewImage[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up preview URLs when modal closes
  useEffect(() => {
    if (!isOpen && previews.length > 0) {
      previews.forEach(p => URL.revokeObjectURL(p.previewUrl));
      setPreviews([]);
    }
  }, [isOpen, previews]);

  const addFiles = useCallback((files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(file =>
      file.type.startsWith('image/')
    );

    const newPreviews = imageFiles.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    // Reset input so same files can be selected again
    e.target.value = '';
  }, [addFiles]);

  const removeImage = useCallback((index: number) => {
    setPreviews(prev => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAll = useCallback(() => {
    previews.forEach(p => URL.revokeObjectURL(p.previewUrl));
    setPreviews([]);
  }, [previews]);

  const handleConfirm = useCallback(() => {
    onConfirm(previews.map(p => p.file));
  }, [onConfirm, previews]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Custom Images">
      <div className="space-y-4">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-2">
            <svg
              className="w-12 h-12 mx-auto text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="text-gray-400">
              Drag and drop images here, or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                browse files
              </button>
            </p>
            <p className="text-sm text-gray-500">
              Supports PNG, JPG, GIF, WebP
            </p>
          </div>
        </div>

        {/* Preview grid */}
        {previews.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                {previews.length} image{previews.length !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearAll}
                className="text-sm text-red-400 hover:text-red-300"
              >
                Clear all
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1">
              {previews.map((preview, index) => (
                <div
                  key={preview.previewUrl}
                  className="relative group aspect-square bg-gray-700 rounded overflow-hidden"
                >
                  <img
                    src={preview.previewUrl}
                    alt={preview.file.name}
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute top-0 right-0 p-1 bg-red-500 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove image"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={previews.length === 0 || isProcessing}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Processing...
              </>
            ) : (
              `Use ${previews.length} Image${previews.length !== 1 ? 's' : ''}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
