interface Props {
  rows: number;
  cols: number;
  imageCount: number;
  onChange: (size: { rows: number; cols: number }) => void;
}

export function GridControls({ rows, cols, imageCount, onChange }: Props) {
  const totalCells = rows * cols;

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
      </div>
    </div>
  );
}
