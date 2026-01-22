import type { ViewMode } from '../types';

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ mode, onChange }: Props) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold text-lg mb-3">View Mode</h3>
      <div className="flex gap-2">
        <button
          onClick={() => onChange('sprites')}
          className={`
            flex-1 py-2 px-3 rounded font-medium transition-colors
            ${mode === 'sprites'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
        >
          Sprites
        </button>
        <button
          onClick={() => onChange('colors')}
          className={`
            flex-1 py-2 px-3 rounded font-medium transition-colors
            ${mode === 'colors'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
          `}
        >
          Colors
        </button>
      </div>
    </div>
  );
}
