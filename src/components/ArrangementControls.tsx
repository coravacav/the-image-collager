import type { ArrangementParams, SortAxis } from '../types';

interface Props {
  params: ArrangementParams;
  onChange: (params: ArrangementParams) => void;
  onRegenerate: () => void;
}

export function ArrangementControls({ params, onChange, onRegenerate }: Props) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg space-y-4">
      <h3 className="font-semibold text-lg">Arrangement</h3>

      {/* Sort Axis */}
      <div>
        <label className="block text-sm mb-1">Sort By</label>
        <select
          value={params.sortAxis}
          onChange={(e) => onChange({ ...params, sortAxis: e.target.value as SortAxis })}
          className="w-full bg-gray-700 rounded px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          <option value="hue">Hue (Rainbow)</option>
          <option value="lightness">Lightness</option>
          <option value="chroma">Saturation</option>
        </select>
      </div>

      {/* Entropy Slider */}
      <div>
        <label className="flex justify-between text-sm mb-1">
          <span>Color Variation</span>
          <span className="text-gray-400">{Math.round(params.entropyFactor * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={params.entropyFactor * 100}
          onChange={(e) => onChange({ ...params, entropyFactor: +e.target.value / 100 })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Smooth</span>
          <span>Pockets</span>
        </div>
      </div>

      {/* Neighbor Optimization */}
      <div>
        <label className="flex justify-between text-sm mb-1">
          <span>Neighbor Smoothing</span>
          <span className="text-gray-400">{params.neighborRadius}</span>
        </label>
        <input
          type="range"
          min="0"
          max="3"
          value={params.neighborRadius}
          onChange={(e) => onChange({ ...params, neighborRadius: +e.target.value })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>None</span>
          <span>High</span>
        </div>
      </div>

      {/* Seed */}
      <div>
        <label className="block text-sm mb-1">Seed</label>
        <input
          type="number"
          value={params.seed}
          onChange={(e) => onChange({ ...params, seed: +e.target.value })}
          className="w-full bg-gray-700 rounded px-3 py-2 text-white border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* Regenerate Button */}
      <button
        onClick={onRegenerate}
        className="w-full py-3 bg-blue-600 rounded font-medium hover:bg-blue-500 transition-colors"
      >
        Regenerate
      </button>
    </div>
  );
}
