/**
 * Tests for location search utility
 */

import {
  searchLocations,
  groupResultsByProvince,
  getLocationSuggestions,
  highlightMatch,
  findLocationByName,
  isValidLocation
} from '@/lib/utils/locationSearch'

describe('locationSearch', () => {
  describe('searchLocations', () => {
    it('should find exact matches', () => {
      const results = searchLocations('Midrand')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Midrand')
      expect(results[0].matchScore).toBe(100)
      expect(results[0].matchReason).toBe('exact')
    })

    it('should find matches by aliases', () => {
      const results = searchLocations('Jozi')

      expect(results.length).toBeGreaterThan(0)
      const joburg = results.find(r => r.name === 'Johannesburg')
      expect(joburg).toBeDefined()
      expect(joburg?.matchReason).toBe('alias')
    })

    it('should find Pietermaritzburg by PMB alias', () => {
      const results = searchLocations('PMB')

      expect(results.length).toBeGreaterThan(0)
      const pmb = results.find(r => r.name === 'Pietermaritzburg')
      expect(pmb).toBeDefined()
      expect(pmb?.matchReason).toBe('alias')
    })

    it('should handle partial matches', () => {
      const results = searchLocations('Midr')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Midrand')
      expect(results[0].matchReason).toBe('starts-with')
    })

    it('should handle case-insensitive search', () => {
      const results = searchLocations('midrand')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Midrand')
    })

    it('should find townships', () => {
      const results = searchLocations('Soweto')

      expect(results.length).toBeGreaterThan(0)
      expect(results[0].name).toBe('Soweto')
      expect(results[0].type).toBe('Township')
    })

    it('should find locations by parent city', () => {
      const results = searchLocations('Johannesburg', { maxResults: 20 })

      // Should find Johannesburg itself
      const joburg = results.find(r => r.name === 'Johannesburg')
      expect(joburg).toBeDefined()

      // Should also find townships/suburbs in Johannesburg
      const soweto = results.find(r => r.name === 'Soweto')
      expect(soweto).toBeDefined()
    })

    it('should respect maxResults limit', () => {
      const results = searchLocations('a', { maxResults: 5 })

      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should filter by province', () => {
      const results = searchLocations('', {
        filterByProvince: 'Gauteng',
        maxResults: 20
      })

      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.province).toBe('Gauteng')
      })
    })

    it('should filter by type', () => {
      const results = searchLocations('', {
        filterByType: 'Township',
        maxResults: 20
      })

      expect(results.length).toBeGreaterThan(0)
      results.forEach(result => {
        expect(result.type).toBe('Township')
      })
    })

    it('should return sorted results by match score', () => {
      const results = searchLocations('rand')

      expect(results.length).toBeGreaterThan(1)

      // Verify scores are in descending order
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].matchScore).toBeGreaterThanOrEqual(results[i].matchScore)
      }
    })

    it('should handle empty query', () => {
      const results = searchLocations('', { maxResults: 10 })

      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(10)
    })

    it('should handle typos with fuzzy matching', () => {
      const results = searchLocations('Midarnd', { minScore: 50 })

      const midrand = results.find(r => r.name === 'Midrand')
      expect(midrand).toBeDefined()
    })

    it('should find KZN locations', () => {
      const durban = searchLocations('Durban')
      expect(durban.length).toBeGreaterThan(0)
      expect(durban[0].name).toBe('Durban')
      expect(durban[0].province).toBe('KwaZulu-Natal')

      const umlazi = searchLocations('Umlazi')
      expect(umlazi.length).toBeGreaterThan(0)
      expect(umlazi[0].name).toBe('Umlazi')
      expect(umlazi[0].type).toBe('Township')
    })

    it('should respect minimum score threshold', () => {
      const results = searchLocations('xyz', { minScore: 30 })

      // Should return no results for nonsense query
      expect(results.length).toBe(0)
    })
  })

  describe('groupResultsByProvince', () => {
    it('should group results by province', () => {
      const results = searchLocations('', { maxResults: 20 })
      const grouped = groupResultsByProvince(results)

      expect(Object.keys(grouped).length).toBeGreaterThan(0)

      Object.entries(grouped).forEach(([province, locations]) => {
        locations.forEach(loc => {
          expect(loc.province).toBe(province)
        })
      })
    })

    it('should handle empty results', () => {
      const grouped = groupResultsByProvince([])

      expect(Object.keys(grouped).length).toBe(0)
    })

    it('should group Gauteng locations together', () => {
      const results = searchLocations('', {
        filterByProvince: 'Gauteng',
        maxResults: 10
      })
      const grouped = groupResultsByProvince(results)

      expect(grouped['Gauteng']).toBeDefined()
      expect(grouped['Gauteng'].length).toBe(results.length)
    })
  })

  describe('getLocationSuggestions', () => {
    it('should return location suggestions', () => {
      const suggestions = getLocationSuggestions()

      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.length).toBeLessThanOrEqual(8)
    })

    it('should respect limit parameter', () => {
      const suggestions = getLocationSuggestions({ limit: 5 })

      expect(suggestions.length).toBeLessThanOrEqual(5)
    })

    it('should filter by province', () => {
      const suggestions = getLocationSuggestions({ province: 'Gauteng' })

      expect(suggestions.length).toBeGreaterThan(0)
      suggestions.forEach(loc => {
        expect(loc.province).toBe('Gauteng')
      })
    })

    it('should prioritize cities', () => {
      const suggestions = getLocationSuggestions({ limit: 10 })

      // First few should be cities
      expect(['City', 'Township']).toContain(suggestions[0].type)
    })

    it('should return KZN suggestions', () => {
      const suggestions = getLocationSuggestions({
        province: 'KwaZulu-Natal',
        limit: 5
      })

      expect(suggestions.length).toBeGreaterThan(0)
      suggestions.forEach(loc => {
        expect(loc.province).toBe('KwaZulu-Natal')
      })
    })
  })

  describe('highlightMatch', () => {
    it('should highlight matching text', () => {
      const parts = highlightMatch('Midrand', 'mid')

      expect(parts.length).toBeGreaterThan(1)
      expect(parts[0].text).toBe('Mid')
      expect(parts[0].isMatch).toBe(true)
      expect(parts[1].text).toBe('rand')
      expect(parts[1].isMatch).toBe(false)
    })

    it('should handle case-insensitive highlighting', () => {
      const parts = highlightMatch('Midrand', 'MID')

      expect(parts.length).toBeGreaterThan(1)
      expect(parts[0].text).toBe('Mid')
      expect(parts[0].isMatch).toBe(true)
    })

    it('should handle no match', () => {
      const parts = highlightMatch('Midrand', 'xyz')

      expect(parts.length).toBe(1)
      expect(parts[0].text).toBe('Midrand')
      expect(parts[0].isMatch).toBe(false)
    })

    it('should handle empty query', () => {
      const parts = highlightMatch('Midrand', '')

      expect(parts.length).toBe(1)
      expect(parts[0].text).toBe('Midrand')
      expect(parts[0].isMatch).toBe(false)
    })

    it('should handle match in middle', () => {
      const parts = highlightMatch('Pietermaritzburg', 'maritz')

      expect(parts.length).toBe(3)
      expect(parts[0].isMatch).toBe(false)
      expect(parts[1].isMatch).toBe(true)
      expect(parts[2].isMatch).toBe(false)
    })
  })

  describe('findLocationByName', () => {
    it('should find location by exact name', () => {
      const location = findLocationByName('Midrand')

      expect(location).toBeDefined()
      expect(location?.name).toBe('Midrand')
    })

    it('should find location by alias', () => {
      const location = findLocationByName('Jozi')

      expect(location).toBeDefined()
      expect(location?.name).toBe('Johannesburg')
    })

    it('should handle case-insensitive search', () => {
      const location = findLocationByName('midrand')

      expect(location).toBeDefined()
      expect(location?.name).toBe('Midrand')
    })

    it('should return undefined for non-existent location', () => {
      const location = findLocationByName('NonExistentCity')

      expect(location).toBeUndefined()
    })

    it('should find PMB by alias', () => {
      const location = findLocationByName('PMB')

      expect(location).toBeDefined()
      expect(location?.name).toBe('Pietermaritzburg')
    })
  })

  describe('isValidLocation', () => {
    it('should validate existing location', () => {
      expect(isValidLocation('Midrand')).toBe(true)
      expect(isValidLocation('Pietermaritzburg')).toBe(true)
      expect(isValidLocation('Soweto')).toBe(true)
    })

    it('should validate location by alias', () => {
      expect(isValidLocation('Jozi')).toBe(true)
      expect(isValidLocation('PMB')).toBe(true)
    })

    it('should reject non-existent location', () => {
      expect(isValidLocation('NonExistentCity')).toBe(false)
    })

    it('should handle case-insensitive validation', () => {
      expect(isValidLocation('midrand')).toBe(true)
      expect(isValidLocation('MIDRAND')).toBe(true)
    })
  })

  describe('Beta testing locations', () => {
    it('should find all key Gauteng beta test locations', () => {
      const gautengLocations = [
        'Midrand',
        'Johannesburg',
        'Pretoria',
        'Soweto',
        'Alexandra',
        'Sandton'
      ]

      gautengLocations.forEach(location => {
        const results = searchLocations(location)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].name).toBe(location)
        expect(results[0].province).toBe('Gauteng')
      })
    })

    it('should find all key KZN beta test locations', () => {
      const kznLocations = [
        'Pietermaritzburg',
        'Durban',
        'Umlazi',
        'Phoenix',
        'Chatsworth'
      ]

      kznLocations.forEach(location => {
        const results = searchLocations(location)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].name).toBe(location)
        expect(results[0].province).toBe('KwaZulu-Natal')
      })
    })
  })
})
