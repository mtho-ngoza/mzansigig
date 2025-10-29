import {
  calculateDistance,
  getDistanceInfo,
  isWithinRadius,
  getNearestCity,
  getCityCoordinates,
  sortByDistance,
  filterByRadius,
  formatDistance,
  formatTravelTime,
} from '@/lib/utils/locationUtils'
import { Coordinates } from '@/types/location'

describe('locationUtils', () => {
  // Test coordinates (Johannesburg and Pretoria)
  const johannesburgCoords: Coordinates = { latitude: -26.2041, longitude: 28.0473 }
  const pretoriaCoords: Coordinates = { latitude: -25.7479, longitude: 28.2293 }
  const capeTownCoords: Coordinates = { latitude: -33.9249, longitude: 18.4241 }

  describe('calculateDistance', () => {
    describe('given two identical coordinates', () => {
      describe('when calculating distance', () => {
        it('then returns 0 kilometers', () => {
          // Given
          const coord1 = johannesburgCoords
          const coord2 = johannesburgCoords

          // When
          const distance = calculateDistance(coord1, coord2)

          // Then
          expect(distance).toBe(0)
        })
      })
    })

    describe('given Johannesburg and Pretoria coordinates', () => {
      describe('when calculating distance', () => {
        it('then returns approximately 54 kilometers', () => {
          // Given
          const coord1 = johannesburgCoords
          const coord2 = pretoriaCoords

          // When
          const distance = calculateDistance(coord1, coord2)

          // Then
          expect(distance).toBeGreaterThan(50)
          expect(distance).toBeLessThan(60)
          expect(distance).toBeCloseTo(54, 0)
        })
      })
    })

    describe('given Johannesburg and Cape Town coordinates', () => {
      describe('when calculating distance', () => {
        it('then returns approximately 1265 kilometers', () => {
          // Given
          const coord1 = johannesburgCoords
          const coord2 = capeTownCoords

          // When
          const distance = calculateDistance(coord1, coord2)

          // Then
          expect(distance).toBeGreaterThan(1200)
          expect(distance).toBeLessThan(1300)
          expect(distance).toBeCloseTo(1265, -1)
        })
      })
    })

    describe('given coordinates with very small distance', () => {
      describe('when calculating distance', () => {
        it('then returns result rounded to 1 decimal place or 0 for identical coords', () => {
          // Given
          const coord1 = { latitude: -26.2041, longitude: 28.0473 }
          const coord2 = { latitude: -26.2142, longitude: 28.0573 }

          // When
          const distance = calculateDistance(coord1, coord2)

          // Then
          expect(distance).toBeGreaterThan(0)
          expect(typeof distance).toBe('number')
          // Verify at most 1 decimal place (distance * 10 should have no fractional part)
          expect((distance * 10) % 1).toBeCloseTo(0, 5)
        })
      })
    })
  })

  describe('getDistanceInfo', () => {
    describe('given two coordinates 50km apart', () => {
      describe('when getting distance info', () => {
        it('then returns correct distance and estimated travel time', () => {
          // Given
          const coord1 = johannesburgCoords
          const coord2 = pretoriaCoords

          // When
          const info = getDistanceInfo(coord1, coord2)

          // Then
          expect(info).toHaveProperty('distance')
          expect(info).toHaveProperty('unit', 'km')
          expect(info).toHaveProperty('travelTime')
          expect(info.distance).toBeGreaterThan(50)
          expect(info.distance).toBeLessThan(60)
          // Travel time should be around 67 minutes (56km / 50km/h * 60)
          expect(info.travelTime).toBeGreaterThan(60)
          expect(info.travelTime).toBeLessThan(75)
        })
      })
    })

    describe('given identical coordinates', () => {
      describe('when getting distance info', () => {
        it('then returns zero distance and zero travel time', () => {
          // Given
          const coord1 = johannesburgCoords
          const coord2 = johannesburgCoords

          // When
          const info = getDistanceInfo(coord1, coord2)

          // Then
          expect(info.distance).toBe(0)
          expect(info.travelTime).toBe(0)
          expect(info.unit).toBe('km')
        })
      })
    })
  })

  describe('isWithinRadius', () => {
    describe('given a target within the specified radius', () => {
      describe('when checking if within radius', () => {
        it('then returns true', () => {
          // Given
          const center = johannesburgCoords
          const target = pretoriaCoords
          const radius = 100 // 100km

          // When
          const result = isWithinRadius(center, target, radius)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given a target outside the specified radius', () => {
      describe('when checking if within radius', () => {
        it('then returns false', () => {
          // Given
          const center = johannesburgCoords
          const target = capeTownCoords
          const radius = 100 // 100km

          // When
          const result = isWithinRadius(center, target, radius)

          // Then
          expect(result).toBe(false)
        })
      })
    })

    describe('given a target exactly at the radius boundary', () => {
      describe('when checking if within radius', () => {
        it('then returns true', () => {
          // Given
          const center = johannesburgCoords
          const target = pretoriaCoords
          const actualDistance = calculateDistance(center, target)
          const radius = actualDistance

          // When
          const result = isWithinRadius(center, target, radius)

          // Then
          expect(result).toBe(true)
        })
      })
    })

    describe('given identical coordinates', () => {
      describe('when checking if within radius', () => {
        it('then returns true regardless of radius', () => {
          // Given
          const center = johannesburgCoords
          const target = johannesburgCoords
          const radius = 1

          // When
          const result = isWithinRadius(center, target, radius)

          // Then
          expect(result).toBe(true)
        })
      })
    })
  })

  describe('getNearestCity', () => {
    describe('given coordinates in Johannesburg', () => {
      describe('when finding nearest city', () => {
        it('then returns Johannesburg as the nearest city', () => {
          // Given
          const coordinates = johannesburgCoords

          // When
          const result = getNearestCity(coordinates)

          // Then
          expect(result.city.name).toBe('Johannesburg')
          expect(result.distance).toBeLessThan(5)
        })
      })
    })

    describe('given coordinates in Cape Town', () => {
      describe('when finding nearest city', () => {
        it('then returns Cape Town as the nearest city', () => {
          // Given
          const coordinates = capeTownCoords

          // When
          const result = getNearestCity(coordinates)

          // Then
          expect(result.city.name).toBe('Cape Town')
          expect(result.distance).toBeLessThan(5)
        })
      })
    })

    describe('given coordinates between two cities', () => {
      describe('when finding nearest city', () => {
        it('then returns the closer city', () => {
          // Given - midpoint between Johannesburg and Pretoria
          const midpoint: Coordinates = {
            latitude: (johannesburgCoords.latitude + pretoriaCoords.latitude) / 2,
            longitude: (johannesburgCoords.longitude + pretoriaCoords.longitude) / 2,
          }

          // When
          const result = getNearestCity(midpoint)

          // Then
          expect(['Johannesburg', 'Pretoria']).toContain(result.city.name)
          expect(result.distance).toBeLessThan(30)
        })
      })
    })
  })

  describe('getCityCoordinates', () => {
    describe('given a valid city name', () => {
      describe('when getting city coordinates', () => {
        it('then returns the correct coordinates', () => {
          // Given
          const cityName = 'Johannesburg'

          // When
          const coordinates = getCityCoordinates(cityName)

          // Then
          expect(coordinates).not.toBeNull()
          expect(coordinates?.latitude).toBeCloseTo(-26.2041, 2)
          expect(coordinates?.longitude).toBeCloseTo(28.0473, 2)
        })
      })
    })

    describe('given a city name with different casing', () => {
      describe('when getting city coordinates', () => {
        it('then returns the coordinates case-insensitively', () => {
          // Given
          const cityName = 'JOHANNESBURG'

          // When
          const coordinates = getCityCoordinates(cityName)

          // Then
          expect(coordinates).not.toBeNull()
          expect(coordinates?.latitude).toBeDefined()
        })
      })
    })

    describe('given an invalid city name', () => {
      describe('when getting city coordinates', () => {
        it('then returns null', () => {
          // Given
          const cityName = 'InvalidCity'

          // When
          const coordinates = getCityCoordinates(cityName)

          // Then
          expect(coordinates).toBeNull()
        })
      })
    })
  })

  describe('sortByDistance', () => {
    interface TestItem {
      id: string
      coords: Coordinates | null
    }

    describe('given items with valid coordinates', () => {
      describe('when sorting by distance', () => {
        it('then returns items sorted by distance ascending', () => {
          // Given
          const items: TestItem[] = [
            { id: 'capetown', coords: capeTownCoords },
            { id: 'jhb', coords: johannesburgCoords },
            { id: 'pretoria', coords: pretoriaCoords },
          ]
          const referencePoint = johannesburgCoords

          // When
          const sorted = sortByDistance(items, referencePoint, item => item.coords)

          // Then
          expect(sorted[0].id).toBe('jhb')
          expect(sorted[1].id).toBe('pretoria')
          expect(sorted[2].id).toBe('capetown')
          expect(sorted[0].distanceInfo?.distance).toBe(0)
        })
      })
    })

    describe('given items with null coordinates', () => {
      describe('when sorting by distance', () => {
        it('then places items with null coordinates at the end', () => {
          // Given
          const items: TestItem[] = [
            { id: 'no-coords', coords: null },
            { id: 'jhb', coords: johannesburgCoords },
            { id: 'pretoria', coords: pretoriaCoords },
          ]
          const referencePoint = johannesburgCoords

          // When
          const sorted = sortByDistance(items, referencePoint, item => item.coords)

          // Then
          expect(sorted[sorted.length - 1].id).toBe('no-coords')
          expect(sorted[sorted.length - 1].distanceInfo).toBeUndefined()
        })
      })
    })

    describe('given mixed items with and without coordinates', () => {
      describe('when sorting by distance', () => {
        it('then groups items with coordinates first, sorted by distance', () => {
          // Given
          const items: TestItem[] = [
            { id: 'no-coords-1', coords: null },
            { id: 'capetown', coords: capeTownCoords },
            { id: 'no-coords-2', coords: null },
            { id: 'pretoria', coords: pretoriaCoords },
          ]
          const referencePoint = johannesburgCoords

          // When
          const sorted = sortByDistance(items, referencePoint, item => item.coords)

          // Then
          expect(sorted[0].id).toBe('pretoria')
          expect(sorted[1].id).toBe('capetown')
          expect(['no-coords-1', 'no-coords-2']).toContain(sorted[2].id)
          expect(['no-coords-1', 'no-coords-2']).toContain(sorted[3].id)
        })
      })
    })

    describe('given an empty array', () => {
      describe('when sorting by distance', () => {
        it('then returns an empty array', () => {
          // Given
          const items: TestItem[] = []
          const referencePoint = johannesburgCoords

          // When
          const sorted = sortByDistance(items, referencePoint, item => item.coords)

          // Then
          expect(sorted).toEqual([])
        })
      })
    })
  })

  describe('filterByRadius', () => {
    interface TestItem {
      id: string
      coords: Coordinates | null
    }

    describe('given items within the specified radius', () => {
      describe('when filtering by radius', () => {
        it('then returns only items within the radius', () => {
          // Given
          const items: TestItem[] = [
            { id: 'jhb', coords: johannesburgCoords },
            { id: 'pretoria', coords: pretoriaCoords },
            { id: 'capetown', coords: capeTownCoords },
          ]
          const referencePoint = johannesburgCoords
          const radius = 100

          // When
          const filtered = filterByRadius(items, referencePoint, radius, item => item.coords)

          // Then
          expect(filtered).toHaveLength(2)
          expect(filtered.map(i => i.id)).toContain('jhb')
          expect(filtered.map(i => i.id)).toContain('pretoria')
          expect(filtered.map(i => i.id)).not.toContain('capetown')
        })
      })
    })

    describe('given items with null coordinates', () => {
      describe('when filtering by radius', () => {
        it('then excludes items with null coordinates', () => {
          // Given
          const items: TestItem[] = [
            { id: 'jhb', coords: johannesburgCoords },
            { id: 'no-coords', coords: null },
          ]
          const referencePoint = johannesburgCoords
          const radius = 100

          // When
          const filtered = filterByRadius(items, referencePoint, radius, item => item.coords)

          // Then
          expect(filtered).toHaveLength(1)
          expect(filtered[0].id).toBe('jhb')
        })
      })
    })

    describe('given a very small radius', () => {
      describe('when filtering by radius', () => {
        it('then returns only very nearby items', () => {
          // Given
          const items: TestItem[] = [
            { id: 'jhb', coords: johannesburgCoords },
            { id: 'pretoria', coords: pretoriaCoords },
          ]
          const referencePoint = johannesburgCoords
          const radius = 1

          // When
          const filtered = filterByRadius(items, referencePoint, radius, item => item.coords)

          // Then
          expect(filtered).toHaveLength(1)
          expect(filtered[0].id).toBe('jhb')
        })
      })
    })

    describe('given no items within radius', () => {
      describe('when filtering by radius', () => {
        it('then returns an empty array', () => {
          // Given
          const items: TestItem[] = [
            { id: 'capetown', coords: capeTownCoords },
          ]
          const referencePoint = johannesburgCoords
          const radius = 10

          // When
          const filtered = filterByRadius(items, referencePoint, radius, item => item.coords)

          // Then
          expect(filtered).toHaveLength(0)
        })
      })
    })
  })

  describe('formatDistance', () => {
    describe('given distance less than 1 kilometer', () => {
      describe('when formatting distance', () => {
        it('then returns distance in meters', () => {
          // Given
          const distance = 0.5

          // When
          const formatted = formatDistance(distance)

          // Then
          expect(formatted).toBe('500m')
        })
      })
    })

    describe('given distance between 1 and 10 kilometers', () => {
      describe('when formatting distance', () => {
        it('then returns distance with 1 decimal place', () => {
          // Given
          const distance = 5.678

          // When
          const formatted = formatDistance(distance)

          // Then
          expect(formatted).toBe('5.7km')
        })
      })
    })

    describe('given distance greater than 10 kilometers', () => {
      describe('when formatting distance', () => {
        it('then returns distance rounded to whole number', () => {
          // Given
          const distance = 125.6

          // When
          const formatted = formatDistance(distance)

          // Then
          expect(formatted).toBe('126km')
        })
      })
    })

    describe('given zero distance', () => {
      describe('when formatting distance', () => {
        it('then returns 0m', () => {
          // Given
          const distance = 0

          // When
          const formatted = formatDistance(distance)

          // Then
          expect(formatted).toBe('0m')
        })
      })
    })
  })

  describe('formatTravelTime', () => {
    describe('given less than 60 minutes', () => {
      describe('when formatting travel time', () => {
        it('then returns minutes only', () => {
          // Given
          const minutes = 45

          // When
          const formatted = formatTravelTime(minutes)

          // Then
          expect(formatted).toBe('45 min')
        })
      })
    })

    describe('given exactly 60 minutes', () => {
      describe('when formatting travel time', () => {
        it('then returns hours only', () => {
          // Given
          const minutes = 60

          // When
          const formatted = formatTravelTime(minutes)

          // Then
          expect(formatted).toBe('1 hr')
        })
      })
    })

    describe('given more than 60 minutes with remainder', () => {
      describe('when formatting travel time', () => {
        it('then returns hours and minutes', () => {
          // Given
          const minutes = 95

          // When
          const formatted = formatTravelTime(minutes)

          // Then
          expect(formatted).toBe('1 hr 35 min')
        })
      })
    })

    describe('given exactly 120 minutes', () => {
      describe('when formatting travel time', () => {
        it('then returns hours only', () => {
          // Given
          const minutes = 120

          // When
          const formatted = formatTravelTime(minutes)

          // Then
          expect(formatted).toBe('2 hr')
        })
      })
    })

    describe('given zero minutes', () => {
      describe('when formatting travel time', () => {
        it('then returns 0 min', () => {
          // Given
          const minutes = 0

          // When
          const formatted = formatTravelTime(minutes)

          // Then
          expect(formatted).toBe('0 min')
        })
      })
    })
  })
})
