'use client'

import React from 'react'

export type SortOption =
  | 'newest'
  | 'oldest'
  | 'budget-high'
  | 'budget-low'
  | 'deadline-soon'
  | 'most-applications'
  | 'least-applications'

interface SortDropdownProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'budget-high', label: 'Highest Budget' },
    { value: 'budget-low', label: 'Lowest Budget' },
    { value: 'deadline-soon', label: 'Deadline Soon' },
    { value: 'most-applications', label: 'Most Competitive' },
    { value: 'least-applications', label: 'Best Chance' }
  ]

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="sort" className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Sort by:
      </label>
      <select
        id="sort"
        value={value}
        onChange={(e) => onChange(e.target.value as SortOption)}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
