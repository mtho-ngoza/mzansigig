'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Coordinates, UserLocation, LocationFilter } from '@/types/location'
import { LocationService } from '@/lib/services/locationService'
import { useToast } from './ToastContext'

export interface LocationContextType {
  // Location state
  userLocation: UserLocation | null
  currentCoordinates: Coordinates | null
  locationPermissionGranted: boolean
  isLoadingLocation: boolean

  // Location filter state
  locationFilter: LocationFilter | null
  radiusKm: number
  showLocationFilters: boolean

  // Location actions
  requestLocationPermission: () => Promise<void>
  refreshLocation: () => Promise<void>
  clearLocation: () => void

  // Filter actions
  setLocationFilter: (filter: LocationFilter | null) => void
  setRadiusKm: (radius: number) => void
  setShowLocationFilters: (show: boolean) => void

  // Utility functions
  getEffectiveCoordinates: () => Promise<Coordinates | null>
  isLocationFilterActive: () => boolean
}

export const LocationContext = createContext<LocationContextType | null>(null)

interface LocationProviderProps {
  children: ReactNode
}

export function LocationProvider({ children }: LocationProviderProps) {
  const { success, error } = useToast()

  // Location state
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [currentCoordinates, setCurrentCoordinates] = useState<Coordinates | null>(null)
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(false)
  const [isLoadingLocation, setIsLoadingLocation] = useState(false)

  // Filter state
  const [locationFilter, setLocationFilter] = useState<LocationFilter | null>(null)
  const [radiusKm, setRadiusKm] = useState(25) // Default 25km radius
  const [showLocationFilters, setShowLocationFilters] = useState(false)

  // Initialize location on mount
  useEffect(() => {
    console.log('LocationContext: initializing location')
    initializeLocation()
  }, [])

  // Update current coordinates when userLocation changes
  useEffect(() => {
    console.log('LocationContext: userLocation changed', userLocation)
    if (userLocation?.current) {
      setCurrentCoordinates(userLocation.current)
    }
  }, [userLocation])

  const initializeLocation = async () => {
    try {
      setIsLoadingLocation(true)

      // Check for stored location
      const storedLocation = LocationService.getStoredLocation()
      if (storedLocation) {
        setUserLocation(storedLocation)
        setLocationPermissionGranted(storedLocation.allowLocationAccess)

        // Try to refresh if permission was granted
        if (storedLocation.allowLocationAccess) {
          const refreshed = await LocationService.refreshLocation()
          if (refreshed) {
            setUserLocation(refreshed)
          }
        }
      }

      // Check permission status
      const permissionStatus = await LocationService.getLocationPermissionStatus()
      if (permissionStatus === 'granted') {
        setLocationPermissionGranted(true)
      }
    } catch (err) {
      console.error('Error initializing location:', err)
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const requestLocationPermission = async () => {
    try {
      setIsLoadingLocation(true)

      if (!LocationService.isGeolocationSupported()) {
        error('Location services are not supported by your browser')
        return
      }

      const location = await LocationService.requestLocationPermission()
      setUserLocation(location)
      setLocationPermissionGranted(location.allowLocationAccess)

      if (location.allowLocationAccess) {
        success('Location access granted! Gigs will now be sorted by distance.')
      } else {
        error('Location access denied. You can still browse all gigs.')
      }
    } catch (err) {
      console.error('Error requesting location permission:', err)
      error('Failed to access location. Please try again.')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const refreshLocation = async () => {
    try {
      setIsLoadingLocation(true)
      const refreshed = await LocationService.refreshLocation()

      if (refreshed) {
        setUserLocation(refreshed)
        success('Location updated')
      }
    } catch (err) {
      console.error('Error refreshing location:', err)
      error('Failed to update location')
    } finally {
      setIsLoadingLocation(false)
    }
  }

  const clearLocation = () => {
    LocationService.clearStoredLocation()
    setUserLocation(null)
    setCurrentCoordinates(null)
    setLocationPermissionGranted(false)
    setLocationFilter(null)
    success('Location data cleared')
  }

  const handleSetLocationFilter = (filter: LocationFilter | null) => {
    setLocationFilter(filter)
    if (filter) {
      setCurrentCoordinates(filter.center)
    }
  }

  const getEffectiveCoordinates = async (): Promise<Coordinates | null> => {
    // Priority: Location filter > Current location > Stored location
    if (locationFilter) {
      return locationFilter.center
    }

    return await LocationService.getEffectiveUserLocation()
  }

  const isLocationFilterActive = (): boolean => {
    return locationFilter !== null || (Boolean(userLocation?.allowLocationAccess) && currentCoordinates !== null)
  }

  const contextValue: LocationContextType = {
    // Location state
    userLocation,
    currentCoordinates,
    locationPermissionGranted,
    isLoadingLocation,

    // Filter state
    locationFilter,
    radiusKm,
    showLocationFilters,

    // Location actions
    requestLocationPermission,
    refreshLocation,
    clearLocation,

    // Filter actions
    setLocationFilter: handleSetLocationFilter,
    setRadiusKm,
    setShowLocationFilters,

    // Utility functions
    getEffectiveCoordinates,
    isLocationFilterActive
  }

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  )
}

export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}