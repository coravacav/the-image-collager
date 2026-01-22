import type { ImageSourceMode } from '../types';

interface Props {
  mode: ImageSourceMode;
  onUploadClick: () => void;
  onResetToDefault: () => void;
}

export function ImageSourceControls({ mode, onUploadClick, onResetToDefault }: Props) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-3">Image Source</h2>

      <div className="space-y-3">
        {/* Current mode indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Current:</span>
          <span className={`
            px-2 py-0.5 rounded text-xs font-medium
            ${mode === 'default' ? 'bg-blue-600' : 'bg-green-600'}
          `}>
            {mode === 'default' ? 'Default Pokemon' : 'Custom Images'}
          </span>
        </div>

        {/* Action buttons */}
        <button
          onClick={onUploadClick}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload Custom Images
        </button>

        {mode === 'custom' && (
          <button
            onClick={onResetToDefault}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
          >
            Reset to Default Images
          </button>
        )}
      </div>
    </div>
  );
}
