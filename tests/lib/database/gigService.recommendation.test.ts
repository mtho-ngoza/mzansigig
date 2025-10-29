/**
 * Tests for GigService recommendation algorithm
 * Testing the relevance scoring logic that combines skill matching and distance
 */

import { Gig } from '@/types/gig'
import { Coordinates } from '@/types/location'
import { calculateDistance } from '@/lib/utils/locationUtils'

// We're testing the recommendation logic in isolation
// The actual getRecommendedGigs method would need mocking of Firestore

describe('GigService - Recommendation Algorithm Logic', () => {
  const userLocation: Coordinates = { latitude: -26.2041, longitude: 28.0473 } // Johannesburg
  const userSkills = ['JavaScript', 'React', 'TypeScript']

  const createMockGig = (
    id: string,
    coordinates: Coordinates,
    skillsRequired: string[]
  ): Gig => ({
    id,
    title: `Gig ${id}`,
    description: 'Test gig',
    category: 'technology',
    location: 'Test Location',
    coordinates,
    budget: 5000,
    duration: '2 weeks',
    skillsRequired,
    employerId: 'employer-1',
    employerName: 'Test Employer',
    status: 'open',
    applicants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Helper function to simulate the recommendation scoring logic
  const calculateRelevanceScore = (
    userCoordinates: Coordinates,
    userSkills: string[],
    gig: Gig,
    maxDistance: number
  ) => {
    if (!gig.coordinates) return null

    const distance = calculateDistance(userCoordinates, gig.coordinates)
    if (distance > maxDistance) return null

    const skillMatches = gig.skillsRequired.filter(skill =>
      userSkills.some(userSkill =>
        skill.toLowerCase().includes(userSkill.toLowerCase()) ||
        userSkill.toLowerCase().includes(skill.toLowerCase())
      )
    ).length

    const skillScore = gig.skillsRequired.length > 0 ? skillMatches / gig.skillsRequired.length : 0
    const distanceScore = Math.max(0, 1 - (distance / maxDistance))
    const relevanceScore = (skillScore * 0.6) + (distanceScore * 0.4)

    return {
      distance,
      skillMatches,
      skillScore,
      distanceScore,
      relevanceScore,
    }
  }

  describe('calculateRelevanceScore helper', () => {
    describe('given a gig with perfect skill match and zero distance', () => {
      describe('when calculating relevance score', () => {
        it('then returns maximum relevance score of 1.0', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['JavaScript', 'React', 'TypeScript'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.distance).toBe(0)
          expect(result!.skillMatches).toBe(3)
          expect(result!.skillScore).toBe(1.0)
          expect(result!.distanceScore).toBe(1.0)
          expect(result!.relevanceScore).toBe(1.0)
        })
      })
    })

    describe('given a gig with no skill match but close distance', () => {
      describe('when calculating relevance score', () => {
        it('then returns score weighted 40% from distance', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['Python', 'Django', 'PostgreSQL'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(0)
          expect(result!.skillScore).toBe(0)
          expect(result!.distanceScore).toBe(1.0)
          // 60% * 0 (skills) + 40% * 1.0 (distance) = 0.4
          expect(result!.relevanceScore).toBeCloseTo(0.4, 2)
        })
      })
    })

    describe('given a gig with perfect skill match but at max distance', () => {
      describe('when calculating relevance score', () => {
        it('then returns score weighted 60% from skills', () => {
          // Given
          const farLocation: Coordinates = { latitude: -25.7479, longitude: 28.2293 } // ~56km away
          const gig = createMockGig('gig-1', farLocation, ['JavaScript', 'React', 'TypeScript'])
          const maxDistance = 56

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(3)
          expect(result!.skillScore).toBe(1.0)
          expect(result!.distanceScore).toBeCloseTo(0, 1) // At max distance
          // 60% * 1.0 (skills) + 40% * ~0 (distance) = ~0.6
          expect(result!.relevanceScore).toBeGreaterThan(0.55)
          expect(result!.relevanceScore).toBeLessThan(0.65)
        })
      })
    })

    describe('given a gig beyond max distance', () => {
      describe('when calculating relevance score', () => {
        it('then returns null to exclude it', () => {
          // Given
          const farLocation: Coordinates = { latitude: -33.9249, longitude: 18.4241 } // Cape Town, ~1265km
          const gig = createMockGig('gig-1', farLocation, ['JavaScript', 'React'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given a gig without coordinates', () => {
      describe('when calculating relevance score', () => {
        it('then returns null', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['JavaScript', 'React'])
          gig.coordinates = undefined
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given partial skill match (2 out of 3 skills)', () => {
      describe('when calculating relevance score', () => {
        it('then calculates proportional skill score', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['JavaScript', 'React', 'Python'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(2) // JavaScript and React match
          expect(result!.skillScore).toBeCloseTo(0.667, 2) // 2/3
          expect(result!.distanceScore).toBe(1.0)
          // 60% * 0.667 + 40% * 1.0 = 0.8
          expect(result!.relevanceScore).toBeCloseTo(0.8, 2)
        })
      })
    })

    describe('given case-insensitive skill matching', () => {
      describe('when calculating relevance score', () => {
        it('then matches skills regardless of case', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['javascript', 'REACT', 'typescript'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(3)
          expect(result!.skillScore).toBe(1.0)
        })
      })
    })

    describe('given partial string matching in skills', () => {
      describe('when calculating relevance score', () => {
        it('then matches partial skill names', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['JavaScript ES6', 'React Native', 'TypeScript 5'])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(3) // All should match due to partial string matching
          expect(result!.skillScore).toBe(1.0)
        })
      })
    })

    describe('given gig with no skills required', () => {
      describe('when calculating relevance score', () => {
        it('then skill score is 0 and relies only on distance', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, [])
          const maxDistance = 50

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillScore).toBe(0)
          expect(result!.relevanceScore).toBeCloseTo(0.4, 2) // 40% from distance only
        })
      })
    })

    describe('given user with no skills', () => {
      describe('when calculating relevance score', () => {
        it('then skill matching returns 0 but distance still counts', () => {
          // Given
          const gig = createMockGig('gig-1', userLocation, ['JavaScript', 'React'])
          const maxDistance = 50
          const noSkills: string[] = []

          // When
          const result = calculateRelevanceScore(userLocation, noSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.skillMatches).toBe(0)
          expect(result!.skillScore).toBe(0)
          expect(result!.relevanceScore).toBeCloseTo(0.4, 2) // 40% from distance
        })
      })
    })

    describe('given gig at roughly half the max distance', () => {
      describe('when calculating relevance score', () => {
        it('then distance score is approximately 0.4 to 0.5', () => {
          // Given
          const midDistance: Coordinates = { latitude: -25.9, longitude: 28.15 } // ~35km from JHB
          const gig = createMockGig('gig-1', midDistance, ['JavaScript'])
          const maxDistance = 56

          // When
          const result = calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)

          // Then
          expect(result).not.toBeNull()
          expect(result!.distance).toBeGreaterThan(30)
          expect(result!.distance).toBeLessThan(40)
          expect(result!.distanceScore).toBeGreaterThan(0.35)
          expect(result!.distanceScore).toBeLessThan(0.45)
        })
      })
    })
  })

  describe('sorting by relevance score', () => {
    describe('given multiple gigs with different relevance scores', () => {
      describe('when sorting by relevance', () => {
        it('then returns gigs in descending order of relevance', () => {
          // Given
          const gig1 = createMockGig('gig-1', userLocation, ['Python']) // Low skill match, perfect distance
          const gig2 = createMockGig('gig-2', userLocation, ['JavaScript', 'React', 'TypeScript']) // Perfect match
          const farLocation: Coordinates = { latitude: -25.9, longitude: 28.15 }
          const gig3 = createMockGig('gig-3', farLocation, ['JavaScript', 'React']) // Good skill, medium distance
          const maxDistance = 50

          // When
          const scores = [gig1, gig2, gig3]
            .map(gig => ({
              gig,
              ...calculateRelevanceScore(userLocation, userSkills, gig, maxDistance)
            }))
            .filter(item => item.relevanceScore !== null && item.relevanceScore !== undefined)
            .sort((a, b) => b.relevanceScore! - a.relevanceScore!)

          // Then
          expect(scores[0].gig.id).toBe('gig-2') // Perfect match should be first
          expect(scores[0].relevanceScore).toBe(1.0)
          expect(scores[1].gig.id).toBe('gig-3') // Good skill + medium distance
          expect(scores[2].gig.id).toBe('gig-1') // Only distance, no skills
        })
      })
    })
  })

  describe('weighted scoring formula validation', () => {
    describe('given the 60/40 weighting formula', () => {
      describe('when calculating various scenarios', () => {
        it('then skills are weighted more heavily than distance', () => {
          // Given
          const perfectSkillsNoDistance: Coordinates = { latitude: -25.7479, longitude: 28.2293 } // ~56km
          const gigWithSkills = createMockGig('gig-skills', perfectSkillsNoDistance, ['JavaScript', 'React', 'TypeScript'])

          const noSkillsPerfectDistance = createMockGig('gig-distance', userLocation, ['Python', 'Django'])
          const maxDistance = 56

          // When
          const skillsResult = calculateRelevanceScore(userLocation, userSkills, gigWithSkills, maxDistance)
          const distanceResult = calculateRelevanceScore(userLocation, userSkills, noSkillsPerfectDistance, maxDistance)

          // Then
          // Perfect skills at max distance (60% * 1.0 + 40% * 0) ≈ 0.6
          expect(skillsResult!.relevanceScore).toBeGreaterThan(0.55)
          expect(skillsResult!.relevanceScore).toBeLessThan(0.65)

          // No skills at perfect distance (60% * 0 + 40% * 1.0) = 0.4
          expect(distanceResult!.relevanceScore).toBeCloseTo(0.4, 2)

          // Skills should be weighted more
          expect(skillsResult!.relevanceScore).toBeGreaterThan(distanceResult!.relevanceScore)
        })
      })
    })
  })
})
