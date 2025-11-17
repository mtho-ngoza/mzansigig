'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { searchLocations, highlightMatch, isValidLocation, LocationSearchResult } from '@/lib/utils/locationSearch'
import { LocationType } from '@/types/location'

interface LocationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect?: (location: LocationSearchResult | null) => void
  placeholder?: string
  error?: string
  className?: string
  disabled?: boolean
  required?: boolean
  allowCustom?: boolean // Allow custom location input not in database
  maxResults?: number
  id?: string // Optional ID for label association
}

// Location type badge configurations
const LOCATION_TYPE_CONFIG: Record<LocationType, { label: string; color: string; emoji: string }> = {
  City: { label: 'City', color: 'bg-blue-100 text-blue-800', emoji: '🏙️' },
  Township: { label: 'Township', color: 'bg-purple-100 text-purple-800', emoji: '🏘️' },
  Suburb: { label: 'Suburb', color: 'bg-green-100 text-green-800', emoji: '🏡' },
  Town: { label: 'Town', color: 'bg-amber-100 text-amber-800', emoji: '🏢' },
  Remote: { label: 'Remote', color: 'bg-gray-100 text-gray-800', emoji: '💻' }
}

export default function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for your location...',
  error,
  className = '',
  disabled = false,
  required = false,
  allowCustom = true,
  maxResults = 8,
  id
}: LocationAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [results, setResults] = useState<LocationSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isSearching, setIsSearching] = useState(false)
  const [showCustomOption, setShowCustomOption] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync with external value changes
  useEffect(() => {
    if (value !== inputValue) {
      setInputValue(value)
    }
  }, [value])

  // Debounced search function (300ms for 2G/3G optimization)
  const performSearch = useCallback((query: string) => {
    setIsSearching(true)

    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      const searchResults = searchLocations(query, { maxResults })
      setResults(searchResults)
      setIsSearching(false)
      setSelectedIndex(-1)

      // Show custom option if query is not empty and not in results
      if (allowCustom && query.trim() && !isValidLocation(query)) {
        setShowCustomOption(true)
      } else {
        setShowCustomOption(false)
      }
    }, 300) // 300ms debounce for 2G/3G networks
  }, [maxResults, allowCustom])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    onChange(newValue)
    setIsOpen(true)
    performSearch(newValue)
  }

  // Handle location selection
  const handleSelect = (location: LocationSearchResult | null, isCustom = false) => {
    if (isCustom && inputValue.trim()) {
      // Custom location
      onChange(inputValue.trim())
      setInputValue(inputValue.trim())
      setIsOpen(false)
      if (onSelect) onSelect(null)
    } else if (location) {
      // Database location
      onChange(location.name)
      setInputValue(location.name)
      setIsOpen(false)
      if (onSelect) onSelect(location)
    }

    // Return focus to input
    inputRef.current?.blur()
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true)
        performSearch(inputValue)
      }
      return
    }

    const totalItems = results.length + (showCustomOption ? 1 : 0)

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
        break

      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelect(results[selectedIndex])
        } else if (showCustomOption && selectedIndex === results.length) {
          handleSelect(null, true)
        } else if (results.length > 0) {
          handleSelect(results[0])
        }
        break

      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break

      case 'Tab':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [selectedIndex])

  // Group results by province
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.province]) {
      acc[result.province] = []
    }
    acc[result.province].push(result)
    return acc
  }, {} as Record<string, LocationSearchResult[]>)

  return (
    <div className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsOpen(true)
            if (inputValue) {
              performSearch(inputValue)
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          } ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="location-autocomplete-dropdown"
          autoComplete="off"
        />

        {/* Search icon */}
        <div className="absolute right-3 top-2.5 pointer-events-none">
          {isSearching ? (
            <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
          ) : (
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          id="location-autocomplete-dropdown"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-80 overflow-y-auto"
          role="listbox"
        >
          {/* Loading state */}
          {isSearching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-gray-500 text-center">
              Searching...
            </div>
          )}

          {/* Empty state */}
          {!isSearching && results.length === 0 && !showCustomOption && (
            <div className="px-4 py-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No locations found</p>
              <p className="mt-1 text-xs text-gray-500">
                Try searching for a city, township, or suburb
              </p>
            </div>
          )}

          {/* Results grouped by province */}
          {results.length > 0 && (
            <div>
              {Object.entries(groupedResults).map(([province, locations]) => (
                <div key={province}>
                  {/* Province header */}
                  <div className="sticky top-0 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 border-b border-gray-200">
                    {province}
                  </div>

                  {/* Locations in this province */}
                  {locations.map((location) => {
                    const globalIndex = results.indexOf(location)
                    const isSelected = selectedIndex === globalIndex
                    const typeConfig = LOCATION_TYPE_CONFIG[location.type]

                    return (
                      <div
                        key={location.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`px-4 py-3 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelect(location)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            {/* Location name with highlighting */}
                            <div className="text-sm font-medium text-gray-900">
                              {highlightMatch(location.name, inputValue).map((part, i) => (
                                <span
                                  key={i}
                                  className={part.isMatch ? 'bg-yellow-200' : ''}
                                >
                                  {part.text}
                                </span>
                              ))}
                            </div>

                            {/* Parent city info */}
                            {location.parentCity && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                in {location.parentCity}
                              </div>
                            )}
                          </div>

                          {/* Location type badge */}
                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeConfig.color} flex-shrink-0`}>
                            <span className="mr-1">{typeConfig.emoji}</span>
                            {typeConfig.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Custom location option */}
          {showCustomOption && (
            <div
              role="option"
              aria-selected={selectedIndex === results.length}
              className={`px-4 py-3 cursor-pointer border-t border-gray-200 transition-colors ${
                selectedIndex === results.length ? 'bg-primary-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(null, true)}
              onMouseEnter={() => setSelectedIndex(results.length)}
            >
              <div className="flex items-center">
                <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Use &quot;{inputValue}&quot;
                  </div>
                  <div className="text-xs text-gray-500">
                    Custom location (not in our database)
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
