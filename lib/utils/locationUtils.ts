import { Coordinates, DistanceInfo, SA_CITIES } from '@/types/location'
import { SA_LOCATIONS_DATABASE } from '@/lib/data/saLocations'

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param coord1 First coordinate point
 * @param coord2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRadians(coord2.latitude - coord1.latitude)
  const dLon = toRadians(coord2.longitude - coord1.longitude)

  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(toRadians(coord1.latitude)) * Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon/2) * Math.sin(dLon/2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180)
}

/**
 * Get distance information between two coordinates
 * @param coord1 Starting coordinate
 * @param coord2 Destination coordinate
 * @returns Distance information object
 */
export function getDistanceInfo(coord1: Coordinates, coord2: Coordinates): DistanceInfo {
  const distance = calculateDistance(coord1, coord2)

  // Estimate travel time (assuming average speed of 50 km/h in urban areas)
  const estimatedTravelTime = Math.round((distance / 50) * 60) // Convert to minutes

  return {
    distance,
    unit: 'km',
    travelTime: estimatedTravelTime
  }
}

/**
 * Check if a coordinate is within a specified radius of another coordinate
 * @param center Center coordinate
 * @param target Target coordinate to check
 * @param radius Radius in kilometers
 * @returns True if target is within radius
 */
export function isWithinRadius(center: Coordinates, target: Coordinates, radius: number): boolean {
  const distance = calculateDistance(center, target)
  return distance <= radius
}

/**
 * Find the nearest SA location to given coordinates
 * @param coordinates User's coordinates
 * @returns Nearest SA location information
 */
export function getNearestCity(coordinates: Coordinates) {
  // Use comprehensive SA locations database (100+ locations including townships/suburbs)
  let nearestLocation = SA_LOCATIONS_DATABASE[0]
  let nearestDistance = calculateDistance(coordinates, SA_LOCATIONS_DATABASE[0].coordinates)

  for (let i = 1; i < SA_LOCATIONS_DATABASE.length; i++) {
    const distance = calculateDistance(coordinates, SA_LOCATIONS_DATABASE[i].coordinates)
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLocation = SA_LOCATIONS_DATABASE[i]
    }
  }

  // Return in the same format as before for backwards compatibility
  return {
    city: {
      name: nearestLocation.name,
      coordinates: nearestLocation.coordinates,
      province: nearestLocation.province
    },
    distance: nearestDistance
  }
}

/**
 * Get coordinates for a SA location by name (supports cities, townships, suburbs)
 * @param locationName Name of the location
 * @returns Coordinates if found, null otherwise
 */
export function getCityCoordinates(locationName: string): Coordinates | null {
  const searchTerm = locationName.toLowerCase().trim()

  // Search through comprehensive SA locations database (100+ locations)
  const location = SA_LOCATIONS_DATABASE.find(loc => {
    // Check exact name match
    if (loc.name.toLowerCase() === searchTerm) {
      return true
    }

    // Check aliases (e.g., "Jozi" for Johannesburg, "PMB" for Pietermaritzburg)
    if (loc.aliases) {
      return loc.aliases.some(alias => alias.toLowerCase() === searchTerm)
    }

    return false
  })

  if (location) {
    return location.coordinates
  }

  // Fallback to old SA_CITIES array for backwards compatibility
  const city = SA_CITIES.find(c =>
    c.name.toLowerCase() === searchTerm
  )
  return city ? city.coordinates : null
}

/**
 * Sort an array of items with coordinates by distance from a reference point
 * @param items Array of items with coordinates
 * @param referencePoint Reference coordinates to sort from
 * @param getCoordinates Function to extract coordinates from each item
 * @returns Sorted array with distance information
 */
export function sortByDistance<T>(
  items: T[],
  referencePoint: Coordinates,
  getCoordinates: (item: T) => Coordinates | null
): Array<T & { distanceInfo?: DistanceInfo }> {
  return items
    .map(item => {
      const itemCoords = getCoordinates(item)
      if (!itemCoords) {
        return { ...item, distanceInfo: undefined }
      }

      const distanceInfo = getDistanceInfo(referencePoint, itemCoords)
      return { ...item, distanceInfo }
    })
    .sort((a, b) => {
      // Items without coordinates go to the end
      if (!a.distanceInfo && !b.distanceInfo) return 0
      if (!a.distanceInfo) return 1
      if (!b.distanceInfo) return -1

      return a.distanceInfo.distance - b.distanceInfo.distance
    })
}

/**
 * Filter items by radius from a reference point
 * @param items Array of items with coordinates
 * @param referencePoint Reference coordinates
 * @param radius Radius in kilometers
 * @param getCoordinates Function to extract coordinates from each item
 * @returns Filtered array of items within radius
 */
export function filterByRadius<T>(
  items: T[],
  referencePoint: Coordinates,
  radius: number,
  getCoordinates: (item: T) => Coordinates | null
): T[] {
  return items.filter(item => {
    const itemCoords = getCoordinates(item)
    if (!itemCoords) return false

    return isWithinRadius(referencePoint, itemCoords, radius)
  })
}

/**
 * Get user's current location using browser geolocation API
 * @param options Geolocation options
 * @returns Promise that resolves to coordinates or null if denied/unavailable
 */
export function getCurrentLocation(options?: PositionOptions): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser')
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => {
        console.warn('Error getting location:', error.message)
        resolve(null)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
        ...options
      }
    )
  })
}

/**
 * Format distance for display
 * @param distance Distance in kilometers
 * @returns Formatted distance string
 */
export function formatDistance(distance: number): string {
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`
  } else {
    return `${Math.round(distance)}km`
  }
}

/**
 * Format travel time for display
 * @param minutes Travel time in minutes
 * @returns Formatted time string
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  } else {
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours} hr`
    } else {
      return `${hours} hr ${remainingMinutes} min`
    }
  }
}