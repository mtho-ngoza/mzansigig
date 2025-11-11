'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { useLocation } from '@/contexts/LocationContext'
import { RADIUS_OPTIONS } from '@/types/location'
import { formatDistance } from '@/lib/utils/locationUtils'

interface LocationFiltersProps {
  onFiltersChange?: () => void
  className?: string
}

export default function LocationFilters({ onFiltersChange, className = '' }: LocationFiltersProps) {
  const {
    userLocation,
    locationPermissionGranted,
    radiusKm,
    setRadiusKm,
    showLocationFilters,
    setShowLocationFilters,
    currentCoordinates,
    isLocationFilterActive,
    refreshLocation
  } = useLocation()

  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange()
    }
  }, [radiusKm, currentCoordinates, onFiltersChange])

  const handleRadiusChange = (newRadius: number) => {
    setRadiusKm(newRadius)
    if (onFiltersChange) {
      onFiltersChange()
    }
  }

  const toggleFilters = () => {
    setIsExpanded(!isExpanded)
    setShowLocationFilters(!showLocationFilters)
  }

  const locationStatusText = () => {
    if (!locationPermissionGranted) {
      return 'Location disabled'
    }
    if (currentCoordinates) {
      return `Within ${formatDistance(radiusKm)}`
    }
    return 'No location'
  }

  const getLocationIcon = () => {
    if (locationPermissionGranted && currentCoordinates) {
      return (
        <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
    return (
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getLocationIcon()}
            <span className="font-medium text-gray-900">Location</span>
            <span className="text-sm text-gray-500">
              {locationStatusText()}
            </span>
            {isLocationFilterActive() && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary-100 text-secondary-800">
                Active
              </span>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFilters}
            className="text-gray-600"
          >
            {isExpanded ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Location Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Location Status</h4>
            {locationPermissionGranted && currentCoordinates ? (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm text-green-800">Location enabled</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshLocation}
                  className="text-green-700 border-green-300 hover:bg-green-100"
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-2">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span className="text-sm text-gray-600">
                    Location not available - showing all gigs
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Radius Filter */}
          {locationPermissionGranted && currentCoordinates && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Search Radius</h4>
              <div className="grid grid-cols-2 gap-2">
                {RADIUS_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => handleRadiusChange(option.value)}
                    className={`p-2 text-sm rounded-md border transition-colors ${
                      radiusKm === option.value
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Currently showing gigs within {formatDistance(radiusKm)} of your location
              </p>
            </div>
          )}

          {/* Location Info */}
          {userLocation?.preferred && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Current Area</h4>
              <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-md">
                <p className="text-sm text-secondary-800">
                  {userLocation.preferred.city}, {userLocation.preferred.province}
                </p>
                {userLocation.lastUpdated && (
                  <p className="text-xs text-secondary-600 mt-1">
                    Updated {new Date(userLocation.lastUpdated).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="border-t border-gray-200 pt-3">
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-xs text-amber-800 font-medium">Location Tips</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Location filtering is especially useful for physical work like cleaning, construction, and transport services.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}