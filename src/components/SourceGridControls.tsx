interface Props {
  sourceGrid: { rows: number; cols: number; lastRowCols: number };
  onChange: (grid: { rows: number; cols: number; lastRowCols: number }) => void;
  imageCount: number;
}

export function SourceGridControls({ sourceGrid, onChange, imageCount }: Props) {
  const expectedCount = (sourceGrid.rows - 1) * sourceGrid.cols + sourceGrid.lastRowCols;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold text-lg mb-3">Source Images</h3>
      <p className="text-xs text-gray-400 mb-3">
        Configure based on your sprite sheet layout
      </p>

      <div className="space-y-3">
        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Rows</span>
            <span className="text-gray-400">{sourceGrid.rows}</span>
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={sourceGrid.rows}
            onChange={(e) => onChange({
              ...sourceGrid,
              rows: +e.target.value,
              lastRowCols: Math.min(sourceGrid.lastRowCols, sourceGrid.cols)
            })}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Columns</span>
            <span className="text-gray-400">{sourceGrid.cols}</span>
          </label>
          <input
            type="range"
            min="1"
            max="30"
            value={sourceGrid.cols}
            onChange={(e) => onChange({
              ...sourceGrid,
              cols: +e.target.value,
              lastRowCols: Math.min(sourceGrid.lastRowCols, +e.target.value)
            })}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Last Row Cols</span>
            <span className="text-gray-400">{sourceGrid.lastRowCols}</span>
          </label>
          <input
            type="range"
            min="1"
            max={sourceGrid.cols}
            value={sourceGrid.lastRowCols}
            onChange={(e) => onChange({ ...sourceGrid, lastRowCols: +e.target.value })}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-700">
          Expected: {expectedCount} | Loaded: {imageCount}
        </div>
      </div>
    </div>
  );
}
