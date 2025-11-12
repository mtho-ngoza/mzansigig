/**
 * Fuzzy search utility for SA location autocomplete
 * Optimized for township, suburb, and city search with alias support
 */

import { SALocation, SA_LOCATIONS_DATABASE } from '@/lib/data/saLocations'

export interface LocationSearchResult extends SALocation {
  matchScore: number // Higher is better match (0-100)
  matchReason: 'exact' | 'starts-with' | 'contains' | 'alias' | 'parent-city' | 'province' | 'fuzzy'
}

/**
 * Calculate Levenshtein distance between two strings (for fuzzy matching)
 * Returns the number of edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[len1][len2]
}

/**
 * Calculate match score for a location against search query
 * Returns score 0-100 (higher is better)
 */
function calculateMatchScore(
  location: SALocation,
  query: string
): { score: number; reason: LocationSearchResult['matchReason'] } {
  const lowerQuery = query.toLowerCase().trim()
  const lowerName = location.name.toLowerCase()

  // Empty query returns no match
  if (!lowerQuery) {
    return { score: 0, reason: 'fuzzy' }
  }

  // Exact match (case-insensitive)
  if (lowerName === lowerQuery) {
    return { score: 100, reason: 'exact' }
  }

  // Starts with query
  if (lowerName.startsWith(lowerQuery)) {
    return { score: 90, reason: 'starts-with' }
  }

  // Check aliases for exact match
  if (location.aliases) {
    for (const alias of location.aliases) {
      const lowerAlias = alias.toLowerCase()
      if (lowerAlias === lowerQuery) {
        return { score: 95, reason: 'alias' }
      }
      if (lowerAlias.startsWith(lowerQuery)) {
        return { score: 85, reason: 'alias' }
      }
    }
  }

  // Contains query
  if (lowerName.includes(lowerQuery)) {
    // Better score if query is closer to start
    const position = lowerName.indexOf(lowerQuery)
    const positionScore = Math.max(0, 80 - position * 2)
    return { score: positionScore, reason: 'contains' }
  }

  // Check aliases for contains
  if (location.aliases) {
    for (const alias of location.aliases) {
      if (alias.toLowerCase().includes(lowerQuery)) {
        return { score: 75, reason: 'alias' }
      }
    }
  }

  // Parent city match (for townships/suburbs)
  if (location.parentCity && location.parentCity.toLowerCase().includes(lowerQuery)) {
    return { score: 60, reason: 'parent-city' }
  }

  // Province match
  if (location.province.toLowerCase().includes(lowerQuery)) {
    return { score: 40, reason: 'province' }
  }

  // Fuzzy match using Levenshtein distance
  const distance = levenshteinDistance(lowerQuery, lowerName)
  const maxLength = Math.max(lowerQuery.length, lowerName.length)
  const similarity = 1 - distance / maxLength

  // Only consider fuzzy matches with >60% similarity
  if (similarity > 0.6) {
    const fuzzyScore = Math.round(similarity * 70) // Max 70 for fuzzy matches
    return { score: fuzzyScore, reason: 'fuzzy' }
  }

  // No match
  return { score: 0, reason: 'fuzzy' }
}

/**
 * Search locations with fuzzy matching and scoring
 * @param query - Search query string
 * @param options - Search options
 * @returns Array of matched locations sorted by relevance
 */
export function searchLocations(
  query: string,
  options: {
    maxResults?: number
    minScore?: number
    filterByProvince?: string
    filterByType?: SALocation['type']
  } = {}
): LocationSearchResult[] {
  const {
    maxResults = 10,
    minScore = 30,
    filterByProvince,
    filterByType
  } = options

  // If query is empty, return top results (cities first)
  if (!query.trim()) {
    let results = SA_LOCATIONS_DATABASE

    if (filterByProvince) {
      results = results.filter(loc => loc.province === filterByProvince)
    }

    if (filterByType) {
      results = results.filter(loc => loc.type === filterByType)
    }

    // Return cities first, then townships, then others
    const typeOrder = { City: 1, Township: 2, Town: 3, Suburb: 4, Remote: 5 }
    return results
      .map(loc => ({ ...loc, matchScore: 50, matchReason: 'fuzzy' as const }))
      .sort((a, b) => typeOrder[a.type] - typeOrder[b.type])
      .slice(0, maxResults)
  }

  // Calculate scores for all locations
  const scoredResults: LocationSearchResult[] = SA_LOCATIONS_DATABASE
    .map(location => {
      const { score, reason } = calculateMatchScore(location, query)
      return {
        ...location,
        matchScore: score,
        matchReason: reason
      }
    })
    .filter(result => result.matchScore >= minScore)

  // Apply filters
  let filteredResults = scoredResults

  if (filterByProvince) {
    filteredResults = filteredResults.filter(loc => loc.province === filterByProvince)
  }

  if (filterByType) {
    filteredResults = filteredResults.filter(loc => loc.type === filterByType)
  }

  // Sort by score (descending) and limit results
  return filteredResults
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults)
}

/**
 * Group search results by province
 */
export function groupResultsByProvince(
  results: LocationSearchResult[]
): Record<string, LocationSearchResult[]> {
  const grouped: Record<string, LocationSearchResult[]> = {}

  for (const result of results) {
    if (!grouped[result.province]) {
      grouped[result.province] = []
    }
    grouped[result.province].push(result)
  }

  return grouped
}

/**
 * Get location suggestions (top matches without query)
 * Useful for showing popular locations when input is empty
 */
export function getLocationSuggestions(options: {
  province?: string
  limit?: number
} = {}): SALocation[] {
  const { province, limit = 8 } = options

  let locations = SA_LOCATIONS_DATABASE

  // Filter by province if specified
  if (province) {
    locations = locations.filter(loc => loc.province === province)
  }

  // Prioritize major cities and townships
  const typeOrder = { City: 1, Township: 2, Town: 3, Suburb: 4, Remote: 5 }

  return locations
    .sort((a, b) => {
      // Sort by type priority
      const typeDiff = typeOrder[a.type] - typeOrder[b.type]
      if (typeDiff !== 0) return typeDiff

      // Then alphabetically
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
}

/**
 * Highlight matching text in location name
 * Returns parts of text with isMatch flag for highlighting
 */
export function highlightMatch(
  text: string,
  query: string
): Array<{ text: string; isMatch: boolean }> {
  if (!query.trim()) {
    return [{ text, isMatch: false }]
  }

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) {
    return [{ text, isMatch: false }]
  }

  const parts: Array<{ text: string; isMatch: boolean }> = []

  // Before match
  if (index > 0) {
    parts.push({ text: text.substring(0, index), isMatch: false })
  }

  // Match
  parts.push({
    text: text.substring(index, index + query.length),
    isMatch: true
  })

  // After match
  if (index + query.length < text.length) {
    parts.push({
      text: text.substring(index + query.length),
      isMatch: false
    })
  }

  return parts
}

/**
 * Get location by exact name or alias
 */
export function findLocationByName(name: string): SALocation | undefined {
  const lowerName = name.toLowerCase().trim()

  return SA_LOCATIONS_DATABASE.find(location => {
    // Check exact name match
    if (location.name.toLowerCase() === lowerName) {
      return true
    }

    // Check alias match
    if (location.aliases) {
      return location.aliases.some(alias => alias.toLowerCase() === lowerName)
    }

    return false
  })
}

/**
 * Validate if a location name exists in database
 */
export function isValidLocation(name: string): boolean {
  return findLocationByName(name) !== undefined
}
