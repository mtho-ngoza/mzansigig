import { MessagingService } from '@/lib/database/messagingService'
import { FirestoreService } from '@/lib/database/firestore'
import { Conversation } from '@/types/messaging'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')

describe('MessagingService - Authorization', () => {
  const mockUser1Id = 'user-123'
  const mockUser2Id = 'user-456'
  const mockAttackerId = 'attacker-789'
  const mockConversationId = 'conversation-abc'

  const mockConversation: Conversation = {
    id: mockConversationId,
    participants: [
      {
        userId: mockUser1Id,
        userName: 'User One',
        userType: 'job-seeker',
        joinedAt: new Date()
      },
      {
        userId: mockUser2Id,
        userName: 'User Two',
        userType: 'employer',
        joinedAt: new Date()
      }
    ],
    participantIds: [mockUser1Id, mockUser2Id],
    lastMessageAt: new Date(),
    unreadCount: {
      [mockUser1Id]: 0,
      [mockUser2Id]: 0
    },
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getConversationById - Authorization', () => {
    describe('given authenticatedUserId is a participant', () => {
      describe('when getting conversation', () => {
        it('then allows access for user 1', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When
          const result = await MessagingService.getConversationById(mockConversationId, mockUser1Id)

          // Then
          expect(result).toEqual(mockConversation)
          expect(FirestoreService.getById).toHaveBeenCalledWith('conversations', mockConversationId)
        })

        it('then allows access for user 2', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When
          const result = await MessagingService.getConversationById(mockConversationId, mockUser2Id)

          // Then
          expect(result).toEqual(mockConversation)
          expect(FirestoreService.getById).toHaveBeenCalledWith('conversations', mockConversationId)
        })
      })
    })

    describe('given authenticatedUserId is NOT a participant', () => {
      describe('when getting conversation', () => {
        it('then throws unauthorized error', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When/Then
          await expect(
            MessagingService.getConversationById(mockConversationId, mockAttackerId)
          ).rejects.toThrow('Unauthorized: You are not a participant in this conversation')
        })
      })
    })

    describe('given authenticatedUserId is NOT provided (system operation)', () => {
      describe('when getting conversation', () => {
        it('then allows access without authorization check', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When
          const result = await MessagingService.getConversationById(mockConversationId)

          // Then
          expect(result).toEqual(mockConversation)
          expect(FirestoreService.getById).toHaveBeenCalledWith('conversations', mockConversationId)
        })
      })
    })

    describe('given authenticatedUserId is undefined (system operation)', () => {
      describe('when getting conversation', () => {
        it('then allows access without authorization check', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When
          const result = await MessagingService.getConversationById(mockConversationId, undefined)

          // Then
          expect(result).toEqual(mockConversation)
        })
      })
    })

    describe('given empty string authenticatedUserId', () => {
      describe('when getting conversation', () => {
        it('then allows access (treated as no auth check)', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When
          const result = await MessagingService.getConversationById(mockConversationId, '')

          // Then - empty string is falsy, so no auth check
          expect(result).toEqual(mockConversation)
        })
      })
    })

    describe('given conversation does not exist', () => {
      describe('when getting conversation', () => {
        it('then returns null', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(null)

          // When
          const result = await MessagingService.getConversationById(mockConversationId, mockUser1Id)

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given conversation exists but no participantIds', () => {
      describe('when getting conversation', () => {
        it('then throws unauthorized error for any authenticated user', async () => {
          // Given
          const conversationWithoutParticipantIds = {
            ...mockConversation,
            participantIds: []
          }
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(conversationWithoutParticipantIds)

          // When/Then
          await expect(
            MessagingService.getConversationById(mockConversationId, mockUser1Id)
          ).rejects.toThrow('Unauthorized: You are not a participant in this conversation')
        })
      })
    })
  })

  describe('Authorization - Edge Cases', () => {
    describe('given attacker attempts to access private conversation', () => {
      describe('when requesting conversation by ID', () => {
        it('then blocks access immediately with unauthorized error', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When/Then
          await expect(
            MessagingService.getConversationById(mockConversationId, mockAttackerId)
          ).rejects.toThrow('Unauthorized: You are not a participant in this conversation')
        })
      })
    })

    describe('given attacker guesses conversation ID', () => {
      describe('when attempting to access conversation', () => {
        it('then denies access even if conversation exists', async () => {
          // Given
          const randomConversationId = 'random-conversation-999'
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(mockConversation)

          // When/Then
          await expect(
            MessagingService.getConversationById(randomConversationId, mockAttackerId)
          ).rejects.toThrow('Unauthorized: You are not a participant in this conversation')

          // Firestore call is made but authorization check blocks access
          expect(FirestoreService.getById).toHaveBeenCalledWith('conversations', randomConversationId)
        })
      })
    })

    describe('given conversation with null participantIds', () => {
      describe('when attempting to access', () => {
        it('then throws error due to null check failure', async () => {
          // Given
          const conversationWithNullParticipantIds = {
            ...mockConversation,
            participantIds: null as any
          }
          ;(FirestoreService.getById as jest.Mock).mockResolvedValue(conversationWithNullParticipantIds)

          // When/Then
          await expect(
            MessagingService.getConversationById(mockConversationId, mockUser1Id)
          ).rejects.toThrow()
        })
      })
    })

    describe('given Firestore permission error', () => {
      describe('when getting conversation', () => {
        it('then returns null (expected behavior)', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockRejectedValue(
            new Error('Missing or insufficient permissions')
          )

          // When
          const result = await MessagingService.getConversationById(mockConversationId, mockUser1Id)

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given conversation not found error', () => {
      describe('when getting conversation', () => {
        it('then returns null (expected behavior)', async () => {
          // Given
          ;(FirestoreService.getById as jest.Mock).mockRejectedValue(
            new Error('Conversation not found')
          )

          // When
          const result = await MessagingService.getConversationById(mockConversationId, mockUser1Id)

          // Then
          expect(result).toBeNull()
        })
      })
    })
  })
})
