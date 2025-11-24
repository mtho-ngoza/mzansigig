import { ProfileService } from '@/lib/database/profileService'
import { User, PortfolioItem } from '@/types/auth'
import { getDoc, updateDoc } from 'firebase/firestore'

// Mock Firebase
jest.mock('firebase/firestore')
jest.mock('firebase/storage')

describe('ProfileService - Authorization', () => {
  const mockUserId = 'user-123'
  const mockOtherUserId = 'attacker-456'
  const mockPortfolioId = 'portfolio-789'

  const mockUser: User = {
    id: mockUserId,
    email: 'user@example.com',
    userType: 'job-seeker',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+27123456789',
    location: 'Johannesburg',
    portfolio: [
      {
        id: mockPortfolioId,
        title: 'Project 1',
        description: 'Description',
        category: 'technology',
        completedAt: new Date('2024-01-01'),
        technologies: ['React', 'TypeScript']
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('addPortfolioItem - Authorization', () => {
    const mockPortfolioData: Omit<PortfolioItem, 'id'> = {
      title: 'New Project',
      description: 'New project description',
      category: 'technology',
      completedAt: new Date('2024-02-01'),
      technologies: ['React', 'Node.js']
    }

    describe('given authenticatedUserId matches userId', () => {
      describe('when adding portfolio item', () => {
        it('then allows addition', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.addPortfolioItem(mockUserId, mockPortfolioData, mockUserId)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId does NOT match userId', () => {
      describe('when adding portfolio item', () => {
        it('then throws unauthorized error', async () => {
          // When/Then
          await expect(
            ProfileService.addPortfolioItem(mockUserId, mockPortfolioData, mockOtherUserId)
          ).rejects.toThrow('Unauthorized: You can only modify your own portfolio')

          // Should not call database operations
          expect(getDoc).not.toHaveBeenCalled()
          expect(updateDoc).not.toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is NOT provided (system operation)', () => {
      describe('when adding portfolio item', () => {
        it('then allows addition without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.addPortfolioItem(mockUserId, mockPortfolioData)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is undefined (system operation)', () => {
      describe('when adding portfolio item', () => {
        it('then allows addition without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.addPortfolioItem(mockUserId, mockPortfolioData, undefined)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given empty string authenticatedUserId', () => {
      describe('when adding portfolio item', () => {
        it('then allows addition (treated as no auth check)', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.addPortfolioItem(mockUserId, mockPortfolioData, '')

          // Then - empty string is falsy, so no auth check
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })
  })

  describe('updatePortfolioItem - Authorization', () => {
    const mockUpdates: Partial<PortfolioItem> = {
      title: 'Updated Project'
    }

    describe('given authenticatedUserId matches userId', () => {
      describe('when updating portfolio item', () => {
        it('then allows update', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.updatePortfolioItem(mockUserId, mockPortfolioId, mockUpdates, mockUserId)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId does NOT match userId', () => {
      describe('when updating portfolio item', () => {
        it('then throws unauthorized error', async () => {
          // When/Then
          await expect(
            ProfileService.updatePortfolioItem(mockUserId, mockPortfolioId, mockUpdates, mockOtherUserId)
          ).rejects.toThrow('Unauthorized: You can only modify your own portfolio')

          // Should not call database operations
          expect(getDoc).not.toHaveBeenCalled()
          expect(updateDoc).not.toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is NOT provided (system operation)', () => {
      describe('when updating portfolio item', () => {
        it('then allows update without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.updatePortfolioItem(mockUserId, mockPortfolioId, mockUpdates)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is undefined (system operation)', () => {
      describe('when updating portfolio item', () => {
        it('then allows update without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.updatePortfolioItem(mockUserId, mockPortfolioId, mockUpdates, undefined)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })
  })

  describe('deletePortfolioItem - Authorization', () => {
    describe('given authenticatedUserId matches userId', () => {
      describe('when deleting portfolio item', () => {
        it('then allows deletion', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.deletePortfolioItem(mockUserId, mockPortfolioId, mockUserId)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId does NOT match userId', () => {
      describe('when deleting portfolio item', () => {
        it('then throws unauthorized error', async () => {
          // When/Then
          await expect(
            ProfileService.deletePortfolioItem(mockUserId, mockPortfolioId, mockOtherUserId)
          ).rejects.toThrow('Unauthorized: You can only modify your own portfolio')

          // Should not call database operations
          expect(getDoc).not.toHaveBeenCalled()
          expect(updateDoc).not.toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is NOT provided (system operation)', () => {
      describe('when deleting portfolio item', () => {
        it('then allows deletion without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.deletePortfolioItem(mockUserId, mockPortfolioId)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })

    describe('given authenticatedUserId is undefined (system operation)', () => {
      describe('when deleting portfolio item', () => {
        it('then allows deletion without authorization check', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => true,
            data: () => mockUser
          })
          ;(updateDoc as jest.Mock).mockResolvedValue(undefined)

          // When
          await ProfileService.deletePortfolioItem(mockUserId, mockPortfolioId, undefined)

          // Then
          expect(getDoc).toHaveBeenCalled()
          expect(updateDoc).toHaveBeenCalled()
        })
      })
    })
  })

  describe('Authorization - Edge Cases', () => {
    describe('given user attempts to add portfolio to non-existent user', () => {
      describe('when adding portfolio item', () => {
        it('then throws user not found error', async () => {
          // Given
          ;(getDoc as jest.Mock).mockResolvedValue({
            exists: () => false
          })

          const mockPortfolioData: Omit<PortfolioItem, 'id'> = {
            title: 'New Project',
            description: 'Description',
            category: 'technology',
            completedAt: new Date('2024-01-01'),
            technologies: ['React']
          }

          // When/Then
          await expect(
            ProfileService.addPortfolioItem(mockUserId, mockPortfolioData, mockUserId)
          ).rejects.toThrow('User not found')
        })
      })
    })

    describe('given attacker attempts cross-user portfolio manipulation', () => {
      describe('when attempting to update victim portfolio', () => {
        it('then blocks unauthorized access immediately', async () => {
          // Given
          const victimUserId = 'victim-999'
          const attackerUserId = 'attacker-666'

          // When/Then - Should fail BEFORE database access
          await expect(
            ProfileService.updatePortfolioItem(victimUserId, mockPortfolioId, { title: 'Hacked' }, attackerUserId)
          ).rejects.toThrow('Unauthorized: You can only modify your own portfolio')

          // Critical: No database queries should be made
          expect(getDoc).not.toHaveBeenCalled()
        })
      })

      describe('when attempting to delete victim portfolio item', () => {
        it('then blocks unauthorized access immediately', async () => {
          // Given
          const victimUserId = 'victim-999'
          const attackerUserId = 'attacker-666'

          // When/Then - Should fail BEFORE database access
          await expect(
            ProfileService.deletePortfolioItem(victimUserId, mockPortfolioId, attackerUserId)
          ).rejects.toThrow('Unauthorized: You can only modify your own portfolio')

          // Critical: No database queries should be made
          expect(getDoc).not.toHaveBeenCalled()
        })
      })
    })
  })
})
