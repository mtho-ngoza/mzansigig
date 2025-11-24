import { GigService } from '@/lib/database/gigService'
import { FirestoreService } from '@/lib/database/firestore'
import { Gig } from '@/types/gig'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')
jest.mock('@/lib/utils/locationUtils')
jest.mock('@/lib/utils/gigValidation', () => ({
  sanitizeGigText: jest.fn((text: string) => text.trim()),
  normalizeSkills: jest.fn((skills: string[]) => skills.map(s => s.toLowerCase())),
  GIG_TEXT_LIMITS: {
    TITLE_MAX: 100,
    DESCRIPTION_MAX: 2000,
    OTHER_CATEGORY_MAX: 100,
    TITLE_MIN: 10,
    DESCRIPTION_MIN: 30
  }
}))

describe('GigService - Authorization', () => {
  const mockGigId = 'gig-123'
  const mockOwnerUserId = 'employer-456'
  const mockOtherUserId = 'attacker-789'

  const mockGig: Gig = {
    id: mockGigId,
    title: 'Web Development Project',
    description: 'Build a responsive website with modern UI',
    category: 'technology',
    location: 'Johannesburg',
    budget: 5000,
    duration: '2 weeks',
    skillsRequired: ['JavaScript', 'React', 'TypeScript'],
    employerId: mockOwnerUserId,
    employerName: 'Test Employer',
    status: 'open',
    applicants: [],
    deadline: new Date('2025-12-31'),
    workType: 'remote',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('updateGig - Authorization', () => {
    describe('given userId is provided and user is the gig owner', () => {
      describe('when updating gig', () => {
        it('then allows update', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)
          jest.mocked(FirestoreService.update).mockResolvedValue()

          const updates = { title: 'Updated Title' }

          // When
          await GigService.updateGig(mockGigId, updates, mockOwnerUserId)

          // Then
          expect(FirestoreService.getById).toHaveBeenCalledWith('gigs', mockGigId)
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'gigs',
            mockGigId,
            expect.objectContaining({
              title: 'Updated Title',
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })

    describe('given userId is provided and user is NOT the gig owner', () => {
      describe('when updating gig', () => {
        it('then throws unauthorized error', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)

          const updates = { title: 'Malicious Update' }

          // When/Then
          await expect(
            GigService.updateGig(mockGigId, updates, mockOtherUserId)
          ).rejects.toThrow('Unauthorized: Only the gig owner can update this gig')

          // Should not call update
          expect(FirestoreService.update).not.toHaveBeenCalled()
        })
      })
    })

    describe('given userId is provided but gig does not exist', () => {
      describe('when updating gig', () => {
        it('then throws not found error', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(null)

          const updates = { title: 'Updated Title' }

          // When/Then
          await expect(
            GigService.updateGig(mockGigId, updates, mockOwnerUserId)
          ).rejects.toThrow('Gig not found')

          // Should not call update
          expect(FirestoreService.update).not.toHaveBeenCalled()
        })
      })
    })

    describe('given userId is NOT provided (system operation)', () => {
      describe('when updating gig', () => {
        it('then allows update without authorization check', async () => {
          // Given
          jest.mocked(FirestoreService.update).mockResolvedValue()

          const updates = { status: 'completed' as const }

          // When
          await GigService.updateGig(mockGigId, updates)

          // Then
          expect(FirestoreService.getById).not.toHaveBeenCalled() // No auth check
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'gigs',
            mockGigId,
            expect.objectContaining({
              status: 'completed',
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })

    describe('given userId is undefined (system operation)', () => {
      describe('when updating gig', () => {
        it('then allows update without authorization check', async () => {
          // Given
          jest.mocked(FirestoreService.update).mockResolvedValue()

          const updates = { status: 'reviewing' as const }

          // When
          await GigService.updateGig(mockGigId, updates, undefined)

          // Then
          expect(FirestoreService.getById).not.toHaveBeenCalled() // No auth check
          expect(FirestoreService.update).toHaveBeenCalled()
        })
      })
    })

    describe('given userId is provided and user attempts to change employerId', () => {
      describe('when updating gig', () => {
        it('then allows update (employerId in updates is ignored)', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)
          jest.mocked(FirestoreService.update).mockResolvedValue()

          const updates = {
            title: 'Updated Title',
            employerId: 'different-employer' // Attempting to change ownership
          }

          // When
          await GigService.updateGig(mockGigId, updates, mockOwnerUserId)

          // Then - authorization passes (checks original owner)
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'gigs',
            mockGigId,
            expect.objectContaining({
              title: 'Updated Title',
              employerId: 'different-employer', // Update includes it but auth checked original
              updatedAt: expect.any(Date),
            })
          )
        })
      })
    })
  })

  describe('deleteGig - Authorization', () => {
    describe('given userId is provided and user is the gig owner', () => {
      describe('when deleting gig', () => {
        it('then allows deletion', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)
          jest.mocked(FirestoreService.delete).mockResolvedValue()

          // When
          await GigService.deleteGig(mockGigId, mockOwnerUserId)

          // Then
          expect(FirestoreService.getById).toHaveBeenCalledWith('gigs', mockGigId)
          expect(FirestoreService.delete).toHaveBeenCalledWith('gigs', mockGigId)
        })
      })
    })

    describe('given userId is provided and user is NOT the gig owner', () => {
      describe('when deleting gig', () => {
        it('then throws unauthorized error', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockGig)

          // When/Then
          await expect(
            GigService.deleteGig(mockGigId, mockOtherUserId)
          ).rejects.toThrow('Unauthorized: Only the gig owner can delete this gig')

          // Should not call delete
          expect(FirestoreService.delete).not.toHaveBeenCalled()
        })
      })
    })

    describe('given userId is provided but gig does not exist', () => {
      describe('when deleting gig', () => {
        it('then throws not found error', async () => {
          // Given
          jest.mocked(FirestoreService.getById).mockResolvedValue(null)

          // When/Then
          await expect(
            GigService.deleteGig(mockGigId, mockOwnerUserId)
          ).rejects.toThrow('Gig not found')

          // Should not call delete
          expect(FirestoreService.delete).not.toHaveBeenCalled()
        })
      })
    })

    describe('given userId is NOT provided (system operation)', () => {
      describe('when deleting gig', () => {
        it('then allows deletion without authorization check', async () => {
          // Given
          jest.mocked(FirestoreService.delete).mockResolvedValue()

          // When
          await GigService.deleteGig(mockGigId)

          // Then
          expect(FirestoreService.getById).not.toHaveBeenCalled() // No auth check
          expect(FirestoreService.delete).toHaveBeenCalledWith('gigs', mockGigId)
        })
      })
    })

    describe('given userId is undefined (system operation)', () => {
      describe('when deleting gig', () => {
        it('then allows deletion without authorization check', async () => {
          // Given
          jest.mocked(FirestoreService.delete).mockResolvedValue()

          // When
          await GigService.deleteGig(mockGigId, undefined)

          // Then
          expect(FirestoreService.getById).not.toHaveBeenCalled() // No auth check
          expect(FirestoreService.delete).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Authorization - Edge Cases', () => {
    describe('given empty string userId', () => {
      describe('when updating gig', () => {
        it('then allows update (treated as no auth check)', async () => {
          // Given
          jest.mocked(FirestoreService.update).mockResolvedValue()

          const updates = { title: 'Updated Title' }

          // When
          await GigService.updateGig(mockGigId, updates, '')

          // Then - empty string is falsy, so no auth check
          expect(FirestoreService.getById).not.toHaveBeenCalled()
          expect(FirestoreService.update).toHaveBeenCalled()
        })
      })
    })

    describe('given gig with null employerId', () => {
      describe('when user attempts to update', () => {
        it('then throws unauthorized error', async () => {
          // Given
          const gigWithNullEmployer = { ...mockGig, employerId: null as any }
          jest.mocked(FirestoreService.getById).mockResolvedValue(gigWithNullEmployer)

          const updates = { title: 'Updated Title' }

          // When/Then
          await expect(
            GigService.updateGig(mockGigId, updates, mockOwnerUserId)
          ).rejects.toThrow('Unauthorized: Only the gig owner can update this gig')
        })
      })
    })

    describe('given gig with undefined employerId', () => {
      describe('when user attempts to update', () => {
        it('then throws unauthorized error', async () => {
          // Given
          const gigWithUndefinedEmployer = { ...mockGig, employerId: undefined as any }
          jest.mocked(FirestoreService.getById).mockResolvedValue(gigWithUndefinedEmployer)

          const updates = { title: 'Updated Title' }

          // When/Then
          await expect(
            GigService.updateGig(mockGigId, updates, mockOwnerUserId)
          ).rejects.toThrow('Unauthorized: Only the gig owner can update this gig')
        })
      })
    })
  })
})
