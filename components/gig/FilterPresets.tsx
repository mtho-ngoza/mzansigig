'use client'

import React from 'react'
import { GigFilterOptions } from '@/types/filters'

interface FilterPresetsProps {
  onApplyPreset: (filters: Partial<GigFilterOptions>) => void
}

export const FILTER_PRESETS = [
  {
    id: 'quick-work',
    name: 'Quick Work',
    icon: '⚡',
    description: 'Urgent gigs nearby',
    filters: {
      urgency: 'urgent' as const,
      durations: ['1-3 days'],
      showNearbyOnly: true
    }
  },
  {
    id: 'high-value',
    name: 'High Value',
    icon: '💎',
    description: 'Budget over R5,000',
    filters: {
      budgetMin: 5000,
      budgetMax: undefined
    }
  },
  {
    id: 'remote-only',
    name: 'Remote Only',
    icon: '🏠',
    description: 'Work from anywhere',
    filters: {
      workType: 'remote' as const
    }
  },
  {
    id: 'best-chance',
    name: 'Best Chance',
    icon: '🎯',
    description: 'Fewer applicants',
    filters: {}
  }
]

export function FilterPresets({ onApplyPreset }: FilterPresetsProps) {
  return (
    <div className="mb-6">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Filters</h4>
      <div className="grid grid-cols-2 gap-2">
        {FILTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onApplyPreset(preset.filters)}
            className="flex flex-col items-start p-3 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left group"
          >
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xl">{preset.icon}</span>
              <span className="text-sm font-medium text-gray-900 group-hover:text-primary-700">
                {preset.name}
              </span>
            </div>
            <span className="text-xs text-gray-500 group-hover:text-primary-600">
              {preset.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
