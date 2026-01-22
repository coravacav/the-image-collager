interface Props {
  rows: number;
  cols: number;
  imageCount: number;
  scatterEmpty: boolean;
  onChange: (size: { rows: number; cols: number }) => void;
  onScatterEmptyChange: (value: boolean) => void;
}

export function GridControls({ rows, cols, imageCount, scatterEmpty, onChange, onScatterEmptyChange }: Props) {
  const totalCells = rows * cols;
  const hasEmptyCells = totalCells > imageCount;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="font-semibold text-lg mb-3">Output Grid</h3>

      <div className="space-y-3">
        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Rows</span>
            <span className="text-gray-400">{rows}</span>
          </label>
          <input
            type="range"
            min="1"
            max="25"
            value={rows}
            onChange={(e) => onChange({ rows: +e.target.value, cols })}
            className="w-full accent-blue-500"
          />
        </div>

        <div>
          <label className="flex justify-between text-sm mb-1">
            <span>Columns</span>
            <span className="text-gray-400">{cols}</span>
          </label>
          <input
            type="range"
            min="1"
            max="25"
            value={cols}
            onChange={(e) => onChange({ rows, cols: +e.target.value })}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="text-sm text-gray-400 text-center pt-2 border-t border-gray-700">
          {totalCells} cells ({totalCells >= imageCount
            ? `${totalCells - imageCount} empty`
            : <span className="text-red-400 font-medium">{imageCount - totalCells} won't fit</span>})
        </div>

        {hasEmptyCells && (
          <label className="flex items-center gap-2 text-sm pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={scatterEmpty}
              onChange={(e) => onScatterEmptyChange(e.target.checked)}
              className="w-4 h-4 accent-blue-500"
            />
            <span>Scatter empty cells</span>
          </label>
        )}
      </div>
    </div>
  );
}
