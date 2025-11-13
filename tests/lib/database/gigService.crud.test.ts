import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig, GigApplication } from '@/types/gig'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/utils/locationUtils')

describe('GigService - CRUD Operations', () => {
  const mockGigId = 'gig-123'
  const mockEmployerId = 'employer-456'
  const mockApplicantId = 'applicant-789'

  const mockGigData: Omit<Gig, 'id' | 'createdAt' | 'updatedAt'> = {
    title: 'Web Development Project',
    description: 'Build a responsive website',
    category: 'technology',
    location: 'Johannesburg',
    budget: 5000,
    duration: '2 weeks',
    skillsRequired: ['JavaScript', 'React', 'TypeScript'],
    employerId: mockEmployerId,
    employerName: 'Test Employer',
    status: 'open',
    applicants: [],
    deadline: new Date('2025-12-31'),
  }

  const mockGig: Gig = {
    id: mockGigId,
    ...mockGigData,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createGig', () => {
    describe('given valid gig data without coordinates', () => {
      describe('when creating a gig', () => {
        it('then creates gig with initialized status and applicants array', async () => {
          // Given
          jest.mocked(FirestoreService.create).mockResolvedValue(mockGigId)

          // When
          const gigId = await GigService.createGig(mockGigData)

          // Then
          expect(gigId).toBe(mockGigId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'gigs',
            expect.objectContaining({
              title: mockGigData.title,
              description: mockGigData.description,
              category: mockGigData.category,
              budget: mockGigData.budget,
              employerId: mockGigData.employerId,
              status: 'open',
              applicants: [],
              createdAt: expect.any(Date),
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })

    describe('given gig data with coordinates', () => {
      describe('when creating a gig', () => {
        it('then creates gig preserving coordinates', async () => {
          // Given
          const gigWithCoords = {
            ...mockGigData,
            coordinates: { latitude: -26.2041, longitude: 28.0473 },
          }
          jest.mocked(FirestoreService.create).mockResolvedValue(mockGigId)

          // When
          const gigId = await GigService.createGig(gigWithCoords)

          // Then
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'gigs',
            expect.objectContaining({
              coordinates: gigWithCoords.coordinates,
            })
          )
        })
      })
    })

    describe('given Firestore error', () => {
      describe('when creating gig', () => {
        it('then throws error', async () => {
          // Given
          const errorMessage = 'Permission denied'
          jest
            .mocked(FirestoreService.create)
            .mockRejectedValue(new Error(errorMessage))

          // When & Then
          await expect(GigService.createGig(mockGigData)).rejects.toThrow(errorMessage)
        })
      })
    })
  })

  describe('getGigById', () => {
    describe('given existing gig ID', () => {
      describe('when getting gig', () => {
        it('then returns the gig', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)

          // When
          const gig = await GigService.getGigById(mockGigId)

          // Then
          expect(gig).toEqual(mockGig)
          expect(FirestoreService.getById).toHaveBeenCalledWith('gigs', mockGigId)
        })
      })
    })

    describe('given non-existent gig ID', () => {
      describe('when getting gig', () => {
        it('then returns null', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(null)

          // When
          const gig = await GigService.getGigById('non-existent')

          // Then
          expect(gig).toBeNull()
        })
      })
    })
  })

  describe('updateGig', () => {
    describe('given valid update data', () => {
      describe('when updating gig', () => {
        it('then updates gig with new data and timestamp', async () => {
          // Given
          const updates = { title: 'Updated Title', budget: 6000 }
          jest.mocked(FirestoreService.update).mockResolvedValue()

          // When
          await GigService.updateGig(mockGigId, updates)

          // Then
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'gigs',
            mockGigId,
            expect.objectContaining({
              ...updates,
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })

    describe('given status update', () => {
      describe('when updating gig status', () => {
        it('then updates only status and timestamp', async () => {
          // Given
          const updates = { status: 'cancelled' as const }
          jest.mocked(FirestoreService.update).mockResolvedValue()

          // When
          await GigService.updateGig(mockGigId, updates)

          // Then
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'gigs',
            mockGigId,
            expect.objectContaining({
              status: 'cancelled',
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })
  })

  describe('deleteGig', () => {
    describe('given valid gig ID', () => {
      describe('when deleting gig', () => {
        it('then deletes the gig', async () => {
          // Given
          jest.mocked(FirestoreService.delete).mockResolvedValue()

          // When
          await GigService.deleteGig(mockGigId)

          // Then
          expect(FirestoreService.delete).toHaveBeenCalledWith('gigs', mockGigId)
        })
      })
    })
  })

  describe('getAllGigs', () => {
    describe('given multiple gigs exist', () => {
      describe('when getting all gigs', () => {
        it('then returns all gigs ordered by creation date descending', async () => {
          // Given
          const gigs = [mockGig, { ...mockGig, id: 'gig-2' }]
          jest.mocked(FirestoreService.getAll).mockResolvedValue(gigs)

          // When
          const result = await GigService.getAllGigs()

          // Then
          expect(result).toEqual(gigs)
          expect(FirestoreService.getAll).toHaveBeenCalledWith('gigs', 'createdAt', 'desc', undefined)
        })
      })
    })

    describe('given custom limit', () => {
      describe('when getting all gigs', () => {
        it('then respects the limit', async () => {
          // Given
          const limit = 10
          jest.mocked(FirestoreService.getAll).mockResolvedValue([mockGig])

          // When
          await GigService.getAllGigs(limit)

          // Then
          expect(FirestoreService.getAll).toHaveBeenCalledWith('gigs', 'createdAt', 'desc', limit)
        })
      })
    })
  })

  describe('getGigsByEmployer', () => {
    describe('given employer with gigs', () => {
      describe('when getting employer gigs', () => {
        it('then returns gigs for that employer', async () => {
          // Given
          const employerGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(employerGigs)

          // When
          const result = await GigService.getGigsByEmployer(mockEmployerId)

          // Then
          expect(result).toEqual(employerGigs)
          expect(FirestoreService.getWhere).toHaveBeenCalledWith(
            'gigs',
            'employerId',
            '==',
            mockEmployerId,
            'createdAt'
          )
        })
      })
    })
  })

  describe('getGigsByStatus', () => {
    describe('given gigs with open status', () => {
      describe('when getting open gigs', () => {
        it('then returns only open gigs', async () => {
          // Given
          const openGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(openGigs)

          // When
          const result = await GigService.getGigsByStatus('open')

          // Then
          expect(result).toEqual(openGigs)
          expect(FirestoreService.getWhere).toHaveBeenCalledWith(
            'gigs',
            'status',
            '==',
            'open',
            'createdAt',
            'desc',
            undefined
          )
        })
      })
    })

    describe('given gigs with closed status', () => {
      describe('when getting closed gigs', () => {
        it('then returns only closed gigs', async () => {
          // Given
          const cancelledGigs = [{ ...mockGig, status: 'cancelled' as const }]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(cancelledGigs)

          // When
          const result = await GigService.getGigsByStatus('cancelled')

          // Then
          expect(result).toEqual(cancelledGigs)
          expect(FirestoreService.getWhere).toHaveBeenCalledWith(
            'gigs',
            'status',
            '==',
            'cancelled',
            'createdAt',
            'desc',
            undefined
          )
        })
      })
    })
  })

  describe('searchGigs', () => {
    describe('given search term matching title', () => {
      describe('when searching gigs', () => {
        it('then returns gigs with matching title', async () => {
          // Given
          const allGigs = [mockGig, { ...mockGig, id: 'gig-2', title: 'Design Project' }]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('web')

          // Then
          expect(result).toHaveLength(1)
          expect(result[0].title).toContain('Web')
        })
      })
    })

    describe('given search term matching description', () => {
      describe('when searching gigs', () => {
        it('then returns gigs with matching description', async () => {
          // Given
          const allGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('responsive')

          // Then
          expect(result).toHaveLength(1)
          expect(result[0].description).toContain('responsive')
        })
      })
    })

    describe('given search term matching skills', () => {
      describe('when searching gigs', () => {
        it('then returns gigs with matching skills', async () => {
          // Given
          const allGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('react')

          // Then
          expect(result).toHaveLength(1)
          expect(result[0].skillsRequired).toContain('React')
        })
      })
    })

    describe('given case-insensitive search', () => {
      describe('when searching gigs', () => {
        it('then matches regardless of case', async () => {
          // Given
          const allGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('JAVASCRIPT')

          // Then
          expect(result).toHaveLength(1)
        })
      })
    })

    describe('given no matching gigs', () => {
      describe('when searching gigs', () => {
        it('then returns empty array', async () => {
          // Given
          const allGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('python')

          // Then
          expect(result).toHaveLength(0)
        })
      })
    })

    describe('given empty search term', () => {
      describe('when searching gigs', () => {
        it('then returns all open gigs', async () => {
          // Given
          const allGigs = [mockGig]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(allGigs)

          // When
          const result = await GigService.searchGigs('')

          // Then
          expect(result).toEqual(allGigs)
        })
      })
    })
  })

  describe('createApplication', () => {
    const mockApplicationData = {
      gigId: mockGigId,
      applicantId: mockApplicantId,
      applicantName: 'Test Applicant',
      employerId: mockEmployerId,
      message: 'I am interested in this position',
      proposedRate: 4500,
    }

    describe('given valid application data', () => {
      describe('when creating application', () => {
        it('then creates application without updating gig applicants array', async () => {
          // Given
          const applicationId = 'app-123'
          const mockGig = {
            id: mockGigId,
            status: 'open' as const,
            employerId: mockEmployerId
          }
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)
          jest.mocked(FirestoreService.getWhere).mockResolvedValue([]) // No existing applications
          jest.mocked(FirestoreService.getWhereCompound).mockResolvedValue([]) // No duplicate applications
          jest.mocked(FirestoreService.create).mockResolvedValue(applicationId)

          // When
          const result = await GigService.createApplication(mockApplicationData)

          // Then
          expect(result).toBe(applicationId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'applications',
            expect.objectContaining({
              ...mockApplicationData,
              status: 'pending',
              createdAt: expect.any(Date),
            })
          )
          // Should NOT update gig's applicants array (uses query-based count instead)
          expect(FirestoreService.update).not.toHaveBeenCalledWith(
            'gigs',
            expect.any(String),
            expect.anything()
          )
        })
      })
    })
  })

  describe('calculateUserRating', () => {
    describe('given user with multiple reviews', () => {
      describe('when calculating rating', () => {
        it('then returns average rating', async () => {
          // Given
          const userId = 'user-123'
          const reviews = [
            { id: 'rev-1', rating: 5, revieweeId: userId } as any,
            { id: 'rev-2', rating: 4, revieweeId: userId } as any,
            { id: 'rev-3', rating: 5, revieweeId: userId } as any,
          ]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(reviews)

          // When
          const rating = await GigService.calculateUserRating(userId)

          // Then
          expect(rating).toBeCloseTo(4.67, 1)
        })
      })
    })

    describe('given user with no reviews', () => {
      describe('when calculating rating', () => {
        it('then returns 0', async () => {
          // Given
          const userId = 'user-123'
          jest.mocked(FirestoreService.getWhere).mockResolvedValue([])

          // When
          const rating = await GigService.calculateUserRating(userId)

          // Then
          expect(rating).toBe(0)
        })
      })
    })

    describe('given user with perfect ratings', () => {
      describe('when calculating rating', () => {
        it('then returns 5.0', async () => {
          // Given
          const userId = 'user-123'
          const reviews = [
            { id: 'rev-1', rating: 5, revieweeId: userId } as any,
            { id: 'rev-2', rating: 5, revieweeId: userId } as any,
          ]
          jest.mocked(FirestoreService.getWhere).mockResolvedValue(reviews)

          // When
          const rating = await GigService.calculateUserRating(userId)

          // Then
          expect(rating).toBe(5.0)
        })
      })
    })
  })
})
