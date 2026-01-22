import { useState, useEffect, useCallback } from 'react';
import { isValidStateCode } from '../lib/stateEncoding';

interface Props {
  stateCode: string;
  onApplyCode: (code: string) => void;
  hashMismatchWarning?: boolean;
  onDismissWarning?: () => void;
}

export function StateCodeInput({ stateCode, onApplyCode, hashMismatchWarning, onDismissWarning }: Props) {
  const [inputValue, setInputValue] = useState(stateCode);
  const [isEditing, setIsEditing] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [copied, setCopied] = useState(false);

  // Sync input with external state code when not editing
  useEffect(() => {
    if (!isEditing) {
      setInputValue(stateCode);
      setIsValid(true);
    }
  }, [stateCode, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsValid(value === '' || isValidStateCode(value));
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    // Reset to current state code if invalid or empty
    if (!isValid || inputValue === '') {
      setInputValue(stateCode);
      setIsValid(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isValid && inputValue !== stateCode) {
      onApplyCode(inputValue);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setInputValue(stateCode);
      setIsValid(true);
      setIsEditing(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleApply = () => {
    if (isValid && inputValue !== stateCode) {
      onApplyCode(inputValue);
      setIsEditing(false);
    }
  };

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(stateCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input');
      input.value = stateCode;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [stateCode]);

  const hasChanges = isEditing && inputValue !== stateCode && isValid;

  return (
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">State Code</label>
        <button
          onClick={handleCopy}
          className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className={`
              w-full px-3 py-2 bg-gray-900 rounded border text-sm font-mono
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${isValid ? 'border-gray-700' : 'border-red-500'}
              ${hasChanges ? 'border-yellow-500' : ''}
            `}
            placeholder="seed:data:...:hash"
          />
        </div>

        {hasChanges && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleApply}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors"
          >
            Apply
          </button>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-2">
        Paste a code to restore an arrangement, or copy to share
      </p>

      {!isValid && isEditing && (
        <div className="mt-2 p-2 bg-red-900/50 border border-red-600 rounded text-xs text-red-200 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">Invalid format</p>
            <p className="text-red-300/80">State code should have 5 colon-separated parts.</p>
          </div>
        </div>
      )}

      {hashMismatchWarning && (
        <div className="mt-2 p-2 bg-yellow-900/50 border border-yellow-600 rounded text-xs text-yellow-200 flex items-start gap-2">
          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-medium">Image set mismatch</p>
            <p className="text-yellow-300/80">This code was created with a different set of images. Results may be unexpected.</p>
          </div>
          {onDismissWarning && (
            <button onClick={onDismissWarning} className="text-yellow-400 hover:text-yellow-200">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
