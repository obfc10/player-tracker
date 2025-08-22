'use client';

import * as React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked = false, onCheckedChange, disabled = false, className = '' }: CheckboxProps) {
  const handleClick = () => {
    if (!disabled && onCheckedChange) {
      onCheckedChange(!checked);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-4 h-4 border border-gray-600 rounded flex items-center justify-center
        transition-colors duration-200
        ${checked ? 'bg-purple-600 border-purple-500' : 'bg-gray-700 hover:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
    </button>
  );
}