import { Coordinates, UserLocation, SA_CITIES } from '@/types/location'
import { getCurrentLocation, getCityCoordinates, getNearestCity } from '@/lib/utils/locationUtils'

export class LocationService {
  private static readonly LOCATION_STORAGE_KEY = 'gigsa_user_location'
  private static readonly PERMISSION_STORAGE_KEY = 'gigsa_location_permission'

  /**
   * Request location permission and get current coordinates
   * @returns Promise that resolves to UserLocation object
   */
  static async requestLocationPermission(): Promise<UserLocation> {
    try {
      const coordinates = await getCurrentLocation()

      if (coordinates) {
        const nearestCity = getNearestCity(coordinates)
        const userLocation: UserLocation = {
          current: coordinates,
          preferred: {
            name: nearestCity.city.name,
            coordinates: coordinates,
            city: nearestCity.city.name,
            province: nearestCity.city.province,
            country: 'South Africa'
          },
          allowLocationAccess: true,
          lastUpdated: new Date()
        }

        // Store location permission and data
        this.saveLocationToStorage(userLocation)
        this.savePermissionStatus(true)

        return userLocation
      } else {
        // Location access denied or unavailable
        const userLocation: UserLocation = {
          allowLocationAccess: false
        }

        this.savePermissionStatus(false)
        return userLocation
      }
    } catch (error) {
      console.error('Error requesting location permission:', error)

      const userLocation: UserLocation = {
        allowLocationAccess: false
      }

      this.savePermissionStatus(false)
      return userLocation
    }
  }

  /**
   * Get stored user location from localStorage
   * @returns Stored UserLocation or null if not available
   */
  static getStoredLocation(): UserLocation | null {
    try {
      const stored = localStorage.getItem(this.LOCATION_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        if (parsed.lastUpdated) {
          parsed.lastUpdated = new Date(parsed.lastUpdated)
        }
        return parsed
      }
      return null
    } catch (error) {
      console.error('Error reading stored location:', error)
      return null
    }
  }

  /**
   * Save location data to localStorage
   * @param location UserLocation object to save
   */
  static saveLocationToStorage(location: UserLocation): void {
    try {
      localStorage.setItem(this.LOCATION_STORAGE_KEY, JSON.stringify(location))
    } catch (error) {
      console.error('Error saving location to storage:', error)
    }
  }

  /**
   * Get stored location permission status
   * @returns Boolean indicating if location access was previously granted
   */
  static getStoredPermissionStatus(): boolean {
    try {
      const stored = localStorage.getItem(this.PERMISSION_STORAGE_KEY)
      return stored === 'true'
    } catch (error) {
      console.error('Error reading permission status:', error)
      return false
    }
  }

  /**
   * Save location permission status
   * @param granted Whether location permission was granted
   */
  static savePermissionStatus(granted: boolean): void {
    try {
      localStorage.setItem(this.PERMISSION_STORAGE_KEY, granted.toString())
    } catch (error) {
      console.error('Error saving permission status:', error)
    }
  }

  /**
   * Refresh current location if permission was previously granted
   * @returns Promise that resolves to updated UserLocation or null
   */
  static async refreshLocation(): Promise<UserLocation | null> {
    const storedLocation = this.getStoredLocation()

    if (!storedLocation || !storedLocation.allowLocationAccess) {
      return null
    }

    // Check if location is stale (older than 1 hour)
    const now = new Date()
    const lastUpdated = storedLocation.lastUpdated || new Date(0)
    const isStale = now.getTime() - lastUpdated.getTime() > 60 * 60 * 1000 // 1 hour

    if (!isStale && storedLocation.current) {
      return storedLocation
    }

    try {
      const coordinates = await getCurrentLocation()

      if (coordinates) {
        const nearestCity = getNearestCity(coordinates)
        const updatedLocation: UserLocation = {
          ...storedLocation,
          current: coordinates,
          preferred: {
            name: nearestCity.city.name,
            coordinates: coordinates,
            city: nearestCity.city.name,
            province: nearestCity.city.province,
            country: 'South Africa'
          },
          lastUpdated: new Date()
        }

        this.saveLocationToStorage(updatedLocation)
        return updatedLocation
      }

      return storedLocation
    } catch (error) {
      console.error('Error refreshing location:', error)
      return storedLocation
    }
  }

  /**
   * Get coordinates for a city name, with fallback to stored or default location
   * @param cityName Name of the city
   * @returns Coordinates if found
   */
  static getLocationCoordinates(cityName: string): Coordinates | null {
    // First try to find exact match in SA cities
    const coordinates = getCityCoordinates(cityName)
    if (coordinates) return coordinates

    // If not found, try partial matches
    const partialMatch = SA_CITIES.find(city =>
      city.name.toLowerCase().includes(cityName.toLowerCase()) ||
      cityName.toLowerCase().includes(city.name.toLowerCase())
    )

    return partialMatch ? partialMatch.coordinates : null
  }

  /**
   * Get user's effective location for filtering gigs
   * Priority: Current GPS > Stored location > Default city
   * @returns Coordinates to use for location-based filtering
   */
  static async getEffectiveUserLocation(): Promise<Coordinates | null> {
    // Try to get fresh location if permission granted
    const location = await this.refreshLocation()

    if (location?.current) {
      return location.current
    }

    // Fall back to stored preferred location
    if (location?.preferred?.coordinates) {
      return location.preferred.coordinates
    }

    // No location available
    return null
  }

  /**
   * Clear all stored location data (for privacy/logout)
   */
  static clearStoredLocation(): void {
    try {
      localStorage.removeItem(this.LOCATION_STORAGE_KEY)
      localStorage.removeItem(this.PERMISSION_STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing location data:', error)
    }
  }

  /**
   * Check if browser supports geolocation
   * @returns Boolean indicating geolocation support
   */
  static isGeolocationSupported(): boolean {
    return 'geolocation' in navigator
  }

  /**
   * Get location permission status without requesting
   * @returns Promise that resolves to permission state
   */
  static async getLocationPermissionStatus(): Promise<PermissionState | null> {
    if (!navigator.permissions) return null

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      return permission.state
    } catch (error) {
      console.error('Error checking location permission:', error)
      return null
    }
  }
}