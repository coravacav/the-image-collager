import type { ColorExtractionSettings } from '../types';

interface Props {
  settings: ColorExtractionSettings;
  onChange: (settings: ColorExtractionSettings) => void;
}

export function ColorExtractionControls({ settings, onChange }: Props) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
      <h3 className="font-semibold text-lg">Color Extraction</h3>

      {/* Smart Detection Toggle */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.smartDetection}
            onChange={(e) => onChange({ ...settings, smartDetection: e.target.checked })}
            className="w-4 h-4 rounded accent-blue-500"
          />
          <span className="text-sm">Smart Detection</span>
        </label>
        <p className="text-xs text-gray-500 mt-1">
          Automatically detect number of colors based on pixel threshold
        </p>
      </div>

      {settings.smartDetection ? (
        /* Threshold slider for smart detection */
        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Min Pixel Threshold</span>
            <span className="text-gray-400">{Math.round(settings.smartThreshold * 100)}%</span>
          </label>
          <input
            type="range"
            min="5"
            max="30"
            value={settings.smartThreshold * 100}
            onChange={(e) => onChange({ ...settings, smartThreshold: +e.target.value / 100 })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>More Colors</span>
            <span>Fewer Colors</span>
          </div>
        </div>
      ) : (
        /* Fixed number of colors slider */
        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Number of Colors</span>
            <span className="text-gray-400">{settings.numColors}</span>
          </label>
          <input
            type="range"
            min="1"
            max="5"
            value={settings.numColors}
            onChange={(e) => onChange({ ...settings, numColors: +e.target.value })}
            className="w-full accent-blue-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1</span>
            <span>5</span>
          </div>
        </div>
      )}
    </div>
  );
}
