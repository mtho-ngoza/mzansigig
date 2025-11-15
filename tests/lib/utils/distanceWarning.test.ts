import { checkDistanceWarning, formatDistanceWarningMessage, DISTANCE_WARNING_THRESHOLD_KM } from '@/lib/utils/distanceWarning'
import { Gig } from '@/types/gig'
import { Coordinates } from '@/types/location'

describe('Distance Warning Utilities', () => {
  const userLocation: Coordinates = {
    latitude: -26.2041, // Johannesburg
    longitude: 28.0473
  }

  const farGigLocationPretoria: Coordinates = {
    latitude: -25.7479, // Pretoria (approx 54km from Johannesburg)
    longitude: 28.2293
  }

  const farGigLocation: Coordinates = {
    latitude: -29.8587, // Durban (approx 550km from Johannesburg)
    longitude: 31.0218
  }

  const createMockGig = (workType: 'remote' | 'physical' | 'hybrid', coordinates?: Coordinates): Partial<Gig> => ({
    id: 'test-gig',
    title: 'Test Gig',
    location: 'Test City',
    workType,
    coordinates
  })

  describe('checkDistanceWarning', () => {
    it('should return null for remote gigs', () => {
      const gig = createMockGig('remote', farGigLocationPretoria) as Gig
      const result = checkDistanceWarning(gig, userLocation)
      expect(result).toBeNull()
    })

    it('should return null for gigs without coordinates', () => {
      const gig = createMockGig('physical') as Gig
      const result = checkDistanceWarning(gig, userLocation)
      expect(result).toBeNull()
    })

    it('should return null when user has no location', () => {
      const gig = createMockGig('physical', farGigLocationPretoria) as Gig
      const result = checkDistanceWarning(gig, null)
      expect(result).toBeNull()
    })

    it('should return warning info with shouldWarn=false for nearby physical gigs (< 50km)', () => {
      // Create a gig very close to user location (< 50km)
      const closeLocation: Coordinates = {
        latitude: -26.2500, // ~5km from Johannesburg
        longitude: 28.0500
      }
      const gig = createMockGig('physical', closeLocation) as Gig
      const result = checkDistanceWarning(gig, userLocation)

      expect(result).not.toBeNull()
      expect(result?.shouldWarn).toBe(false)
      expect(result?.distance).toBeLessThan(DISTANCE_WARNING_THRESHOLD_KM)
    })

    it('should return warning info with shouldWarn=true for far physical gigs (>= 50km)', () => {
      const gig = createMockGig('physical', farGigLocationPretoria) as Gig
      const result = checkDistanceWarning(gig, userLocation)

      expect(result).not.toBeNull()
      expect(result?.shouldWarn).toBe(true)
      expect(result?.distance).toBeGreaterThanOrEqual(DISTANCE_WARNING_THRESHOLD_KM)
    })

    it('should return correct distance and travel time', () => {
      const gig = createMockGig('physical', farGigLocation) as Gig
      const result = checkDistanceWarning(gig, userLocation)

      expect(result).not.toBeNull()
      expect(result?.distance).toBeGreaterThan(500) // Johannesburg to Durban
      expect(result?.travelTime).toBeGreaterThan(0)
      expect(result?.gigLocation).toEqual(farGigLocation)
      expect(result?.userLocation).toEqual(userLocation)
    })

    it('should check hybrid gigs with coordinates', () => {
      // Hybrid gigs should also be checked for distance since they require physical presence
      const gig = createMockGig('hybrid', farGigLocationPretoria) as Gig
      const result = checkDistanceWarning(gig, userLocation)

      expect(result).not.toBeNull()
      expect(result?.shouldWarn).toBe(true)
    })
  })

  describe('formatDistanceWarningMessage', () => {
    it('should format message for distances < 10km with one decimal', () => {
      const warningInfo = {
        distance: 5.7,
        travelTime: 7,
        gigLocation: farGigLocationPretoria,
        userLocation,
        shouldWarn: false
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('5.7km')
      expect(message).toContain('7 minutes')
    })

    it('should format message for distances >= 10km as rounded', () => {
      const warningInfo = {
        distance: 55.8,
        travelTime: 67,
        gigLocation: farGigLocationPretoria,
        userLocation,
        shouldWarn: true
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('56km')
      expect(message).toContain('1 hours 7 minutes')
    })

    it('should format travel time in minutes when < 60', () => {
      const warningInfo = {
        distance: 25.0,
        travelTime: 30,
        gigLocation: farGigLocationPretoria,
        userLocation,
        shouldWarn: false
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('30 minutes')
    })

    it('should format travel time in hours and minutes when >= 60', () => {
      const warningInfo = {
        distance: 100.0,
        travelTime: 120,
        gigLocation: farGigLocationPretoria,
        userLocation,
        shouldWarn: true
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('2 hours 0 minutes')
    })

    it('should format travel time in hours only when minutes is 0', () => {
      const warningInfo = {
        distance: 150.0,
        travelTime: 180,
        gigLocation: farGigLocation,
        userLocation,
        shouldWarn: true
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('3 hours 0 minutes')
    })

    it('should include distance and travel time in message', () => {
      const warningInfo = {
        distance: 52.0,
        travelTime: 62,
        gigLocation: farGigLocationPretoria,
        userLocation,
        shouldWarn: true
      }

      const message = formatDistanceWarningMessage(warningInfo)
      expect(message).toContain('This gig is')
      expect(message).toContain('away from your location')
      expect(message).toContain('approximately')
      expect(message).toContain('travel time')
    })
  })

  describe('DISTANCE_WARNING_THRESHOLD_KM', () => {
    it('should be set to 50km', () => {
      expect(DISTANCE_WARNING_THRESHOLD_KM).toBe(50)
    })
  })
})
