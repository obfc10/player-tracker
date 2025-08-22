'use client';

import React, { useState, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  loading?: boolean;
  debounceMs?: number;
  className?: string;
  onClear?: () => void;
  showClearButton?: boolean;
}

export function SearchInput({
  placeholder = 'Search...',
  value = '',
  onChange,
  loading = false,
  debounceMs = 300,
  className = '',
  onClear,
  showClearButton = true
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value);

  // Debounce the search to avoid too many API calls
  const debouncedSearch = useDebounce((searchValue: string) => {
    onChange(searchValue);
  }, debounceMs);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    debouncedSearch(newValue);
  }, [debouncedSearch]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    if (onClear) {
      onClear();
    }
  }, [onChange, onClear]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  }, [handleClear]);

  // Sync external value changes
  React.useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        {loading ? (
          <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
        ) : (
          <Search className="h-5 w-5 text-gray-400" />
        )}
      </div>
      
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          block w-full pl-10 pr-10 py-2
          bg-gray-800 border border-gray-600 rounded-lg
          text-white placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          transition-colors duration-200
        "
      />
      
      {showClearButton && inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="
            absolute inset-y-0 right-0 pr-3 flex items-center
            text-gray-400 hover:text-white
            transition-colors duration-200
          "
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}