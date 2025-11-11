'use client'

import React from 'react'
import { GigFilterOptions } from '@/types/filters'

interface ActiveFiltersProps {
  filters: GigFilterOptions
  onRemoveFilter: (filterKey: keyof GigFilterOptions, value?: string) => void
  onClearAll: () => void
}

export function ActiveFilters({ filters, onRemoveFilter, onClearAll }: ActiveFiltersProps) {
  const activeFilters: { key: keyof GigFilterOptions; label: string; value?: string }[] = []

  // Budget filter
  if (filters.budgetMin !== undefined || filters.budgetMax !== undefined) {
    const label =
      filters.budgetMax === undefined
        ? `R${filters.budgetMin}+`
        : `R${filters.budgetMin} - R${filters.budgetMax}`
    activeFilters.push({ key: 'budgetMin', label: `Budget: ${label}` })
  }

  // Duration filters
  filters.durations.forEach((duration) => {
    activeFilters.push({
      key: 'durations',
      label: `Duration: ${duration}`,
      value: duration
    })
  })

  // Work type filter
  if (filters.workType !== 'all') {
    const label = filters.workType === 'remote' ? 'Remote Only' : 'Physical Only'
    activeFilters.push({ key: 'workType', label })
  }

  // Urgency filter
  if (filters.urgency !== 'all') {
    const urgencyLabels = {
      urgent: 'Urgent (3 days)',
      week: 'This Week',
      month: 'This Month'
    }
    activeFilters.push({
      key: 'urgency',
      label: urgencyLabels[filters.urgency]
    })
  }

  // Skills filters
  filters.skills.forEach((skill) => {
    activeFilters.push({
      key: 'skills',
      label: `Skill: ${skill}`,
      value: skill
    })
  })

  // Nearby filter
  if (filters.showNearbyOnly) {
    activeFilters.push({
      key: 'showNearbyOnly',
      label: `Within ${filters.radiusKm}km`
    })
  }

  if (activeFilters.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Active Filters:</span>
        {activeFilters.map((filter, index) => (
          <button
            key={`${filter.key}-${filter.value || ''}-${index}`}
            onClick={() => onRemoveFilter(filter.key, filter.value)}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-800 hover:bg-primary-200 transition-colors"
          >
            {filter.label}
            <svg
              className="ml-1.5 w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        ))}
        <button
          onClick={onClearAll}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Clear All
        </button>
      </div>
    </div>
  )
}
