import { MessagingService } from '@/lib/database/messagingService'
import { FirestoreService } from '@/lib/database/firestore'
import { Conversation, Message, ConversationParticipant } from '@/types/messaging'

// Mock FirestoreService
jest.mock('@/lib/database/firestore')

describe('MessagingService', () => {
  const mockUserId1 = 'user-1'
  const mockUserId2 = 'user-2'
  const mockConversationId = 'conversation-123'
  const mockMessageId = 'message-456'

  const mockParticipant1: Omit<ConversationParticipant, 'joinedAt'> = {
    userId: mockUserId1,
    userName: 'User One',
    userType: 'job-seeker',
  }

  const mockParticipant2: Omit<ConversationParticipant, 'joinedAt'> = {
    userId: mockUserId2,
    userName: 'User Two',
    userType: 'employer',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createConversation', () => {
    describe('given valid participants without gig context', () => {
      describe('when creating a conversation', () => {
        it('then creates conversation with correct structure', async () => {
          // Given
          const participants = [mockParticipant1, mockParticipant2]
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          const conversationId = await MessagingService.createConversation(participants)

          // Then
          expect(conversationId).toBe(mockConversationId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              participants: expect.arrayContaining([
                expect.objectContaining({
                  ...mockParticipant1,
                  joinedAt: expect.any(Date),
                }),
                expect.objectContaining({
                  ...mockParticipant2,
                  joinedAt: expect.any(Date),
                }),
              ]),
              gigId: null,
              gigTitle: null,
              lastMessageAt: expect.any(Date),
              status: 'active',
              createdAt: expect.any(Date),
              unreadCount: {
                [mockUserId1]: 0,
                [mockUserId2]: 0,
              },
            })
          )
        })
      })
    })

    describe('given valid participants with gig context', () => {
      describe('when creating a conversation', () => {
        it('then creates conversation with gig information', async () => {
          // Given
          const participants = [mockParticipant1, mockParticipant2]
          const gigId = 'gig-789'
          const gigTitle = 'Web Development Project'
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          const conversationId = await MessagingService.createConversation(
            participants,
            gigId,
            gigTitle
          )

          // Then
          expect(conversationId).toBe(mockConversationId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              gigId,
              gigTitle,
            })
          )
        })
      })
    })

    describe('given Firestore error', () => {
      describe('when creating conversation', () => {
        it('then throws error with message', async () => {
          // Given
          const participants = [mockParticipant1, mockParticipant2]
          const errorMessage = 'Firestore connection failed'
          jest.mocked(FirestoreService.create).mockRejectedValue(new Error(errorMessage))

          // When & Then
          await expect(
            MessagingService.createConversation(participants)
          ).rejects.toThrow(`Error creating conversation: ${errorMessage}`)
        })
      })
    })

    describe('given participants with unread count initialization', () => {
      describe('when creating conversation', () => {
        it('then initializes unread count to zero for all participants', async () => {
          // Given
          const participants = [mockParticipant1, mockParticipant2]
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          await MessagingService.createConversation(participants)

          // Then
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              unreadCount: {
                [mockUserId1]: 0,
                [mockUserId2]: 0,
              },
            })
          )
        })
      })
    })
  })

  describe('getConversationBetweenUsers', () => {
    const mockConversation: Conversation = {
      id: mockConversationId,
      participants: [
        { ...mockParticipant1, joinedAt: new Date() },
        { ...mockParticipant2, joinedAt: new Date() },
      ],
      gigId: undefined,
      gigTitle: undefined,
      lastMessageAt: new Date(),
      unreadCount: { [mockUserId1]: 0, [mockUserId2]: 0 },
      status: 'active',
      createdAt: new Date(),
    }

    describe('given existing conversation between users', () => {
      describe('when getting conversation', () => {
        it('then returns the conversation', async () => {
          // Given
          jest.mocked(FirestoreService.getAll).mockResolvedValue([mockConversation])

          // When
          const result = await MessagingService.getConversationBetweenUsers(
            mockUserId1,
            mockUserId2
          )

          // Then
          expect(result).toEqual(mockConversation)
        })
      })
    })

    describe('given no existing conversation', () => {
      describe('when getting conversation', () => {
        it('then returns null', async () => {
          // Given
          jest.mocked(FirestoreService.getAll).mockResolvedValue([])

          // When
          const result = await MessagingService.getConversationBetweenUsers(
            mockUserId1,
            mockUserId2
          )

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given conversation with specific gig', () => {
      describe('when getting conversation with gig filter', () => {
        it('then returns conversation only if gig matches', async () => {
          // Given
          const gigId = 'gig-789'
          const conversationWithGig = { ...mockConversation, gigId }
          jest.mocked(FirestoreService.getAll).mockResolvedValue([conversationWithGig])

          // When
          const result = await MessagingService.getConversationBetweenUsers(
            mockUserId1,
            mockUserId2,
            gigId
          )

          // Then
          expect(result).toEqual(conversationWithGig)
        })
      })
    })

    describe('given conversation without matching gig', () => {
      describe('when getting conversation with gig filter', () => {
        it('then returns null', async () => {
          // Given
          const conversationWithDifferentGig = { ...mockConversation, gigId: 'other-gig' }
          jest.mocked(FirestoreService.getAll).mockResolvedValue([
            conversationWithDifferentGig,
          ])

          // When
          const result = await MessagingService.getConversationBetweenUsers(
            mockUserId1,
            mockUserId2,
            'gig-789'
          )

          // Then
          expect(result).toBeNull()
        })
      })
    })

    describe('given multiple conversations', () => {
      describe('when getting conversation', () => {
        it('then returns the first matching conversation', async () => {
          // Given
          const conversation2 = { ...mockConversation, id: 'conv-2', gigId: 'gig-abc' }
          jest.mocked(FirestoreService.getAll).mockResolvedValue([
            mockConversation,
            conversation2,
          ])

          // When
          const result = await MessagingService.getConversationBetweenUsers(
            mockUserId1,
            mockUserId2
          )

          // Then
          expect(result?.id).toBe(mockConversationId)
        })
      })
    })
  })

  describe('getOrCreateConversation', () => {
    describe('given existing conversation', () => {
      describe('when getting or creating conversation', () => {
        it('then returns existing conversation ID', async () => {
          // Given
          const existingConversation: Conversation = {
            id: mockConversationId,
            participants: [
              { ...mockParticipant1, joinedAt: new Date() },
              { ...mockParticipant2, joinedAt: new Date() },
            ],
            gigId: undefined,
            gigTitle: undefined,
            lastMessageAt: new Date(),
            unreadCount: { [mockUserId1]: 0, [mockUserId2]: 0 },
            status: 'active',
            createdAt: new Date(),
          }
          jest.mocked(FirestoreService.getAll).mockResolvedValue([existingConversation])

          // When
          const conversationId = await MessagingService.getOrCreateConversation(
            mockUserId1,
            mockUserId2,
            'User Two',
            'employer'
          )

          // Then
          expect(conversationId).toBe(mockConversationId)
          expect(FirestoreService.create).not.toHaveBeenCalled()
        })
      })
    })

    describe('given no existing conversation', () => {
      describe('when getting or creating conversation', () => {
        it('then creates new conversation and returns ID', async () => {
          // Given
          jest.mocked(FirestoreService.getAll).mockResolvedValue([])
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          const conversationId = await MessagingService.getOrCreateConversation(
            mockUserId1,
            mockUserId2,
            'User Two',
            'employer',
            undefined,
            undefined,
            'User One',
            'job-seeker'
          )

          // Then
          expect(conversationId).toBe(mockConversationId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              participants: expect.arrayContaining([
                expect.objectContaining({
                  userId: mockUserId1,
                  userName: 'User One',
                  userType: 'job-seeker',
                }),
                expect.objectContaining({
                  userId: mockUserId2,
                  userName: 'User Two',
                  userType: 'employer',
                }),
              ]),
            })
          )
        })
      })
    })

    describe('given gig context for new conversation', () => {
      describe('when creating conversation', () => {
        it('then includes gig information', async () => {
          // Given
          const gigId = 'gig-789'
          const gigTitle = 'Web Development Project'
          jest.mocked(FirestoreService.getAll).mockResolvedValue([])
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          await MessagingService.getOrCreateConversation(
            mockUserId1,
            mockUserId2,
            'User Two',
            'employer',
            gigId,
            gigTitle,
            'User One',
            'job-seeker'
          )

          // Then
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              gigId,
              gigTitle,
            })
          )
        })
      })
    })

    describe('given user names not provided', () => {
      describe('when creating conversation', () => {
        it('then uses default name for current user', async () => {
          // Given
          jest.mocked(FirestoreService.getAll).mockResolvedValue([])
          jest.mocked(FirestoreService.create).mockResolvedValue(mockConversationId)

          // When
          await MessagingService.getOrCreateConversation(
            mockUserId1,
            mockUserId2,
            'User Two',
            'employer'
          )

          // Then
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'conversations',
            expect.objectContaining({
              participants: expect.arrayContaining([
                expect.objectContaining({
                  userId: mockUserId1,
                  userName: 'You',
                }),
              ]),
            })
          )
        })
      })
    })
  })

  describe('sendMessage', () => {
    const mockConversation: Conversation = {
      id: mockConversationId,
      participants: [
        { ...mockParticipant1, joinedAt: new Date() },
        { ...mockParticipant2, joinedAt: new Date() },
      ],
      gigId: undefined,
      gigTitle: undefined,
      lastMessageAt: new Date(),
      unreadCount: { [mockUserId1]: 0, [mockUserId2]: 0 },
      status: 'active',
      createdAt: new Date(),
    }

    describe('given valid message data', () => {
      describe('when sending a message', () => {
        it('then creates message and updates conversation', async () => {
          // Given
          const messageInput = {
            content: 'Hello, how are you?',
            type: 'text' as const,
          }
          jest.mocked(FirestoreService.create).mockResolvedValue(mockMessageId)
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockConversation)
          jest.mocked(FirestoreService.update).mockResolvedValue()

          // When
          const messageId = await MessagingService.sendMessage(
            mockConversationId,
            mockUserId1,
            'User One',
            'job-seeker',
            messageInput
          )

          // Then
          expect(messageId).toBe(mockMessageId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'messages',
            expect.objectContaining({
              conversationId: mockConversationId,
              senderId: mockUserId1,
              senderName: 'User One',
              senderType: 'job-seeker',
              content: 'Hello, how are you?',
              type: 'text',
              isRead: false,
              createdAt: expect.any(Date),
            })
          )
          expect(FirestoreService.update).toHaveBeenCalledWith(
            'conversations',
            mockConversationId,
            expect.objectContaining({
              lastMessageAt: expect.any(Date),
              unreadCount: {
                [mockUserId1]: 0,
                [mockUserId2]: 1,
              },
            })
          )
        })
      })
    })

    describe('given message with file data', () => {
      describe('when sending message', () => {
        it('then includes file metadata in message', async () => {
          // Given
          const messageInput = {
            content: 'Check out this file',
            type: 'file' as const,
            fileData: {
              fileName: 'document.pdf',
              fileSize: 1024000,
              fileUrl: 'https://example.com/document.pdf',
            },
          }
          jest.mocked(FirestoreService.create).mockResolvedValue(mockMessageId)
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockConversation)
          jest.mocked(FirestoreService.update).mockResolvedValue()

          // When
          await MessagingService.sendMessage(
            mockConversationId,
            mockUserId1,
            'User One',
            'job-seeker',
            messageInput
          )

          // Then
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'messages',
            expect.objectContaining({
              metadata: {
                fileName: 'document.pdf',
                fileSize: 1024000,
                fileUrl: 'https://example.com/document.pdf',
              },
            })
          )
        })
      })
    })
  })

  describe('sendSystemMessage', () => {
    const mockConversation: Conversation = {
      id: mockConversationId,
      participants: [
        { ...mockParticipant1, joinedAt: new Date() },
        { ...mockParticipant2, joinedAt: new Date() },
      ],
      gigId: undefined,
      gigTitle: undefined,
      lastMessageAt: new Date(),
      unreadCount: { [mockUserId1]: 0, [mockUserId2]: 0 },
      status: 'active',
      createdAt: new Date(),
    }

    describe('given system message data', () => {
      describe('when sending system message', () => {
        it('then creates message with system sender and updates conversation', async () => {
          // Given
          const content = 'Application accepted for this gig'
          const type = 'application-update' as const
          jest.mocked(FirestoreService.create).mockResolvedValue(mockMessageId)
          jest.mocked(FirestoreService.getById).mockResolvedValue(mockConversation)
          jest.mocked(FirestoreService.update).mockResolvedValue()

          // When
          const messageId = await MessagingService.sendSystemMessage(
            mockConversationId,
            content,
            type
          )

          // Then
          expect(messageId).toBe(mockMessageId)
          expect(FirestoreService.create).toHaveBeenCalledWith(
            'messages',
            expect.objectContaining({
              conversationId: mockConversationId,
              senderId: 'system',
              senderName: 'System',
              content,
              type,
              isRead: false,
            })
          )
        })
      })
    })
  })
})
