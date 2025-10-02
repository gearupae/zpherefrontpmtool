import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  children?: React.ReactNode; // For page-specific extra controls (selects, buttons, chips)
  className?: string;
  placeholder?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ search, onSearchChange, children, className = '', placeholder = 'Search...' }) => {
  return (
    <div className={`w-full bg-transparent m-0 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={placeholder}
              className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
