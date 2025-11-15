import { Coordinates } from '@/types/location'
import { Gig } from '@/types/gig'
import { calculateDistance, getDistanceInfo } from './locationUtils'

// Distance threshold in kilometers for warning
export const DISTANCE_WARNING_THRESHOLD_KM = 50

/**
 * Check if a gig requires a distance warning
 * @param gig The gig to check
 * @param userLocation User's current location
 * @returns Warning information if distance exceeds threshold, null otherwise
 */
export interface DistanceWarningInfo {
  distance: number
  travelTime: number // in minutes
  gigLocation: Coordinates
  userLocation: Coordinates
  shouldWarn: boolean
}

export function checkDistanceWarning(
  gig: Gig,
  userLocation: Coordinates | null
): DistanceWarningInfo | null {
  // Only check for physical and hybrid gigs (remote gigs don't need location checks)
  if (gig.workType === 'remote') {
    return null
  }

  // If gig has no coordinates, can't check distance
  if (!gig.coordinates) {
    return null
  }

  // If user has no location, can't check distance
  if (!userLocation) {
    return null
  }

  const distance = calculateDistance(userLocation, gig.coordinates)
  const distanceInfo = getDistanceInfo(userLocation, gig.coordinates)

  const shouldWarn = distance >= DISTANCE_WARNING_THRESHOLD_KM

  return {
    distance,
    travelTime: distanceInfo.travelTime || Math.round((distance / 50) * 60), // Fallback calculation if undefined
    gigLocation: gig.coordinates,
    userLocation,
    shouldWarn
  }
}

/**
 * Format distance warning message
 * @param info Distance warning information
 * @returns Formatted warning message
 */
export function formatDistanceWarningMessage(info: DistanceWarningInfo): string {
  const distanceText = info.distance < 10
    ? `${info.distance.toFixed(1)}km`
    : `${Math.round(info.distance)}km`

  const timeText = info.travelTime < 60
    ? `${info.travelTime} minutes`
    : `${Math.floor(info.travelTime / 60)} hours ${info.travelTime % 60} minutes`

  return `This gig is ${distanceText} away from your location (approximately ${timeText} travel time).`
}
