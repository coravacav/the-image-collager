import type { ArrangementState } from '../types';
import { getDisplayName } from '../lib/imageData';

interface Props {
  arrangement: ArrangementState | null;
}

export function BlueprintView({ arrangement }: Props) {
  if (!arrangement) return null;

  const { grid } = arrangement;

  const copyToClipboard = () => {
    const text = grid
      .map((row, r) =>
        `Row ${r + 1}: ` + row.map((img) => (img ? getDisplayName(img.filename) : '---')).join(' | ')
      )
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  const copyCompact = () => {
    const text = grid
      .map((row) => row.map((img) => (img ? getDisplayName(img.filename) : '---')).join(' '))
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold text-lg">Blueprint</h3>
        <div className="flex gap-1">
          <button
            onClick={copyCompact}
            className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Copy compact"
          >
            Compact
          </button>
          <button
            onClick={copyToClipboard}
            className="text-xs px-2 py-1 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
            title="Copy with row labels"
          >
            Copy
          </button>
        </div>
      </div>

      <div className="text-xs font-mono space-y-1 max-h-[600px] overflow-y-auto">
        {grid.map((row, r) => (
          <div key={r} className="flex items-start gap-1">
            <span className="text-gray-500 w-5 flex-shrink-0">{r + 1}:</span>
            <div className="flex flex-wrap gap-1">
              {row.map((img, c) => {
                const primaryColor = img?.colors[0];
                return (
                  <span
                    key={c}
                    className="px-1 rounded text-[10px]"
                    style={{
                      backgroundColor: primaryColor ? `rgb(${primaryColor.rgb.r}, ${primaryColor.rgb.g}, ${primaryColor.rgb.b})` : undefined,
                      color: primaryColor && primaryColor.color.l > 0.5 ? '#000' : '#fff',
                    }}
                    title={img ? img.filename : 'empty'}
                  >
                    {img ? getDisplayName(img.filename) : '-'}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
