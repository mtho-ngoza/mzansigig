'use client'

import React from 'react'
import { GigFilterOptions, BUDGET_RANGES, DURATION_OPTIONS } from '@/types/filters'
import { SkillsFilter } from './SkillsFilter'
import { FilterPresets } from './FilterPresets'
import { User } from '@/types/auth'

interface FilterPanelProps {
  filters: GigFilterOptions
  onFiltersChange: (filters: Partial<GigFilterOptions>) => void
  onClearFilters: () => void
  resultCount?: number
  isOpen?: boolean
  onClose?: () => void
  currentUser?: User | null
}

export function FilterPanel({
  filters,
  onFiltersChange,
  onClearFilters,
  resultCount,
  isOpen = true,
  onClose,
  currentUser
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.budgetMin !== undefined ||
    filters.budgetMax !== undefined ||
    filters.durations.length > 0 ||
    filters.workType !== 'all' ||
    filters.urgency !== 'all' ||
    filters.skills.length > 0

  const handleDurationToggle = (duration: string) => {
    const newDurations = filters.durations.includes(duration)
      ? filters.durations.filter(d => d !== duration)
      : [...filters.durations, duration]
    onFiltersChange({ durations: newDurations })
  }

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
        isOpen ? 'block' : 'hidden'
      } lg:block`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear All
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {resultCount !== undefined && (
        <div className="mb-4 pb-4 border-b border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{resultCount}</span> gigs found
          </p>
        </div>
      )}

      {/* Filter Presets */}
      <FilterPresets onApplyPreset={onFiltersChange} />

      {/* Budget Range Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Budget Range</h4>
        <div className="space-y-2">
          {BUDGET_RANGES.map((range) => (
            <label key={range.label} className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="budget"
                checked={
                  filters.budgetMin === range.min &&
                  filters.budgetMax === range.max
                }
                onChange={() => {
                  onFiltersChange({
                    budgetMin: range.min,
                    budgetMax: range.max
                  })
                }}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">{range.label}</span>
            </label>
          ))}
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="budget"
              checked={
                filters.budgetMin === undefined &&
                filters.budgetMax === undefined
              }
              onChange={() => {
                onFiltersChange({
                  budgetMin: undefined,
                  budgetMax: undefined
                })
              }}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">Any Budget</span>
          </label>
        </div>
      </div>

      {/* Duration Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Duration</h4>
        <div className="space-y-2">
          {DURATION_OPTIONS.map((duration) => (
            <label key={duration} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.durations.includes(duration)}
                onChange={() => handleDurationToggle(duration)}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="ml-2 text-sm text-gray-700">{duration}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Work Type Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Work Type</h4>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="workType"
              checked={filters.workType === 'all'}
              onChange={() => onFiltersChange({ workType: 'all' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Types</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="workType"
              checked={filters.workType === 'remote'}
              onChange={() => onFiltersChange({ workType: 'remote' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">
              <span className="text-sm">Remote Only</span>
              <span className="ml-1 text-xs text-gray-500">(Work from anywhere)</span>
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="workType"
              checked={filters.workType === 'physical'}
              onChange={() => onFiltersChange({ workType: 'physical' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">
              <span className="text-sm">Physical Only</span>
              <span className="ml-1 text-xs text-gray-500">(On-site work)</span>
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="workType"
              checked={filters.workType === 'hybrid'}
              onChange={() => onFiltersChange({ workType: 'hybrid' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">
              <span className="text-sm">Hybrid</span>
              <span className="ml-1 text-xs text-gray-500">(Mix of remote & on-site)</span>
            </span>
          </label>
        </div>
      </div>

      {/* Urgency Filter */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Urgency</h4>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === 'all'}
              onChange={() => onFiltersChange({ urgency: 'all' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">All Deadlines</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === 'urgent'}
              onChange={() => onFiltersChange({ urgency: 'urgent' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-gray-700">
              <span className="text-sm">Urgent</span>
              <span className="ml-1 text-xs text-red-500">(3 days or less)</span>
            </span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === 'week'}
              onChange={() => onFiltersChange({ urgency: 'week' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">This Week</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="urgency"
              checked={filters.urgency === 'month'}
              onChange={() => onFiltersChange({ urgency: 'month' })}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <span className="ml-2 text-sm text-gray-700">This Month</span>
          </label>
        </div>
      </div>

      {/* Skills Filter */}
      <div className="mb-6">
        <SkillsFilter
          selectedSkills={filters.skills}
          onSkillsChange={(skills) => onFiltersChange({ skills })}
          currentUser={currentUser}
        />
      </div>
    </div>
  )
}
