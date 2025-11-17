'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { SafeMeetingLocation } from '@/types/security'

interface SafeMeetingLocationsProps {
  userLocation?: string
  onLocationSelect?: (location: SafeMeetingLocation) => void
  showHeader?: boolean
}

// Demo safe meeting locations for major SA cities
const DEMO_SAFE_LOCATIONS: SafeMeetingLocation[] = [
  {
    id: '1',
    name: 'Sandton City Shopping Centre',
    address: '83 Rivonia Rd, Sandhurst, Sandton, 2196',
    coordinates: { latitude: -26.1076, longitude: 28.0567 },
    type: 'shopping_mall',
    safetyRating: 4.8,
    operatingHours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '19:00' },
      sunday: { open: '09:00', close: '18:00' }
    },
    amenities: ['Security Guards', 'CCTV', 'Public WiFi', 'Food Court', 'Parking'],
    verified: true,
    createdAt: new Date()
  },
  {
    id: '2',
    name: 'Cape Town Central Library',
    address: '9 Roeland St, Cape Town City Centre, Cape Town, 8000',
    coordinates: { latitude: -33.9249, longitude: 18.4241 },
    type: 'library',
    safetyRating: 4.6,
    operatingHours: {
      monday: { open: '08:00', close: '20:00' },
      tuesday: { open: '08:00', close: '20:00' },
      wednesday: { open: '08:00', close: '20:00' },
      thursday: { open: '08:00', close: '20:00' },
      friday: { open: '08:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: null
    },
    amenities: ['Free WiFi', 'Study Areas', 'Security', 'Public Transport Access'],
    verified: true,
    createdAt: new Date()
  },
  {
    id: '3',
    name: 'Menlyn Park Shopping Centre',
    address: 'Atterbury Rd & Lois Ave, Menlyn, Pretoria, 0181',
    coordinates: { latitude: -25.7804, longitude: 28.2770 },
    type: 'shopping_mall',
    safetyRating: 4.7,
    operatingHours: {
      monday: { open: '09:00', close: '21:00' },
      tuesday: { open: '09:00', close: '21:00' },
      wednesday: { open: '09:00', close: '21:00' },
      thursday: { open: '09:00', close: '21:00' },
      friday: { open: '09:00', close: '21:00' },
      saturday: { open: '09:00', close: '19:00' },
      sunday: { open: '09:00', close: '17:00' }
    },
    amenities: ['24/7 Security', 'CCTV', 'Food Court', 'Public Transport', 'Medical Centre'],
    verified: true,
    createdAt: new Date()
  },
  {
    id: '4',
    name: 'Mugg & Bean - V&A Waterfront',
    address: 'V&A Waterfront, Cape Town, 8001',
    coordinates: { latitude: -33.9021, longitude: 18.4186 },
    type: 'coffee_shop',
    safetyRating: 4.5,
    operatingHours: {
      monday: { open: '07:00', close: '21:00' },
      tuesday: { open: '07:00', close: '21:00' },
      wednesday: { open: '07:00', close: '21:00' },
      thursday: { open: '07:00', close: '21:00' },
      friday: { open: '07:00', close: '22:00' },
      saturday: { open: '07:00', close: '22:00' },
      sunday: { open: '07:00', close: '21:00' }
    },
    amenities: ['WiFi', 'Security Presence', 'Public Area', 'Good Lighting'],
    verified: true,
    createdAt: new Date()
  },
  {
    id: '5',
    name: 'Johannesburg Central Police Station',
    address: '1 Commissioner St, Johannesburg, 2001',
    coordinates: { latitude: -26.2041, longitude: 28.0473 },
    type: 'police_station',
    safetyRating: 5.0,
    operatingHours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    amenities: ['Maximum Security', 'Police Presence', 'Public Access', 'Emergency Services'],
    verified: true,
    createdAt: new Date()
  },
  {
    id: '6',
    name: 'Durban Community Centre',
    address: '121 Anton Lembede St, Durban Central, Durban, 4001',
    coordinates: { latitude: -29.8587, longitude: 31.0218 },
    type: 'community_center',
    safetyRating: 4.3,
    operatingHours: {
      monday: { open: '08:00', close: '17:00' },
      tuesday: { open: '08:00', close: '17:00' },
      wednesday: { open: '08:00', close: '17:00' },
      thursday: { open: '08:00', close: '17:00' },
      friday: { open: '08:00', close: '16:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: null
    },
    amenities: ['Community Support', 'Public Access', 'Meeting Rooms', 'Security'],
    verified: true,
    createdAt: new Date()
  }
]

export default function SafeMeetingLocations({
  userLocation,
  onLocationSelect,
  showHeader = true
}: SafeMeetingLocationsProps) {
  const [locations, setLocations] = useState<SafeMeetingLocation[]>([])
  const [filteredLocations, setFilteredLocations] = useState<SafeMeetingLocation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSafeLocations()
  }, [userLocation])

  useEffect(() => {
    filterLocations()
  }, [locations, searchTerm, selectedType])

  const loadSafeLocations = async () => {
    try {
      setIsLoading(true)
      // In real implementation, this would filter by user's location
      // For now, we'll show demo locations based on major SA cities
      let relevantLocations = DEMO_SAFE_LOCATIONS

      if (userLocation) {
        // Filter by city - in real implementation, this would use coordinates
        const cityKeywords = userLocation.toLowerCase()
        if (cityKeywords.includes('cape town')) {
          relevantLocations = DEMO_SAFE_LOCATIONS.filter(loc =>
            loc.address.toLowerCase().includes('cape town')
          )
        } else if (cityKeywords.includes('johannesburg') || cityKeywords.includes('sandton')) {
          relevantLocations = DEMO_SAFE_LOCATIONS.filter(loc =>
            loc.address.toLowerCase().includes('johannesburg') ||
            loc.address.toLowerCase().includes('sandton')
          )
        } else if (cityKeywords.includes('pretoria')) {
          relevantLocations = DEMO_SAFE_LOCATIONS.filter(loc =>
            loc.address.toLowerCase().includes('pretoria')
          )
        } else if (cityKeywords.includes('durban')) {
          relevantLocations = DEMO_SAFE_LOCATIONS.filter(loc =>
            loc.address.toLowerCase().includes('durban')
          )
        }
      }

      setLocations(relevantLocations)
    } catch (error) {
      console.error('Error loading safe locations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterLocations = () => {
    let filtered = locations

    if (searchTerm) {
      filtered = filtered.filter(location =>
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (selectedType !== 'all') {
      filtered = filtered.filter(location => location.type === selectedType)
    }

    // Sort by safety rating (highest first)
    filtered.sort((a, b) => b.safetyRating - a.safetyRating)

    setFilteredLocations(filtered)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shopping_mall':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        )
      case 'library':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      case 'coffee_shop':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'community_center':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      case 'police_station':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
    }
  }

  const getSafetyBadgeColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-100 text-green-800'
    if (rating >= 4.0) return 'bg-secondary-100 text-secondary-800'
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatOperatingHours = (location: SafeMeetingLocation) => {
    const today = new Date().toLocaleDateString('en', { weekday: 'long' }).toLowerCase()
    const todayHours = location.operatingHours[today as keyof typeof location.operatingHours]

    if (!todayHours) return 'Closed today'
    if (todayHours.open === '00:00' && todayHours.close === '23:59') return 'Open 24 hours'
    return `Open ${todayHours.open} - ${todayHours.close}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Safe Meeting Locations</h2>
          <p className="text-gray-600">
            Recommended public places for safe initial meetings and gig discussions
          </p>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="shopping_mall">Shopping Malls</option>
          <option value="library">Libraries</option>
          <option value="coffee_shop">Coffee Shops</option>
          <option value="community_center">Community Centers</option>
          <option value="police_station">Police Stations</option>
        </select>
      </div>

      {/* Locations Grid */}
      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Safe Locations Found</h3>
            <p className="text-gray-600">
              {userLocation
                ? `No safe meeting locations found in ${userLocation}. Try expanding your search area.`
                : 'Try searching for a specific area or city.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredLocations.map((location) => (
            <Card key={location.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-start space-x-3">
                      <div className="text-gray-400 mt-1">
                        {getTypeIcon(location.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900">{location.name}</h3>
                          {location.verified && (
                            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{location.address}</p>
                        <p className="text-sm text-gray-500 mb-2">{formatOperatingHours(location)}</p>

                        {/* Amenities */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {location.amenities.slice(0, 4).map((amenity, index) => (
                            <span
                              key={index}
                              className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                          {location.amenities.length > 4 && (
                            <span className="text-xs text-gray-500">
                              +{location.amenities.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSafetyBadgeColor(location.safetyRating)}`}>
                      {location.safetyRating}/5 Safe
                    </div>
                    {onLocationSelect && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLocationSelect(location)}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Safety Tips */}
      <Card className="bg-secondary-50 border-secondary-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="text-secondary-600 mt-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-secondary-900 mb-1">Meeting Safety Tips</h4>
              <ul className="text-sm text-secondary-800 space-y-1">
                <li>• Always meet in well-lit, public places during business hours</li>
                <li>• Inform a friend or family member about your meeting location and time</li>
                <li>• Arrive early to familiarize yourself with the location and exits</li>
                <li>• Trust your instincts - if something feels wrong, leave immediately</li>
                <li>• Keep your phone charged and emergency contacts accessible</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}