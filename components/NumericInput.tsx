import React, { useState, useEffect } from 'react';

interface NumericInputProps {
  value: number;
  min?: number;
  max?: number;
  step?: number | string;
  allowNegative?: boolean;
  defaultFallback?: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
  id?: string;
}

/**
 * Robust numeric text input that allows users to delete all digits,
 * backspace, and type any custom number without immediately forcing
 * arbitrary minimums (e.g. 10mm) into the text box while typing.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  min = 1,
  max = 20000,
  allowNegative = false,
  defaultFallback = 100,
  onChange,
  className = '',
  placeholder = '',
  id,
}) => {
  const [localText, setLocalText] = useState<string>(
    value !== undefined && value !== null && !isNaN(value) ? String(value) : ''
  );
  const [isFocused, setIsFocused] = useState<boolean>(false);

  // Sync external changes (e.g. 3D Gizmo drag, slider, preset buttons) when input is not actively focused
  useEffect(() => {
    if (!isFocused) {
      setLocalText(value !== undefined && value !== null && !isNaN(value) ? String(value) : '');
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // Filter out non-numeric characters (allowing minus if allowNegative is true)
    if (allowNegative) {
      if (!/^-?\d*$/.test(raw)) return;
    } else {
      if (!/^\d*$/.test(raw)) return;
    }

    setLocalText(raw);

    // If empty or intermediate '-' while typing, allow user to keep typing freely without crashing
    if (raw.trim() === '' || raw.trim() === '-') {
      return;
    }

    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      if (allowNegative || parsed > 0) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = localText.trim();
    
    if (trimmed === '' || trimmed === '-') {
      const fallback = defaultFallback !== undefined ? defaultFallback : min;
      setLocalText(String(fallback));
      onChange(fallback);
      return;
    }

    let parsed = parseInt(trimmed, 10);
    if (isNaN(parsed)) {
      const fallback = defaultFallback !== undefined ? defaultFallback : min;
      setLocalText(String(fallback));
      onChange(fallback);
      return;
    }

    if (!allowNegative && parsed < min) {
      parsed = min;
    }
    if (max !== undefined && parsed > max) {
      parsed = max;
    }

    setLocalText(String(parsed));
    onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={localText}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
};
